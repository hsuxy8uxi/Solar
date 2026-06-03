(async () => {
  const PATCH_MARK = "__CML_SONG_MAKER_MODDED__";
  const APP_MARK = "__CML_SONG_MAKER_INTERNALS__";

  const waitFor = (test, timeout = 10000) =>
    new Promise((resolve, reject) => {
      const start = performance.now();
      const tick = () => {
        if (test()) return resolve(test());
        if (performance.now() - start > timeout) return reject(new Error("Timed out waiting for Song Maker"));
        requestAnimationFrame(tick);
      };
      tick();
    });

  async function exposeInternals() {
    const res = await fetch("build/Main.js", { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not fetch Song Maker bundle: ${res.status}`);
    const js = await res.text();
    const needle = "var sc=new Gs.a(Zs,Vs);";
    if (!js.includes(needle)) throw new Error("Song Maker bundle shape changed; expose patch did not match.");

    document.body.innerHTML = '<div id="incompatible" style="display:none"></div>';
    const patched = js.replace(
      needle,
      `${needle}window.${APP_MARK}={options:Zs,midi:Vs,player:qs,grid:Xs,keyboard:Ks,settings:rc,bottom:oc,save:sc,apply:ec,changed:tc,Transport:pe,Part:ie,toSeconds:S,context:ge};`
    );

    const realInnerWidth = window.innerWidth;
    const realOuterWidth = window.outerWidth;
    const oldInnerWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
    const oldOuterWidth = Object.getOwnPropertyDescriptor(window, "outerWidth");
    try {
      Object.defineProperty(window, "innerWidth", { configurable: true, get: () => Math.max(1200, realInnerWidth || 0) });
      Object.defineProperty(window, "outerWidth", { configurable: true, get: () => Math.max(1200, realOuterWidth || 0) });
      (0, eval)(patched);
    } finally {
      if (oldInnerWidth) Object.defineProperty(window, "innerWidth", oldInnerWidth);
      else delete window.innerWidth;
      if (oldOuterWidth) Object.defineProperty(window, "outerWidth", oldOuterWidth);
      else delete window.outerWidth;
    }
    return waitFor(() => window[APP_MARK]);
  }

  const sm = await exposeInternals();
  localStorage.removeItem("cml-song-maker-mod-dark-mode");
  const state = {
    heldMode: false,
    baseRootNote: sm.options.rootNote,
    baseOctaves: sm.options.octaves,
    activeTrackId: "track-1",
    tracks: [{ id: "track-1", name: "Track 1", color: "#16a8f0", muted: false, instrument: "songmaker" }],
    overlayNotes: [],
    enhancedDrums: [],
    enhancedDrumNodes: [],
    audioClips: [],
    customInstruments: [],
    audioNodes: [],
    selectedAudioClipId: null,
    drumTrackMuted: false,
    globalInstrumentId: "songmaker",
    cleanMode: false,
    allTrackMode: false,
    allTracksInLow: true,
    lowGraphics: false,
    extraLowGraphics: false,
    lowBeforeExtraLow: false,
    darkMode: false,
    undoStack: [],
    redoStack: [],
    restoring: false,
  };
  const trackColors = ["#16a8f0", "#f4a806", "#22c55e", "#ef4444", "#a855f7", "#14b8a6", "#f97316", "#e11d48"];
  const drumTypes = ["kick", "snare", "clap", "rim", "hat", "openhat", "tom", "cymbal", "perc"];
  const drumColors = {
    kick: "#ff3b30",
    snare: "#ff9500",
    clap: "#ffcc00",
    rim: "#34c759",
    hat: "#00c7be",
    openhat: "#32ade6",
    tom: "#007aff",
    cymbal: "#af52de",
    perc: "#ff2d55",
  };
  const globalInstruments = [
    { id: "songmaker", name: "Song Maker" },
  ];

  function hexToRgb(hex) {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return match ? [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)] : [255, 255, 255];
  }

  function rgba(hex, alpha) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function holdDurationSubBeats() {
    return Math.max(1, Math.round(numberValue("cml-hold-beats", 2) * sm.options.subdivision));
  }

  function forEachInstrumentEvent(fn) {
    sm.midi.instrument.forEach((event) => fn(event));
  }

  function forEachOverlayNote(fn) {
    state.overlayNotes.forEach((event) => fn(event));
  }

  function forEachPercussionEvent(fn) {
    sm.midi.percussion.forEach((event) => fn(event));
  }

  function serializeSong() {
    const instrument = [];
    const percussion = [];
    forEachInstrumentEvent((event) => {
      instrument.push({
        time: event.time,
        note: event.note,
        duration: Math.max(1, Number(event.duration) || 1),
        track: event.__cmlTrack || "track-1",
      });
    });
    forEachPercussionEvent((event) => {
      percussion.push({
        time: event.time,
        note: event.note,
        duration: Math.max(1, Number(event.duration) || 1),
      });
    });
    return {
      version: 3,
      savedAt: new Date().toISOString(),
      options: sm.options.toJSON(),
      tracks: state.tracks.map((track) => ({ ...track })),
      overlayNotes: state.overlayNotes.map((event) => ({ ...event })),
      activeTrackId: state.activeTrackId,
      selectedAudioClipId: state.selectedAudioClipId,
      drumTrackMuted: state.drumTrackMuted,
      globalInstrumentId: state.globalInstrumentId || "songmaker",
      enhancedDrums: state.enhancedDrums.map((event) => ({ ...event })),
      audioClips: state.audioClips.map((clip) => ({ ...clip, buffer: undefined })),
      customInstruments: state.customInstruments.map((instrument) => ({ ...instrument, buffer: undefined })),
      midi: { instrument, percussion },
    };
  }

  function snapshotKey(snapshot) {
    return JSON.stringify({
      options: snapshot.options,
      tracks: snapshot.tracks,
      overlayNotes: snapshot.overlayNotes,
      activeTrackId: snapshot.activeTrackId,
      selectedAudioClipId: snapshot.selectedAudioClipId,
      drumTrackMuted: snapshot.drumTrackMuted,
      globalInstrumentId: snapshot.globalInstrumentId,
      enhancedDrums: snapshot.enhancedDrums,
      audioClips: snapshot.audioClips,
      customInstruments: snapshot.customInstruments,
      midi: snapshot.midi,
    });
  }

  function applySongSnapshot(snapshot, pushUndo = false) {
    if (!snapshot || !snapshot.options || !snapshot.midi) throw new Error("That JSON does not look like a Song Maker mod save.");
    state.restoring = true;
    try {
      sm.options.fromJSON(normalizePitchOptions(snapshot.options));
      state.tracks = (snapshot.tracks && snapshot.tracks.length ? snapshot.tracks : [emptyTrack()]).map((track, index) => ({
        id: track.id || `track-${index + 1}`,
        name: track.name || `Track ${index + 1}`,
        color: track.color || trackColors[index % trackColors.length],
        muted: !!track.muted,
        instrument: track.instrument || track.globalInstrumentId || "songmaker",
        globalInstrumentId: track.globalInstrumentId || track.instrument || "songmaker",
        customInstrumentId: track.customInstrumentId || null,
      }));
      state.activeTrackId = snapshot.activeTrackId || state.tracks[0].id;
      state.selectedAudioClipId = snapshot.selectedAudioClipId || null;
      state.globalInstrumentId = snapshot.globalInstrumentId || "songmaker";
      if (state.activeTrackId !== "__drums" && !state.tracks.some((track) => track.id === state.activeTrackId)) {
        state.activeTrackId = state.tracks[0].id;
      }
      state.drumTrackMuted = !!snapshot.drumTrackMuted;
      state.overlayNotes = Array.isArray(snapshot.overlayNotes) ? snapshot.overlayNotes.map((event) => ({ ...event, __cmlOverlay: true })) : [];
      state.enhancedDrums = Array.isArray(snapshot.enhancedDrums) ? snapshot.enhancedDrums.map((event) => ({ ...event })) : [];
      state.audioClips = Array.isArray(snapshot.audioClips) ? snapshot.audioClips.map((clip) => ({ ...clip })) : [];
      state.customInstruments = Array.isArray(snapshot.customInstruments) ? snapshot.customInstruments.map((instrument) => ({ ...instrument })) : [];
      decodeStoredAudioAssets();

      sm.midi.instrument.clear();
      sm.midi.percussion.clear();
      (snapshot.midi.instrument || []).forEach((note) => {
        const event = sm.midi.instrument.add(note.time, note.note, Math.max(1, Number(note.duration) || 1), false);
        if (event) event.__cmlTrack = note.track || "track-1";
      });
      (snapshot.midi.percussion || []).forEach((note) => {
        sm.midi.percussion.add(note.time, note.note, Math.max(1, Number(note.duration) || 1), false);
      });

      if (sm.grid.resetInstruments) sm.grid.resetInstruments();
      if (sm.grid.resize) sm.grid.resize();
      const barsInput = document.getElementById("cml-bars");
      const upperInput = document.getElementById("cml-upper-octaves");
      const lowerInput = document.getElementById("cml-lower-octaves");
      const subdivisionInput = document.getElementById("cml-subdivision");
      if (barsInput) barsInput.value = sm.options.bars;
      if (upperInput) upperInput.value = sm.options.octaves;
      if (lowerInput) lowerInput.value = 0;
      if (subdivisionInput) subdivisionInput.value = sm.options.subdivision;
      sm.player.syncWithMidiTrack();
      if (sm.player.percussionTrack) sm.player.percussionTrack.syncWithMidiTrack();
      rebuildEnhancedDrumPart();
      rebuildOverlayNotePart();
      refreshInstrumentGrid();
      refreshPercussionGrid();
      renderTracks();
      window.dispatchEvent(new Event("resize"));
    } finally {
      state.restoring = false;
    }
    if (pushUndo) pushUndoSnapshot();
  }

  function pushUndoSnapshot() {
    if (state.restoring) return;
    const snapshot = serializeSong();
    const key = snapshotKey(snapshot);
    const last = state.undoStack[state.undoStack.length - 1];
    if (last && last.key === key) return;
    state.undoStack.push({ key, snapshot });
    if (state.undoStack.length > 60) state.undoStack.shift();
    state.redoStack = [];
  }

  function undoModChange() {
    if (state.undoStack.length < 2) return "Nothing to undo.";
    const current = state.undoStack.pop();
    state.redoStack.push(current);
    const previous = state.undoStack[state.undoStack.length - 1];
    applySongSnapshot(previous.snapshot, false);
    return "Undo.";
  }

  function redoModChange() {
    const next = state.redoStack.pop();
    if (!next) return "Nothing to redo.";
    state.undoStack.push(next);
    applySongSnapshot(next.snapshot, false);
    return "Redo.";
  }

  function downloadText(filename, text, type = "application/json") {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    const snapshot = serializeSong();
    downloadText(`song-maker-mod-${Date.now()}.json`, JSON.stringify(snapshot, null, 2));
    localStorage.setItem("cml-song-maker-mod-autosave", JSON.stringify(snapshot));
    return "Exported JSON backup.";
  }

  function importJsonFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const status = document.getElementById("cml-mod-status");
      try {
        const snapshot = JSON.parse(String(reader.result || ""));
        applySongSnapshot(snapshot, true);
        sm.changed();
        if (status) status.textContent = "Imported JSON backup.";
      } catch (err) {
        if (status) status.textContent = err.message || String(err);
        console.error(err);
      }
    };
    reader.readAsText(file);
  }

  function ensureEventTracks() {
    state.tracks.forEach((track) => {
      if (!track.instrument) track.instrument = "songmaker";
      if (!track.globalInstrumentId) track.globalInstrumentId = track.instrument || "songmaker";
      if (track.customInstrumentId === undefined) track.customInstrumentId = null;
    });
    forEachInstrumentEvent((event) => {
      if (!event.__cmlTrack) event.__cmlTrack = state.activeTrackId || "track-1";
    });
  }

  function trackInstrumentName(track) {
    if (!track) return "";
    if (track.customInstrumentId) {
      const custom = state.customInstruments.find((item) => item.id === track.customInstrumentId);
      return custom ? `Custom: ${custom.name}` : "Custom";
    }
    const preset = globalInstruments.find((item) => item.id === (track.globalInstrumentId || track.instrument || "songmaker"));
    return preset ? preset.name : "Song Maker";
  }

  function cycleTrackInstrument(track) {
    if (!track) return;
    const ids = globalInstruments.map((item) => item.id);
    const current = track.customInstrumentId ? "songmaker" : (track.globalInstrumentId || track.instrument || "songmaker");
    const index = Math.max(0, ids.indexOf(current));
    const next = ids[(index + 1) % ids.length];
    track.customInstrumentId = null;
    track.globalInstrumentId = next;
    track.instrument = next;
    sm.player.syncWithMidiTrack();
    sm.changed();
    renderTracks();
    const status = document.getElementById("cml-mod-status");
    if (status) status.textContent = `${track.name} instrument: ${trackInstrumentName(track)}.`;
  }

  function cycleGlobalInstrument() {
    const current = state.globalInstrumentId || "songmaker";
    const customOptions = state.customInstruments.map((item) => `custom:${item.id}`);
    const ids = [...globalInstruments.map((item) => item.id), ...customOptions];
    const index = Math.max(0, ids.indexOf(current));
    const next = ids[(index + 1) % ids.length];
    state.globalInstrumentId = next;
    state.tracks.forEach((track) => {
      if (next.startsWith("custom:")) {
        track.customInstrumentId = next.slice(7);
        track.globalInstrumentId = "songmaker";
        track.instrument = "songmaker";
      } else {
        track.customInstrumentId = null;
        track.globalInstrumentId = next;
        track.instrument = next;
      }
    });
    sm.player.syncWithMidiTrack();
    sm.changed();
    renderTracks();
    updateGlobalInstrumentButton();
    const status = document.getElementById("cml-mod-status");
    if (status) status.textContent = `All tracks now use ${globalInstrumentLabel(next)}.`;
  }

  function globalInstrumentLabel(id) {
    if (String(id || "").startsWith("custom:")) {
      const custom = state.customInstruments.find((item) => item.id === String(id).slice(7));
      return custom ? custom.name : "Custom";
    }
    const preset = globalInstruments.find((item) => item.id === (id || "songmaker"));
    return preset ? preset.name : "Song Maker";
  }

  function updateGlobalInstrumentButton() {
    const button = document.getElementById("cml-global-inst");
    if (!button) return;
    button.textContent = `Global Inst: ${globalInstrumentLabel(state.globalInstrumentId || "songmaker")}`;
  }

  function currentTrack() {
    return state.tracks.find((track) => track.id === state.activeTrackId) || state.tracks[0];
  }

  function isMutedEvent(event) {
    const track = state.tracks.find((item) => item.id === (event.__cmlTrack || "track-1"));
    return !!(track && track.muted);
  }

  function isActiveEvent(event) {
    return (event.__cmlTrack || "track-1") === (currentTrack() && currentTrack().id);
  }

  function clampGridRow(grid, row) {
    return Math.max(0, Math.min(grid.notes.rows - 1, Math.round(row)));
  }

  function safePitchForPoint(grid, point) {
    return grid.indexToPitch(clampGridRow(grid, point.y));
  }

  function rowForNote(grid, note) {
    for (let i = 0; i < grid.notes.rows; i++) {
      try {
        if (grid.indexToPitch(i) === note) return i;
      } catch (_) {}
    }
    return null;
  }

  function eventCovering(time, note, activeOnly = false) {
    let found = null;
    forEachInstrumentEvent((event) => {
      const duration = Math.max(1, Number(event.duration) || 1);
      if ((!activeOnly || isActiveEvent(event)) && event.note === note && time >= event.time && time < event.time + duration) found = event;
    });
    forEachOverlayNote((event) => {
      const duration = Math.max(1, Number(event.duration) || 1);
      if ((!activeOnly || isActiveEvent(event)) && event.note === note && time >= event.time && time < event.time + duration) found = event;
    });
    return found;
  }

  function paintHeldVisuals(activeOnly = true) {
    if (state.lowGraphics) return;
    const grid = sm.grid.instrument;
    forEachInstrumentEvent((event) => {
      if (activeOnly && !isActiveEvent(event)) return;
      const duration = Math.max(1, Number(event.duration) || 1);
      if (duration < 2) return;
      let y;
      try {
        y = rowForNote(grid, event.note);
      } catch (_) {
        return;
      }
      if (y === null || y === undefined) return;
      for (let x = event.time + 1; x < event.time + duration && x < grid.notes.cols; x++) {
        grid.notes.set(x, y, event.note);
      }
    });
    forEachOverlayNote((event) => {
      if (activeOnly && !isActiveEvent(event)) return;
      const duration = Math.max(1, Number(event.duration) || 1);
      let y;
      try {
        y = rowForNote(grid, event.note);
      } catch (_) {
        return;
      }
      if (y === null || y === undefined) return;
      for (let x = event.time; x < event.time + duration && x < grid.notes.cols; x++) {
        grid.notes.set(x, y, event.note);
      }
    });
  }

  function refreshInstrumentGrid() {
    ensureEventTracks();
    patchEnhancedDrumCanvas();
    const grid = sm.grid.instrument;
    grid.notes.reset(grid.notes.cols, grid.notes.rows);
    if (state.activeTrackId === "__drums") {
      paintEnhancedDrumsInGrid();
      return;
    }
    forEachInstrumentEvent((event) => {
      if (!isActiveEvent(event)) return;
      let y = null;
      try {
        y = rowForNote(grid, event.note);
      } catch (_) {}
      if (y !== null && event.time >= 0 && event.time < grid.notes.cols) grid.notes.set(event.time, y, event.note);
    });
    paintHeldVisuals(true);
  }

  function refreshPercussionGrid() {
    const grid = sm.grid.percussion;
    if (!grid) return;
    grid.notes.reset(grid.notes.cols, grid.notes.rows);
    grid.syncWithMidiTrack();
  }

  function instrumentPitchRange() {
    let min = Infinity;
    let max = -Infinity;
    forEachInstrumentEvent((event) => {
      min = Math.min(min, event.note);
      max = Math.max(max, event.note);
    });
    forEachOverlayNote((event) => {
      min = Math.min(min, event.note);
      max = Math.max(max, event.note);
    });
    return Number.isFinite(min) ? { min, max } : null;
  }

  function existingSongEndSubBeats() {
    let end = 0;
    forEachInstrumentEvent((event) => {
      end = Math.max(end, event.time + Math.max(1, Number(event.duration) || 1));
    });
    forEachOverlayNote((event) => {
      end = Math.max(end, event.time + Math.max(1, Number(event.duration) || 1));
    });
    forEachPercussionEvent((event) => {
      end = Math.max(end, event.time + Math.max(1, Number(event.duration) || 1));
    });
    return end;
  }

  function fitOptionsToExistingNotes(options) {
    const range = instrumentPitchRange();
    const end = existingSongEndSubBeats();
    const beats = Math.max(1, Number(options.beats) || 4);
    const subdivision = Math.max(1, Number(options.subdivision) || 2);
    const minBars = Math.max(1, Math.ceil(end / (beats * subdivision)));
    let rootNote = options.rootNote;
    let octaves = options.octaves;
    const requestedTop = rootNote + 12 * octaves;
    if (range) {
      if (rootNote > range.min) rootNote = Math.max(0, Math.floor(range.min / 12) * 12);
      const neededTop = Math.max(requestedTop, range.max + 1);
      octaves = Math.max(1, Math.ceil((neededTop - rootNote) / 12));
    }
    return { ...options, bars: Math.max(options.bars, minBars), rootNote, octaves };
  }

  function normalizePitchOptions(options) {
    const rootNote = Math.max(0, Math.round(Number(options.rootNote) || 0));
    return {
      ...options,
      rootNote,
      rootPitch: rootNote % 12,
      rootOctave: Math.floor(rootNote / 12),
    };
  }

  function applyOptionsNoMorph(options) {
    sm.options.fromJSON(normalizePitchOptions(options));
    if (sm.grid.resetInstruments) sm.grid.resetInstruments();
    if (sm.grid.resize) sm.grid.resize();
    sm.player.syncWithMidiTrack();
    if (sm.player.percussionTrack) sm.player.percussionTrack.syncWithMidiTrack();
    rebuildEnhancedDrumPart();
    rebuildOverlayNotePart();
    refreshInstrumentGrid();
    refreshPercussionGrid();
    renderTracks();
    renderAudioClips();
    window.dispatchEvent(new Event("resize"));
    sm.changed();
  }

  function renderTracks() {
    const menuList = document.getElementById("cml-track-list");
    const floatingList = document.getElementById("cml-floating-track-list");
    if (!menuList && !floatingList) return;
    const menuPanel = menuList && menuList.closest(".cml-section");
    const shouldRenderMenuList = !!menuList && (!menuPanel || menuPanel.classList.contains("active"));
    ensureEventTracks();
    const makeTrackRow = (track, isDrums = false) => {
      const row = document.createElement("div");
      row.className = "cml-track-row";
      row.dataset.active = String(isDrums ? state.activeTrackId === "__drums" : track.id === state.activeTrackId);
      const count = !isDrums && Number.isFinite(track.noteCount) ? ` (${track.noteCount})` : "";
      row.innerHTML = `
        <button class="cml-track-pick" style="--track:${isDrums ? "#ff3b30" : track.color}">${isDrums ? "Drums" : `${track.name}${count}`}</button>
        <button class="cml-track-mute ${isDrums ? (state.drumTrackMuted ? "active" : "") : (track.muted ? "active" : "")}">${isDrums ? (state.drumTrackMuted ? "Muted" : "Mute") : (track.muted ? "Muted" : "Mute")}</button>
      `;
      row.querySelector(".cml-track-pick").onclick = () => {
        state.activeTrackId = isDrums ? "__drums" : track.id;
        refreshInstrumentGrid();
        renderTracks();
        const status = document.getElementById("cml-mod-status");
        if (status) status.textContent = `Active clip: ${isDrums ? "Drums" : track.name}`;
      };
      row.querySelector(".cml-track-mute").onclick = () => {
        if (isDrums) {
          state.drumTrackMuted = !state.drumTrackMuted;
          rebuildEnhancedDrumPart();
        } else {
          track.muted = !track.muted;
          sm.player.syncWithMidiTrack();
        }
        renderTracks();
      };
      return row;
    };
    const allTracks = [{ isDrums: true, id: "__drums", name: "Drums" }];
    state.tracks.forEach((track) => allTracks.push({ track, id: track.id, name: track.name }));

    if (shouldRenderMenuList) {
      menuList.innerHTML = "";
      menuList.appendChild(makeTrackRow(null, true));
      state.tracks.forEach((track) => {
        menuList.appendChild(makeTrackRow(track, false));
      });
    } else if (menuList) {
      menuList.innerHTML = "";
    }

    if (floatingList) {
      floatingList.innerHTML = "";
      const activeIndex = Math.max(0, allTracks.findIndex((item) => item.id === state.activeTrackId));
      const current = allTracks[activeIndex] || allTracks[0];
      const prev = document.createElement("button");
      prev.className = "cml-track-nav";
      prev.textContent = "<";
      prev.onclick = () => {
        const next = allTracks[(activeIndex - 1 + allTracks.length) % allTracks.length];
        state.activeTrackId = next.id;
        refreshInstrumentGrid();
        renderTracks();
      };
      const next = document.createElement("button");
      next.className = "cml-track-nav";
      next.textContent = ">";
      next.onclick = () => {
        const pick = allTracks[(activeIndex + 1) % allTracks.length];
        state.activeTrackId = pick.id;
        refreshInstrumentGrid();
        renderTracks();
      };
      const label = document.createElement("div");
      label.className = "cml-track-slide-count";
      label.textContent = `${activeIndex + 1}/${Math.max(1, allTracks.length)}`;
      floatingList.appendChild(prev);
      floatingList.appendChild(current?.isDrums ? makeTrackRow(null, true) : makeTrackRow(current?.track || state.tracks[0], false));
      floatingList.appendChild(next);
      floatingList.appendChild(label);
    }
  }

  function addTrack() {
    const nextNumber = state.tracks.length + 1;
    const track = {
      id: `track-${Date.now()}`,
      name: `Track ${nextNumber}`,
      color: trackColors[state.tracks.length % trackColors.length],
      muted: false,
      instrument: "songmaker",
      customInstrumentId: null,
    };
    state.tracks.push(track);
    state.activeTrackId = track.id;
    refreshInstrumentGrid();
    renderTracks();
    return `${track.name} added and selected. Grid is showing only this clip.`;
  }

  function removeInstrumentEvents(events) {
    events.forEach((event) => {
      removeInstrumentEvent(event);
    });
  }

  function removeInstrumentEvent(event) {
    if (!event) return false;
    if (event.__cmlOverlay) {
      const before = state.overlayNotes.length;
      state.overlayNotes = state.overlayNotes.filter((item) => item !== event);
      const removed = state.overlayNotes.length !== before;
      if (removed) rebuildOverlayNotePart();
      return removed;
    }
    try {
      return !!sm.midi.instrument.remove(event.time, event.note, true);
    } catch (_) {
      return false;
    }
  }

  function emptyTrack() {
    return { id: "track-1", name: "Track 1", color: trackColors[0], muted: false, instrument: "songmaker", customInstrumentId: null };
  }

  function resetCurrentClip(forceTrackId = null) {
    const targetId = forceTrackId || state.activeTrackId;
    if (targetId === "__drums") {
      const count = state.enhancedDrums.length;
      state.enhancedDrums = [];
      if (sm.midi.percussion && sm.midi.percussion.clear) sm.midi.percussion.clear();
      rebuildEnhancedDrumPart();
      refreshInstrumentGrid();
      refreshPercussionGrid();
      renderTracks();
      sm.changed();
      return `Reset current clip: removed ${count} drum hits.`;
    }
    const track = state.tracks.find((item) => item.id === targetId) || currentTrack();
    const events = [];
    forEachInstrumentEvent((event) => {
      if ((event.__cmlTrack || "track-1") === track.id) events.push(event);
    });
    forEachOverlayNote((event) => {
      if ((event.__cmlTrack || "track-1") === track.id) events.push(event);
    });
    removeInstrumentEvents(events);
    sm.player.syncWithMidiTrack();
    refreshInstrumentGrid();
    renderTracks();
    sm.changed();
    return `Reset current clip: removed ${events.length} notes from ${track.name}.`;
  }

  function deleteTrack(trackId) {
    const index = state.tracks.findIndex((track) => track.id === trackId);
    if (index < 0) return "Clip was already gone.";
    const track = state.tracks[index];
    const message = resetCurrentClip(trackId);
    if (state.tracks.length <= 1) {
      state.tracks = [emptyTrack()];
      state.activeTrackId = "track-1";
      renderTracks();
      return `${message} Kept one empty clip.`;
    }
    state.tracks.splice(index, 1);
    if (state.activeTrackId === trackId) {
      state.activeTrackId = (state.tracks[Math.min(index, state.tracks.length - 1)] || state.tracks[0]).id;
    }
    refreshInstrumentGrid();
    renderTracks();
    return `Deleted ${track.name}.`;
  }

  function resetAll() {
    let melodyCount = 0;
    let nativeDrumCount = 0;
    forEachInstrumentEvent(() => melodyCount++);
    forEachOverlayNote(() => melodyCount++);
    forEachPercussionEvent(() => nativeDrumCount++);
    const drumCount = state.enhancedDrums.length;
    sm.midi.instrument.clear();
    sm.midi.percussion.clear();
    state.overlayNotes = [];
    state.enhancedDrums = [];
    state.drumTrackMuted = false;
    state.tracks = [emptyTrack()];
    state.activeTrackId = "track-1";
    state.audioClips = [];
    state.customInstruments = [];
    state.globalInstrumentId = "songmaker";
    stopEnhancedDrums();
    stopAudioNodes();
    clearOverlayNotePart();
    rebuildEnhancedDrumPart();
    sm.player.syncWithMidiTrack();
    if (sm.player.percussionTrack) sm.player.percussionTrack.syncWithMidiTrack();
    refreshInstrumentGrid();
    refreshPercussionGrid();
    renderTracks();
    sm.changed();
    return `Reset all: removed ${melodyCount} melody notes and ${drumCount + nativeDrumCount} drum hits.`;
  }

  function splitTracksByOctave() {
    const buckets = new Map();
    forEachInstrumentEvent((event) => {
      const octave = Math.floor(event.note / 12);
      if (!buckets.has(octave)) buckets.set(octave, `oct-${octave}`);
    });
    const octaves = [...buckets.keys()].sort((a, b) => a - b);
    if (!octaves.length) return "No notes to split yet.";
    state.tracks = octaves.map((octave, index) => ({
      id: `oct-${octave}`,
      name: `Octave ${octave}`,
      color: trackColors[index % trackColors.length],
      muted: false,
      instrument: "songmaker",
      customInstrumentId: null,
    }));
    forEachInstrumentEvent((event) => {
      event.__cmlTrack = `oct-${Math.floor(event.note / 12)}`;
    });
    state.activeTrackId = state.tracks[0].id;
    sm.player.syncWithMidiTrack();
    renderTracks();
    return `Split into ${state.tracks.length} octave tracks.`;
  }

  function drumRowForType(type) {
    const index = drumTypes.indexOf(type);
    if (index < 0) return drumTypes.length - 1;
    return index;
  }

  function drumTypeForRow(row) {
    return drumTypes[Math.max(0, Math.min(drumTypes.length - 1, row))] || "perc";
  }

  function paintEnhancedDrumsInGrid() {
    const grid = sm.grid.instrument;
    state.enhancedDrums.forEach((event) => {
      const y = Math.max(0, Math.min(grid.notes.rows - 1, drumRowForType(event.type)));
      grid.notes.set(event.time, y, grid.indexToPitch(y));
    });
  }

  function drawEnhancedDrumCanvas(renderer, notes, _pointer, scroll) {
    if (state.activeTrackId !== "__drums" || !renderer || !renderer.context || !notes) return false;
    const ctx = renderer.context;
    const dpi = renderer.dpi || 1;
    const tileWidth = renderer.tileWidth || 0;
    const tileHeight = renderer.tileHeight || 0;
    if (!tileWidth || !tileHeight) return false;

    const xOffset = ((scroll && scroll.x) || 0) * dpi;
    const yOffset = ((scroll && scroll.y) || 0) * dpi;
    const xMin = renderer.bounds ? renderer.bounds.xMin : 0;
    const xMax = renderer.bounds ? renderer.bounds.xMax : notes.cols;
    const visibleWidth = renderer.width ? renderer.width * dpi : (renderer.canvas?.width || 0);
    const visibleHeight = renderer.height ? renderer.height * dpi : (renderer.canvas?.height || 0);

    ctx.save();
    if (!state.extraLowGraphics) {
      drumTypes.forEach((type, row) => {
        if (row >= notes.rows) return;
        const screenRow = notes.flipY ? notes.flipY(row) : notes.rows - row - 1;
        const y = screenRow * tileHeight * dpi - yOffset;
        if (y > visibleHeight || y + tileHeight * dpi < 0) return;
        ctx.fillStyle = rgba(drumColors[type] || drumColors.perc, state.lowGraphics ? 0.07 : 0.11);
        ctx.fillRect(0, y, visibleWidth, tileHeight * dpi);
      });
    }

    state.enhancedDrums.forEach((event) => {
      const row = Math.max(0, Math.min(notes.rows - 1, drumRowForType(event.type)));
      const end = event.time + Math.max(1, Number(event.duration) || 1);
      if (end < xMin || event.time > xMax) return;
      const screenRow = notes.flipY ? notes.flipY(row) : notes.rows - row - 1;
      const x = event.time * tileWidth * dpi - xOffset;
      const y = screenRow * tileHeight * dpi - yOffset;
      const w = Math.max(tileWidth * dpi, (end - event.time) * tileWidth * dpi);
      const h = tileHeight * dpi;
      ctx.fillStyle = rgba(drumColors[event.type] || drumColors.perc, 0.88);
      ctx.fillRect(x + dpi, y + dpi, Math.max(1, w - 2 * dpi), Math.max(1, h - 2 * dpi));
    });
    ctx.restore();
    return false;
  }

  function patchEnhancedDrumCanvas() {
    const renderer = sm.grid.instrument && sm.grid.instrument.renderer;
    if (!renderer || renderer.__cmlEnhancedDrumCanvasPatched || typeof renderer.registerDrawMethod !== "function") return;
    renderer.registerDrawMethod(drawEnhancedDrumCanvas);
    renderer.__cmlEnhancedDrumCanvasPatched = true;
  }

  function enhancedDrumAt(time, row) {
    const type = drumTypeForRow(row);
    return state.enhancedDrums.find((event) => event.time === time && event.type === type);
  }

  function drumContext() {
    if (!state.drumCtx) {
      state.drumCtx = sm.context?.rawContext || sm.context?._context || new (window.AudioContext || window.webkitAudioContext)();
    }
    if (state.drumCtx.state === "suspended") state.drumCtx.resume();
    return state.drumCtx;
  }

  function secondsPerSubBeat() {
    return 60 / sm.options.tempo / sm.options.subdivision;
  }

  function dataUrlToArrayBuffer(dataUrl) {
    const parts = String(dataUrl).split(",");
    const binary = atob(parts[1] || "");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Could not read file."));
      reader.readAsDataURL(file);
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Could not read downloaded audio."));
      reader.readAsDataURL(blob);
    });
  }

  async function decodeAudioDataUrl(dataUrl) {
    const ctx = drumContext();
    const copy = dataUrlToArrayBuffer(dataUrl).slice(0);
    return await ctx.decodeAudioData(copy);
  }

  function trackAudioNode(node) {
    state.audioNodes.push(node);
    setTimeout(() => {
      const index = state.audioNodes.indexOf(node);
      if (index >= 0) state.audioNodes.splice(index, 1);
    }, 120000);
  }

  function stopAudioNodes() {
    state.audioNodes.forEach((node) => {
      try { node.stop(0); } catch (_) {}
    });
    state.audioNodes = [];
  }

  function decodeStoredAudioAssets() {
    state.audioClips.forEach((clip) => {
      if (!clip.buffer && clip.dataUrl) decodeAudioDataUrl(clip.dataUrl).then((buffer) => {
        clip.buffer = buffer;
        clip.durationSeconds = buffer.duration;
        if (!Number.isFinite(clip.offsetSeconds)) clip.offsetSeconds = 0;
        if (!Number.isFinite(clip.lengthSeconds)) clip.lengthSeconds = Math.max(0.02, buffer.duration - (clip.offsetSeconds || 0));
        renderAudioClips();
      }).catch(console.warn);
    });
    state.customInstruments.forEach((instrument) => {
      if (!instrument.buffer && instrument.dataUrl) decodeAudioDataUrl(instrument.dataUrl).then((buffer) => {
        instrument.buffer = buffer;
      }).catch(console.warn);
    });
  }

  function playBuffer(buffer, when, offset = 0, duration = null, playbackRate = 1, gainValue = 0.85) {
    if (!buffer) return null;
    const ctx = drumContext();
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(playbackRate, when);
    gain.gain.setValueAtTime(gainValue, when);
    source.connect(gain).connect(ctx.destination);
    const safeOffset = Math.max(0, Math.min(buffer.duration - 0.01, offset || 0));
    const safeDuration = duration ? Math.max(0.02, Math.min(duration, buffer.duration - safeOffset)) : undefined;
    if (safeDuration) source.start(when, safeOffset, safeDuration);
    else source.start(when, safeOffset);
    trackAudioNode(source);
    return source;
  }

  function midiFrequency(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  function curveParam(param, when, points) {
    param.cancelScheduledValues(when);
    points.forEach(([time, value, type], index) => {
      const at = when + Math.max(0, time);
      if (index === 0 || type === "set") param.setValueAtTime(Math.max(0.0001, value), at);
      else if (type === "exp") param.exponentialRampToValueAtTime(Math.max(0.0001, value), at);
      else param.linearRampToValueAtTime(value, at);
    });
  }

  function addOsc(ctx, destination, type, frequency, when, stopAt, gainValue, detune = 0) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, when);
    osc.detune.setValueAtTime(detune, when);
    gain.gain.setValueAtTime(gainValue, when);
    osc.connect(gain).connect(destination);
    osc.start(when);
    osc.stop(stopAt);
    trackAudioNode(osc);
    return { osc, gain };
  }

  function addNoise(ctx, destination, when, stopAt, gainValue, filterFreq = 2500) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * Math.max(0.02, stopAt - when)));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(filterFreq, when);
    filter.Q.setValueAtTime(0.9, when);
    gain.gain.setValueAtTime(gainValue, when);
    source.connect(filter).connect(gain).connect(destination);
    source.start(when);
    source.stop(stopAt);
    trackAudioNode(source);
    return { source, gain };
  }

  function playGlobalInstrumentNote(event, duration, when, velocity = 1, instrumentId = "songmaker") {
    const preset = globalInstruments.find((item) => item.id === instrumentId);
    if (!preset || preset.id === "songmaker") return false;
    const ctx = drumContext();
    const freq = midiFrequency(event.note);
    const end = when + Math.max(0.08, Math.min(8, duration || 0.25));
    const releaseEnd = end + 0.25;
    const master = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const amount = Math.max(0.12, Math.min(1, velocity || 0.8));
    filter.connect(master).connect(ctx.destination);
    master.gain.setValueAtTime(0.0001, when);

    const env = (attack, decay, sustain, release, peak = 0.7) => {
      curveParam(master.gain, when, [
        [0, 0.0001, "set"],
        [attack, peak * amount, "linear"],
        [attack + decay, sustain * amount, "exp"],
        [Math.max(attack + decay, end - release), sustain * amount, "set"],
        [end + release, 0.0001, "exp"],
      ]);
    };

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(5200, when);
    filter.Q.setValueAtTime(0.8, when);

    switch (preset.kind) {
      case "piano":
        env(0.006, 0.28, 0.18, 0.22, 0.9);
        filter.frequency.setValueAtTime(Math.min(9000, 2400 + freq * 8), when);
        addOsc(ctx, filter, "triangle", freq, when, releaseEnd, 0.75);
        addOsc(ctx, filter, "sine", freq * 2.01, when, releaseEnd, 0.23);
        addOsc(ctx, filter, "sine", freq * 3.01, when, releaseEnd, 0.08);
        addNoise(ctx, filter, when, when + 0.08, 0.035, 3600);
        break;
      case "epiano":
        env(0.012, 0.36, 0.28, 0.3, 0.65);
        filter.frequency.setValueAtTime(4200, when);
        addOsc(ctx, filter, "sine", freq, when, releaseEnd, 0.72);
        addOsc(ctx, filter, "triangle", freq * 2, when, releaseEnd, 0.18);
        addOsc(ctx, filter, "sine", freq * 3.98, when, releaseEnd, 0.055);
        break;
      case "pluck":
        env(0.004, 0.22, 0.08, 0.18, 0.8);
        filter.frequency.setValueAtTime(Math.min(6800, 1800 + freq * 5), when);
        filter.Q.setValueAtTime(1.4, when);
        addOsc(ctx, filter, "triangle", freq, when, releaseEnd, 0.6);
        addOsc(ctx, filter, "sine", freq * 2.005, when, releaseEnd, 0.16);
        addNoise(ctx, filter, when, when + 0.055, 0.05, 1800);
        break;
      case "bass":
        env(0.008, 0.18, 0.42, 0.14, 0.75);
        filter.frequency.setValueAtTime(Math.min(1800, 280 + freq * 5), when);
        filter.Q.setValueAtTime(0.95, when);
        addOsc(ctx, filter, "triangle", freq, when, releaseEnd, 0.68);
        addOsc(ctx, filter, "sine", freq / 2, when, releaseEnd, 0.22);
        addOsc(ctx, filter, "sawtooth", freq, when, releaseEnd, 0.08);
        break;
      case "flute":
        env(0.08, 0.12, 0.45, 0.28, 0.48);
        filter.frequency.setValueAtTime(3600, when);
        addOsc(ctx, filter, "sine", freq, when, releaseEnd, 0.8);
        addOsc(ctx, filter, "sine", freq * 2.002, when, releaseEnd, 0.08);
        addNoise(ctx, filter, when, releaseEnd, 0.018, 3100);
        break;
      case "strings":
        env(0.16, 0.25, 0.5, 0.38, 0.52);
        filter.frequency.setValueAtTime(3000, when);
        addOsc(ctx, filter, "sawtooth", freq, when, releaseEnd, 0.22, -7);
        addOsc(ctx, filter, "sawtooth", freq, when, releaseEnd, 0.22, 7);
        addOsc(ctx, filter, "triangle", freq * 2, when, releaseEnd, 0.09);
        break;
      case "brass":
        env(0.055, 0.12, 0.52, 0.22, 0.58);
        filter.frequency.setValueAtTime(900, when);
        filter.frequency.linearRampToValueAtTime(Math.min(4200, 1200 + freq * 7), when + 0.09);
        filter.Q.setValueAtTime(1.2, when);
        addOsc(ctx, filter, "sawtooth", freq, when, releaseEnd, 0.36);
        addOsc(ctx, filter, "square", freq, when, releaseEnd, 0.12);
        break;
      case "organ":
        env(0.015, 0.05, 0.62, 0.12, 0.5);
        filter.frequency.setValueAtTime(5200, when);
        addOsc(ctx, filter, "sine", freq, when, releaseEnd, 0.5);
        addOsc(ctx, filter, "sine", freq * 2, when, releaseEnd, 0.18);
        addOsc(ctx, filter, "sine", freq * 3, when, releaseEnd, 0.11);
        addOsc(ctx, filter, "sine", freq * 4, when, releaseEnd, 0.06);
        break;
      case "kalimba":
      case "celeste":
        env(0.003, 0.34, 0.04, 0.32, 0.72);
        filter.frequency.setValueAtTime(preset.kind === "celeste" ? 7600 : 4800, when);
        addOsc(ctx, filter, "sine", freq, when, releaseEnd, 0.45);
        addOsc(ctx, filter, "sine", freq * (preset.kind === "celeste" ? 2.99 : 2.41), when, releaseEnd, 0.22);
        addOsc(ctx, filter, "triangle", freq * 5.02, when, releaseEnd, 0.08);
        break;
      case "choir":
        env(0.2, 0.35, 0.42, 0.45, 0.42);
        filter.frequency.setValueAtTime(2400, when);
        addOsc(ctx, filter, "sine", freq, when, releaseEnd, 0.36, -5);
        addOsc(ctx, filter, "sine", freq * 1.005, when, releaseEnd, 0.36, 5);
        addOsc(ctx, filter, "triangle", freq * 2, when, releaseEnd, 0.08);
        break;
      default:
        return false;
    }
    trackAudioNode({ stop: () => master.disconnect() });
    setTimeout(() => {
      try { master.disconnect(); } catch (_) {}
    }, Math.max(200, (releaseEnd - ctx.currentTime) * 1000 + 50));
    return true;
  }

  function playCustomInstrumentNote(event, duration, when, velocity = 1) {
    const track = state.tracks.find((item) => item.id === (event.__cmlTrack || "track-1"));
    const instrument = track && track.customInstrumentId
      ? state.customInstruments.find((item) => item.id === track.customInstrumentId)
      : null;
    if (instrument && instrument.buffer) {
      const rate = Math.pow(2, (event.note - (instrument.rootNote || 60)) / 12);
      playBuffer(instrument.buffer, when, 0, duration * rate, rate, Math.max(0.15, Math.min(1, velocity || 0.8)));
      return true;
    }
    return false;
  }

  function auditionAddedNote(grid, note, event) {
    const track = currentTrack();
    if (event && track && track.customInstrumentId) {
      const duration = Math.max(0.08, Math.min(1.5, Math.max(1, Number(event.duration) || 1) * secondsPerSubBeat()));
      if (playCustomInstrumentNote(event, duration, drumContext().currentTime, 0.85)) return;
    }
    grid.emit("add", note);
  }

  function scheduleAudioClips(delay = "+0.1", offsetSeconds = 0) {
    stopAudioNodes();
    const ctx = drumContext();
    const delaySeconds = typeof delay === "string" ? Number(delay.replace("+", "")) || 0 : Number(delay) || 0;
    const baseTime = ctx.currentTime + delaySeconds;
    state.audioClips.forEach((clip) => {
      if (!clip.buffer || clip.muted) return;
      const clipStartSeconds = Math.max(0, Number(clip.startTime) || 0) * secondsPerSubBeat();
      const localOffset = Math.max(0, offsetSeconds - clipStartSeconds);
      const clipLength = Math.max(0.02, Number(clip.lengthSeconds) || clip.buffer.duration);
      if (clipStartSeconds + clipLength < offsetSeconds) return;
      playBuffer(
        clip.buffer,
        baseTime + Math.max(0, clipStartSeconds - offsetSeconds),
        (clip.offsetSeconds || 0) + localOffset,
        Math.max(0.02, clipLength - localOffset),
        1,
        clip.gain || 0.9
      );
    });
  }

  async function importAudioClipFile(file) {
    const start = Number(prompt("Start beat/sub-beat for this audio clip?", "0"));
    const dataUrl = await fileToDataUrl(file);
    const buffer = await decodeAudioDataUrl(dataUrl);
    const clip = {
      id: `audio-${Date.now()}`,
      name: file.name || "Audio clip",
      dataUrl,
      startTime: Number.isFinite(start) ? Math.max(0, Math.round(start)) : 0,
      offsetSeconds: 0,
      lengthSeconds: buffer.duration,
      durationSeconds: buffer.duration,
      gain: 0.9,
      muted: false,
      trackId: state.activeTrackId !== "__drums" ? state.activeTrackId : "track-1",
      buffer,
    };
    state.audioClips.push(clip);
    state.selectedAudioClipId = clip.id;
    sm.changed();
    renderAudioClips();
    return `Added audio clip ${clip.name} at ${clip.startTime}.`;
  }

  async function importCustomInstrumentFile(file) {
    const track = currentTrack();
    if (!track || state.activeTrackId === "__drums") throw new Error("Select a melody clip before importing a custom instrument.");
    const root = Number(prompt("Root MIDI note for this sample? 60 = middle C", "60"));
    const dataUrl = await fileToDataUrl(file);
    const buffer = await decodeAudioDataUrl(dataUrl);
    const instrument = {
      id: `inst-${Date.now()}`,
      name: file.name || "Custom instrument",
      dataUrl,
      rootNote: Number.isFinite(root) ? Math.max(0, Math.min(127, Math.round(root))) : 60,
      buffer,
    };
    state.customInstruments.push(instrument);
    track.customInstrumentId = instrument.id;
    track.globalInstrumentId = "songmaker";
    track.instrument = "songmaker";
    sm.changed();
    return `${track.name} now uses custom instrument ${instrument.name}.`;
  }

  async function importWebInstrumentUrl() {
    const track = currentTrack();
    if (!track || state.activeTrackId === "__drums") throw new Error("Select a melody clip before porting a web instrument.");
    const url = prompt("Paste a direct audio file URL (.wav, .mp3, .ogg). It must allow browser/CORS access.", "");
    if (!url) return "Web instrument import cancelled.";
    const root = Number(prompt("Root MIDI note for this web sample? 60 = middle C", "60"));
    const defaultName = decodeURIComponent(String(url).split("/").pop() || "Web instrument").split("?")[0] || "Web instrument";
    const name = prompt("Instrument name?", defaultName) || defaultName;
    const applyAll = confirm("Apply this web instrument to ALL clips? OK = all clips, Cancel = active clip only.");
    const response = await fetch(url, { mode: "cors", cache: "force-cache" });
    if (!response.ok) throw new Error(`Could not fetch that audio URL: ${response.status}`);
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    const buffer = await decodeAudioDataUrl(dataUrl);
    const instrument = {
      id: `web-inst-${Date.now()}`,
      name,
      sourceUrl: url,
      dataUrl,
      rootNote: Number.isFinite(root) ? Math.max(0, Math.min(127, Math.round(root))) : 60,
      buffer,
    };
    state.customInstruments.push(instrument);
    const applyToTrack = (item) => {
      item.customInstrumentId = instrument.id;
      item.globalInstrumentId = "songmaker";
      item.instrument = "songmaker";
    };
    if (applyAll) {
      state.tracks.forEach(applyToTrack);
      state.globalInstrumentId = `custom:${instrument.id}`;
    } else {
      applyToTrack(track);
    }
    sm.changed();
    renderTracks();
    updateGlobalInstrumentButton();
    return applyAll ? `Ported ${name} from the web to all clips.` : `Ported ${name} from the web to ${track.name}.`;
  }

  function selectedAudioClip() {
    return state.audioClips.find((clip) => clip.id === state.selectedAudioClipId) || state.audioClips[0] || null;
  }

  function audioClipTrack(clip) {
    const fallback = state.tracks[0]?.id || "track-1";
    if (!clip.trackId || !state.tracks.some((track) => track.id === clip.trackId)) clip.trackId = fallback;
    return state.tracks.find((track) => track.id === clip.trackId) || state.tracks[0] || { id: fallback, name: "Track 1", color: "#16a8f0" };
  }

  function audioClipColor(clip) {
    return audioClipTrack(clip).color || "#16a8f0";
  }

  function audioLaneIndex(clip) {
    return Math.max(0, state.tracks.findIndex((track) => track.id === audioClipTrack(clip).id));
  }

  function trackForAudioLane(index) {
    return state.tracks[Math.max(0, Math.min(state.tracks.length - 1, Math.round(index)))] || state.tracks[0] || { id: "track-1", name: "Track 1" };
  }

  function audioClipDurationSubBeats(clip) {
    return Math.max(1, Math.round(Math.max(0.02, clip.lengthSeconds || clip.durationSeconds || 0) / secondsPerSubBeat()));
  }

  function audioClipEndSubBeat(clip) {
    return Math.round((clip.startTime || 0) + audioClipDurationSubBeats(clip));
  }

  function touchAudioClip(clip) {
    if (!clip) return;
    clip.startTime = Math.max(0, Math.round(Number(clip.startTime) || 0));
    const maxLength = Math.max(0.02, (clip.buffer?.duration || clip.durationSeconds || 0) - (clip.offsetSeconds || 0));
    clip.lengthSeconds = Math.max(0.02, Math.min(maxLength || Infinity, Number(clip.lengthSeconds) || maxLength || 0.02));
    sm.changed();
    renderAudioClips();
    renderAudioGridLayer();
  }

  function chopAudioClip(clip, splitSubBeat) {
    const split = Math.round(Number(splitSubBeat));
    const start = Math.round(clip.startTime || 0);
    const end = audioClipEndSubBeat(clip);
    if (!Number.isFinite(split) || split <= start || split >= end) return false;
    const leftSeconds = Math.max(0.02, (split - start) * secondsPerSubBeat());
    const rightSeconds = Math.max(0.02, (clip.lengthSeconds || clip.durationSeconds || 0) - leftSeconds);
    const right = {
      ...clip,
      id: `audio-${Date.now()}-${Math.floor(Math.random() * 999)}`,
      name: `${clip.name || "Audio clip"} cut`,
      startTime: split,
      offsetSeconds: (clip.offsetSeconds || 0) + leftSeconds,
      lengthSeconds: rightSeconds,
      buffer: clip.buffer,
    };
    clip.lengthSeconds = leftSeconds;
    state.audioClips.push(right);
    state.selectedAudioClipId = right.id;
    sm.changed();
    renderAudioClips();
    renderAudioGridLayer();
    return true;
  }

  function duplicateAudioClip(clip, startTime = audioClipEndSubBeat(clip)) {
    const copy = {
      ...clip,
      id: `audio-${Date.now()}-${Math.floor(Math.random() * 999)}`,
      name: `${clip.name || "Audio clip"} copy`,
      startTime: Math.max(0, Math.round(startTime)),
      buffer: clip.buffer,
    };
    state.audioClips.push(copy);
    state.selectedAudioClipId = copy.id;
    sm.changed();
    renderAudioClips();
    renderAudioGridLayer();
  }

  function deleteAudioClip(clip) {
    state.audioClips = state.audioClips.filter((item) => item.id !== clip.id);
    if (state.selectedAudioClipId === clip.id) state.selectedAudioClipId = state.audioClips[0]?.id || null;
    sm.changed();
    renderAudioClips();
    renderAudioGridLayer();
  }

  function drawWaveform(canvas, clip) {
    if (!canvas || !clip || !clip.buffer) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width = Math.max(160, canvas.clientWidth * devicePixelRatio);
    const height = canvas.height = Math.max(34, canvas.clientHeight * devicePixelRatio);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#101820";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = Math.max(1, devicePixelRatio);
    for (let x = 0; x < width; x += Math.max(14, width / Math.max(1, audioClipDurationSubBeats(clip)))) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    const data = clip.buffer.getChannelData(0);
    const start = Math.floor((clip.offsetSeconds || 0) * clip.buffer.sampleRate);
    const length = Math.max(1, Math.floor((clip.lengthSeconds || clip.buffer.duration) * clip.buffer.sampleRate));
    const end = Math.min(data.length, start + length);
    const step = Math.max(1, Math.floor((end - start) / width));
    ctx.strokeStyle = clip.id === state.selectedAudioClipId ? "#f4a806" : "#1daeea";
    ctx.lineWidth = Math.max(1, devicePixelRatio);
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
      let min = 1;
      let max = -1;
      const sampleStart = start + x * step;
      for (let i = sampleStart; i < Math.min(end, sampleStart + step); i++) {
        const value = data[i] || 0;
        if (value < min) min = value;
        if (value > max) max = value;
      }
      const y1 = (1 - (min + 1) / 2) * height;
      const y2 = (1 - (max + 1) / 2) * height;
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
    }
    ctx.stroke();
    const handleWidth = Math.max(7, 9 * devicePixelRatio);
    ctx.fillStyle = clip.id === state.selectedAudioClipId ? "rgba(244,168,6,0.45)" : "rgba(29,174,234,0.35)";
    ctx.fillRect(0, 0, handleWidth, height);
    ctx.fillRect(width - handleWidth, 0, handleWidth, height);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `${Math.max(9, 10 * devicePixelRatio)}px Arial`;
    ctx.fillText(`${Math.round(clip.startTime || 0)}-${audioClipEndSubBeat(clip)}`, 10 * devicePixelRatio, 14 * devicePixelRatio);
  }

  function wireAudioClipEditor(row, clip) {
    const canvas = row.querySelector(".cml-audio-wave");
    const startInput = row.querySelector(".cml-audio-start");
    const lengthInput = row.querySelector(".cml-audio-length");
    if (!canvas) return;
    const updateInputs = () => {
      if (startInput) startInput.value = Math.round(clip.startTime || 0);
      if (lengthInput) lengthInput.value = audioClipDurationSubBeats(clip);
    };
    canvas.ondblclick = (event) => {
      const rect = canvas.getBoundingClientRect();
      const ratio = rect.width ? Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) : 0.5;
      chopAudioClip(clip, Math.round((clip.startTime || 0) + ratio * audioClipDurationSubBeats(clip)));
    };
    canvas.onpointerdown = (event) => {
      event.preventDefault();
      canvas.setPointerCapture?.(event.pointerId);
      state.selectedAudioClipId = clip.id;
      row.dataset.active = "true";
      const rect = canvas.getBoundingClientRect();
      const handlePixels = 14;
      const mode = event.clientX - rect.left < handlePixels ? "trim-left" : rect.right - event.clientX < handlePixels ? "trim-right" : "move";
      const startX = event.clientX;
      const originalStart = Math.round(clip.startTime || 0);
      const originalOffset = Number(clip.offsetSeconds) || 0;
      const originalLength = Math.max(0.02, Number(clip.lengthSeconds) || clip.durationSeconds || clip.buffer?.duration || 0.02);
      const pxPerSubBeat = rect.width / audioClipDurationSubBeats(clip);
      const maxLength = Math.max(0.02, (clip.buffer?.duration || clip.durationSeconds || originalLength) - originalOffset);
      canvas.onpointermove = (moveEvent) => {
        const deltaSubBeats = Math.round((moveEvent.clientX - startX) / Math.max(1, pxPerSubBeat));
        if (mode === "move") {
          clip.startTime = Math.max(0, originalStart + deltaSubBeats);
        } else if (mode === "trim-right") {
          clip.lengthSeconds = Math.max(0.02, Math.min(maxLength, originalLength + deltaSubBeats * secondsPerSubBeat()));
        } else {
          const secondsDelta = deltaSubBeats * secondsPerSubBeat();
          const nextOffset = Math.max(0, originalOffset + secondsDelta);
          const nextLength = Math.max(0.02, originalLength - secondsDelta);
          if (nextOffset < originalOffset + originalLength - 0.02 && nextLength >= 0.02) {
            clip.startTime = Math.max(0, originalStart + deltaSubBeats);
            clip.offsetSeconds = nextOffset;
            clip.lengthSeconds = nextLength;
          }
        }
        updateInputs();
        drawWaveform(canvas, clip);
      };
      canvas.onpointerup = canvas.onpointercancel = () => {
        canvas.onpointermove = null;
        canvas.onpointerup = null;
        canvas.onpointercancel = null;
        touchAudioClip(clip);
      };
    };
  }

  function renderAudioGridLayer() {
    const layer = document.getElementById("cml-audio-grid-layer");
    if (state.lowGraphics) {
      if (layer) layer.innerHTML = "";
      return;
    }
    const renderer = sm.grid.instrument?.renderer;
    const canvas = renderer?.canvas;
    const view = state.__longEditView;
    if (!layer || !canvas || !view || !view.tileWidth || !view.tileHeight) return;
    const rect = canvas.getBoundingClientRect();
    layer.style.left = `${rect.left}px`;
    layer.style.top = `${rect.top}px`;
    layer.style.width = `${rect.width}px`;
    layer.style.height = `${rect.height}px`;
    layer.innerHTML = "";
    if (!state.audioClips.length) return;
    const dpi = view.dpi || renderer.dpi || window.devicePixelRatio || 1;
    const tileWidth = (view.tileWidth || renderer.tileWidth || 24);
    const tileHeight = (view.tileHeight || renderer.tileHeight || 18);
    const scrollX = ((view.scroll && view.scroll.x) || 0);
    const scrollY = ((view.scroll && view.scroll.y) || 0);
    state.audioClips.forEach((clip) => {
      const x = (clip.startTime || 0) * tileWidth - scrollX;
      const width = Math.max(tileWidth, audioClipDurationSubBeats(clip) * tileWidth);
      const lane = audioLaneIndex(clip);
      const gridRow = Math.max(0, Math.min(sm.grid.instrument.notes.rows - 1, lane));
      const screenRow = sm.grid.instrument.notes.flipY ? sm.grid.instrument.notes.flipY(gridRow) : sm.grid.instrument.notes.rows - gridRow - 1;
      const y = screenRow * tileHeight - scrollY;
      if (x + width < -20 || x > rect.width + 20 || y + tileHeight < -20 || y > rect.height + 20) return;
      const block = document.createElement("div");
      block.className = "cml-audio-grid-block";
      block.dataset.active = String(clip.id === state.selectedAudioClipId);
      block.style.setProperty("--clip-color", audioClipColor(clip));
      block.style.left = `${x}px`;
      block.style.top = `${y}px`;
      block.style.width = `${width}px`;
      block.style.height = `${Math.max(tileHeight, 24)}px`;
      block.innerHTML = `
        <span class="cml-audio-grid-handle left"></span>
        <span class="cml-audio-grid-title">${audioClipTrack(clip).name || "Audio"}</span>
        <span class="cml-audio-grid-wave"></span>
        <span class="cml-audio-grid-handle right"></span>
      `;
      const begin = (event, mode) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        state.selectedAudioClipId = clip.id;
        const startX = event.clientX;
        const originalStart = Math.round(clip.startTime || 0);
        const originalOffset = Number(clip.offsetSeconds) || 0;
        const originalLength = Math.max(0.02, Number(clip.lengthSeconds) || clip.durationSeconds || clip.buffer?.duration || 0.02);
        const originalEnd = originalStart + Math.max(1, Math.round(originalLength / secondsPerSubBeat()));
        const originalLane = audioLaneIndex(clip);
        const maxLength = Math.max(0.02, (clip.buffer?.duration || clip.durationSeconds || originalLength) - originalOffset);
        block.setPointerCapture?.(event.pointerId);
        block.classList.add("editing");
        const move = (moveEvent) => {
          const delta = Math.round((moveEvent.clientX - startX) / Math.max(1, tileWidth));
          const laneDelta = Math.round((moveEvent.clientY - event.clientY) / Math.max(1, tileHeight));
          if (mode === "move") {
            clip.startTime = Math.max(0, originalStart + delta);
            clip.trackId = trackForAudioLane(originalLane + laneDelta).id;
          } else if (mode === "right") {
            clip.startTime = originalStart;
            clip.lengthSeconds = Math.min(maxLength, Math.max(0.02, (Math.max(originalStart + 1, originalEnd + delta) - originalStart) * secondsPerSubBeat()));
          } else {
            const nextStart = Math.max(0, Math.min(originalStart + delta, originalEnd - 1));
            const secondsDelta = (nextStart - originalStart) * secondsPerSubBeat();
            clip.startTime = nextStart;
            clip.offsetSeconds = Math.max(0, originalOffset + secondsDelta);
            clip.lengthSeconds = Math.max(0.02, originalLength - secondsDelta);
          }
          renderAudioGridLayer();
        };
        const up = () => {
          window.removeEventListener("pointermove", move, true);
          window.removeEventListener("pointerup", up, true);
          touchAudioClip(clip);
          window.dispatchEvent(new Event("resize"));
        };
        window.addEventListener("pointermove", move, true);
        window.addEventListener("pointerup", up, true);
      };
      block.querySelector(".cml-audio-grid-handle.left").onpointerdown = (event) => begin(event, "left");
      block.querySelector(".cml-audio-grid-handle.right").onpointerdown = (event) => begin(event, "right");
      block.onpointerdown = (event) => {
        if (event.target.classList.contains("cml-audio-grid-handle")) return;
        begin(event, "move");
      };
      block.ondblclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const blockRect = block.getBoundingClientRect();
        const split = Math.round((clip.startTime || 0) + ((event.clientX - blockRect.left) / Math.max(1, blockRect.width)) * audioClipDurationSubBeats(clip));
        chopAudioClip(clip, split);
      };
      layer.appendChild(block);
    });
  }
  window.addEventListener("resize", () => requestAnimationFrame(renderAudioGridLayer), true);
  window.addEventListener("scroll", () => requestAnimationFrame(renderAudioGridLayer), true);

  function renderAudioClips() {
    const list = document.getElementById("cml-audio-clip-list");
    if (!list) return;
    const panel = list.closest(".cml-section");
    if (panel && !panel.classList.contains("active")) {
      list.innerHTML = "";
      return;
    }
    list.innerHTML = "";
    if (!state.audioClips.length) {
      list.innerHTML = '<div class="cml-empty-audio">No audio clips yet.</div>';
      return;
    }
    [...state.audioClips].sort((a, b) => (a.startTime || 0) - (b.startTime || 0)).forEach((clip) => {
      const row = document.createElement("div");
      row.className = "cml-audio-clip";
      row.dataset.active = String(clip.id === state.selectedAudioClipId);
      row.innerHTML = `
        <div class="cml-audio-head">
          <button class="cml-audio-select"><span>${clip.name || "Audio clip"}</span><small>${audioClipTrack(clip).name || "Track"}</small></button>
          <button class="cml-audio-mute">${clip.muted ? "Unmute" : "Mute"}</button>
        </div>
      `;
      row.querySelector(".cml-audio-select").onclick = () => {
        state.selectedAudioClipId = clip.id;
        renderAudioClips();
        renderAudioGridLayer();
      };
      row.querySelector(".cml-audio-mute").onclick = () => {
        clip.muted = !clip.muted;
        sm.changed();
        renderAudioClips();
        renderAudioGridLayer();
      };
      list.appendChild(row);
    });
  }

  function noiseBuffer(ctx) {
    if (state.noiseBuffer && state.noiseBuffer.sampleRate === ctx.sampleRate) return state.noiseBuffer;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    state.noiseBuffer = buffer;
    return buffer;
  }

  function trackDrumNode(node) {
    state.enhancedDrumNodes.push(node);
    setTimeout(() => {
      const index = state.enhancedDrumNodes.indexOf(node);
      if (index >= 0) state.enhancedDrumNodes.splice(index, 1);
    }, 2000);
  }

  function playNoiseDrum(ctx, when, type, velocity) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const settings = {
      snare: ["bandpass", 1800, 0.18, 0.45],
      clap: ["bandpass", 1400, 0.12, 0.5],
      hat: ["highpass", 8000, 0.045, 0.28],
      openhat: ["highpass", 6500, 0.22, 0.26],
      cymbal: ["highpass", 4500, 0.55, 0.2],
      rim: ["bandpass", 3200, 0.055, 0.36],
      perc: ["bandpass", 2400, 0.08, 0.3],
    }[type] || ["bandpass", 1800, 0.1, 0.2];
    filter.type = settings[0];
    filter.frequency.setValueAtTime(settings[1], when);
    gain.gain.setValueAtTime(settings[3] * velocity, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + settings[2]);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(when);
    src.stop(when + settings[2] + 0.03);
    trackDrumNode(src);
  }

  function playToneDrum(ctx, when, type, midiNote, velocity) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type === "tom" ? "sine" : "triangle";
    const startFreq = type === "kick" ? 135 : Math.max(70, 90 + (midiNote - 41) * 9);
    const endFreq = type === "kick" ? 42 : Math.max(48, startFreq * 0.62);
    const length = type === "kick" ? 0.36 : 0.22;
    osc.frequency.setValueAtTime(startFreq, when);
    osc.frequency.exponentialRampToValueAtTime(endFreq, when + length);
    gain.gain.setValueAtTime((type === "kick" ? 1.05 : 0.55) * velocity, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(when);
    osc.stop(when + length + 0.03);
    trackDrumNode(osc);
  }

  function playEnhancedDrum(event, when) {
    if (state.drumTrackMuted) return;
    const ctx = drumContext();
    const velocity = Math.max(0.2, Math.min(1, (event.velocity || 80) / 110));
    if (event.type === "kick" || event.type === "tom") playToneDrum(ctx, when, event.type, event.note, velocity);
    else if (event.type === "clap") {
      playNoiseDrum(ctx, when, "clap", velocity);
      playNoiseDrum(ctx, when + 0.018, "clap", velocity * 0.7);
      playNoiseDrum(ctx, when + 0.036, "clap", velocity * 0.55);
    } else {
      playNoiseDrum(ctx, when, event.type, velocity);
    }
  }

  function stopEnhancedDrums() {
    state.enhancedDrumNodes.forEach((node) => {
      try { node.stop(0); } catch (_) {}
    });
    state.enhancedDrumNodes = [];
  }

  function stopAllExternalAudio() {
    stopEnhancedDrums();
    stopAudioNodes();
  }

  function clearOverlayNotePart() {
    if (!state.overlayNotePart) return;
    try { state.overlayNotePart.clear(); } catch (_) {}
    try { state.overlayNotePart.dispose(); } catch (_) {}
    state.overlayNotePart = null;
  }

  function injectOverlayNotesIntoInstrumentPart() {
    const track = sm.player.instrumentTrack;
    if (!track || !track.part || !state.overlayNotes.length) return;
    state.overlayNotes.forEach((event) => {
      track.part.add(event.time * sm.toSeconds("4n") / sm.options.subdivision, event);
    });
  }

  function clearEnhancedDrumPart() {
    if (!state.enhancedDrumPart) return;
    try { state.enhancedDrumPart.clear(); } catch (_) {}
    try { state.enhancedDrumPart.dispose(); } catch (_) {}
    state.enhancedDrumPart = null;
  }

  function rebuildEnhancedDrumPart() {
    clearEnhancedDrumPart();
    if (!state.enhancedDrums.length || state.drumTrackMuted) return;
    const part = new sm.Part((time, event) => playEnhancedDrum(event, time)).start(0);
    state.enhancedDrums.forEach((event) => {
      part.add(event.time * sm.toSeconds("4n") / sm.options.subdivision, event);
    });
    state.enhancedDrumPart = part;
  }

  function rebuildOverlayNotePart() {
    clearOverlayNotePart();
    const track = sm.player.instrumentTrack;
    if (!track) return;
    if (track.__cmlOriginalSyncWithMidiTrack) track.__cmlOriginalSyncWithMidiTrack();
    else if (typeof track.syncWithMidiTrack === "function") track.syncWithMidiTrack();
    injectOverlayNotesIntoInstrumentPart();
  }

  function scheduleEnhancedDrums(delay = "+0.1", offsetSeconds = 0) {
    stopEnhancedDrums();
    if (!state.enhancedDrums.length) return;
    const ctx = drumContext();
    const delaySeconds = typeof delay === "string" ? Number(delay.replace("+", "")) || 0 : Number(delay) || 0;
    const baseTime = ctx.currentTime + delaySeconds;
    const stepSeconds = secondsPerSubBeat();
    state.enhancedDrums.forEach((event) => {
      const eventSeconds = event.time * stepSeconds;
      if (eventSeconds + 0.02 < offsetSeconds) return;
      playEnhancedDrum(event, baseTime + eventSeconds - offsetSeconds);
    });
  }

  function songMakerNow() {
    try {
      if (sm.context && typeof sm.context.now === "function") return sm.context.now();
      if (sm.context && Number.isFinite(sm.context.currentTime)) return sm.context.currentTime;
    } catch (_) {}
    return drumContext().currentTime;
  }

  function playOverlayNote(event, when, durationSeconds) {
    if (isMutedEvent(event)) return;
    const atSameTime = sm.player.instrumentTrack?.track?.getEventsAtTime
      ? sm.player.instrumentTrack.track.getEventsAtTime(event.time).length + state.overlayNotes.filter((item) => item.time === event.time).length
      : 1;
    const subBeatsPerBar = sm.player.instrumentTrack?.options?.subBeatsPerBar || ((sm.options.beats || 4) * sm.options.subdivision);
    let velocity = event.time % subBeatsPerBar === 0 ? 1 : 0.8;
    velocity = event.time % sm.options.subdivision === 0 ? velocity : velocity * 0.8;
    if (atSameTime > 9) velocity *= 0.55;
    else if (atSameTime > 4) velocity *= 0.75;
    if (!playCustomInstrumentNote(event, durationSeconds, when, velocity)) {
      sm.player.instrumentTrack.playNote(event.note, durationSeconds, when, velocity);
    }
    event.envelope = 1;
    setTimeout(() => (event.envelope = 0), Math.max(50, durationSeconds * 1000));
  }

  function patchEnhancedDrumPlayback() {
    if (sm.player.__cmlEnhancedDrumsPatched) return;
    const originalStop = sm.player.stop.bind(sm.player);
    const originalStart = sm.player.start.bind(sm.player);
    sm.player.start = function (delay = "+0.1", offsetSeconds = 0, ...args) {
      const result = originalStart(delay, offsetSeconds, ...args);
      scheduleAudioClips(delay, Number(offsetSeconds) || 0);
      return result;
    };
    sm.player.stop = function (...args) {
      stopAllExternalAudio();
      return originalStop(...args);
    };
    sm.player.__cmlEnhancedDrumsPatched = true;
  }

  function patchSaveAndHistory() {
    if (!sm.__cmlSaveAndHistoryPatched) {
      const originalChanged = sm.changed.bind(sm);
      sm.changed = function (...args) {
        const result = originalChanged(...args);
        try {
          pushUndoSnapshot();
          localStorage.setItem("cml-song-maker-mod-autosave", JSON.stringify(serializeSong()));
        } catch (err) {
          console.warn("Could not autosave Song Maker mod snapshot", err);
        }
        return result;
      };

      window.addEventListener("error", (event) => {
        const message = String(event.message || "");
        if (!/undefined|save|link/i.test(message)) return;
        const backup = localStorage.getItem("cml-song-maker-mod-autosave");
        if (!backup) return;
        try {
          applySongSnapshot(JSON.parse(backup), false);
          downloadText(`song-maker-recovery-${Date.now()}.json`, backup);
          const status = document.getElementById("cml-mod-status");
          if (status) status.textContent = "Built-in save crashed, so I restored the autosave and downloaded a JSON recovery.";
        } catch (err) {
          console.warn("Could not restore autosave after save crash", err);
        }
      });

      document.addEventListener("click", (event) => {
        const saveButton = event.target && event.target.closest && event.target.closest("#save-button, [aria-label='Save']");
        if (!saveButton) return;
        try {
          const snapshot = serializeSong();
          localStorage.setItem("cml-song-maker-mod-autosave", JSON.stringify(snapshot));
        } catch (err) {
          console.warn("Could not autosave before built-in save", err);
        }
      }, true);

      sm.__cmlSaveAndHistoryPatched = true;
    }
    pushUndoSnapshot();
  }

  function patchHeldPlayback() {
    const track = sm.player.instrumentTrack;
    const grid = sm.grid.instrument;
    if (track.__cmlHeldPlaybackPatched && grid.__cmlHeldClickPatched) return;

    if (!track.__cmlHeldPlaybackPatched) {
      track.onnote = function (time, event) {
        if (isMutedEvent(event)) return;
        const atSameTime = this.track.getEventsAtTime(event.time);
        let velocity = event.time % this.options.subBeatsPerBar === 0 ? 1 : 0.8;
        velocity = event.time % this.options.subdivision === 0 ? velocity : velocity * 0.8;
        if (atSameTime.length > 9) velocity *= 0.55;
        else if (atSameTime.length > 4) velocity *= 0.75;

        const stepSeconds = sm.toSeconds("4n") / this.options.subdivision;
        const duration = Math.max(1, Number(event.duration) || 1) * stepSeconds;
        if (!playCustomInstrumentNote(event, duration, time, velocity)) this.playNote(event.note, duration, time, velocity);
        event.envelope = 1;
        setTimeout(() => (event.envelope = 0), Math.max(50, duration * 1000));
      };

      try {
        track.part.clear();
        if (track.part.dispose) track.part.dispose();
      } catch (_) {}
      track.part = new sm.Part(track.onnote.bind(track)).start(0);
      track.__cmlHeldPlaybackPatched = true;
    }

    if (!track.__cmlOverlaySyncPatched && typeof track.syncWithMidiTrack === "function") {
      const originalTrackSync = track.syncWithMidiTrack.bind(track);
      track.__cmlOriginalSyncWithMidiTrack = originalTrackSync;
      track.syncWithMidiTrack = function (...args) {
        const result = originalTrackSync(...args);
        injectOverlayNotesIntoInstrumentPart();
        return result;
      };
      track.__cmlOverlaySyncPatched = true;
    }
    track.syncWithMidiTrack();

    if (!grid.__cmlHeldClickPatched) {
      const original = {
        has: grid.has.bind(grid),
        addNote: grid.addNote.bind(grid),
        removeNote: grid.removeNote.bind(grid),
        reset: grid.reset.bind(grid),
        onMidiTrackAdd: grid.onMidiTrackAdd.bind(grid),
        onMidiTrackRemove: grid.onMidiTrackRemove.bind(grid),
      };

      grid.has = function (point) {
        if (state.activeTrackId === "__drums") return !!enhancedDrumAt(Math.round(point.x), Math.round(point.y));
        const note = safePitchForPoint(this, point);
        return !!eventCovering(point.x, note, true);
      };

      grid.addNote = function (point) {
        if (state.activeTrackId === "__drums") {
          const time = Math.max(0, Math.round(point.x));
          const row = Math.max(0, Math.round(point.y));
          const existing = enhancedDrumAt(time, row);
          if (existing) {
            state.enhancedDrums = state.enhancedDrums.filter((event) => event !== existing);
          } else {
            const type = drumTypeForRow(row);
            state.enhancedDrums.push({
              time,
              duration: 1,
              drumRow: row,
              type,
              note: { kick: 36, snare: 38, clap: 39, rim: 37, hat: 42, openhat: 46, tom: 45, cymbal: 49, perc: 54 }[type] || 54,
              velocity: 96,
            });
            playEnhancedDrum({ type, note: { kick: 36, snare: 38, clap: 39, rim: 37, hat: 42, openhat: 46, tom: 45, cymbal: 49, perc: 54 }[type] || 54, velocity: 96 }, drumContext().currentTime);
          }
          state.enhancedDrums.sort((a, b) => a.time - b.time);
          rebuildEnhancedDrumPart();
          refreshInstrumentGrid();
          renderTracks();
          sm.changed();
          return true;
        }
        const time = Math.max(0, Math.round(point.x));
        const note = safePitchForPoint(this, point);
        const activeCovered = eventCovering(time, note, true);
        if (activeCovered) {
          removeInstrumentEvent(activeCovered);
          refreshInstrumentGrid();
          sm.player.syncWithMidiTrack();
          renderTracks();
          sm.changed();
          return true;
        }
        if (!state.heldMode) {
          const otherTrackEvent = eventCovering(time, note, false);
          if (otherTrackEvent) {
            console.warn("Song Maker cannot store the same pitch at the same time in two clips; moving that note to the active clip.");
            otherTrackEvent.__cmlTrack = currentTrack().id;
            refreshInstrumentGrid();
            sm.player.syncWithMidiTrack();
            renderTracks();
            return true;
          }
          const event = sm.midi.instrument.add(time, note, 1, true);
          if (event) event.__cmlTrack = currentTrack().id;
          if (event) auditionAddedNote(this, note, event);
          refreshInstrumentGrid();
          sm.player.syncWithMidiTrack();
          renderTracks();
          sm.changed();
          return !!event;
        }
        try {
          const existing = eventCovering(time, note, false);
          if (existing) removeInstrumentEvent(existing);
          const event = sm.midi.instrument.add(time, note, holdDurationSubBeats(), true);
          if (event) event.__cmlTrack = currentTrack().id;
          if (event) auditionAddedNote(this, note, event);
          refreshInstrumentGrid();
          sm.player.syncWithMidiTrack();
          renderTracks();
          sm.changed();
          return !!event;
        } catch (err) {
          console.error("Cannot add held note", point, err);
          return false;
        }
      };

      grid.removeNote = function (point) {
        if (state.activeTrackId === "__drums") {
          const existing = enhancedDrumAt(Math.round(point.x), Math.round(point.y));
          if (existing) {
            state.enhancedDrums = state.enhancedDrums.filter((event) => event !== existing);
            rebuildEnhancedDrumPart();
            refreshInstrumentGrid();
            renderTracks();
            sm.changed();
          }
          return !!existing;
        }
        const note = safePitchForPoint(this, point);
        const covered = eventCovering(point.x, note, true);
        if (covered) {
          const removed = removeInstrumentEvent(covered);
          refreshInstrumentGrid();
          sm.player.syncWithMidiTrack();
          renderTracks();
          sm.changed();
          return !!removed;
        }
        const result = original.removeNote(point);
        refreshInstrumentGrid();
        return result;
      };

      grid.reset = function (...args) {
        const result = original.reset(...args);
        refreshInstrumentGrid();
        return result;
      };

      grid.onMidiTrackAdd = function (...args) {
        refreshInstrumentGrid();
        return args[0];
      };

      grid.onMidiTrackRemove = function (...args) {
        refreshInstrumentGrid();
        return args[0];
      };

      grid.__cmlHeldClickPatched = true;
      grid.__cmlOriginal = original;
    }
  }

  function installLongNoteEditor() {
    const grid = sm.grid.instrument;
    const renderer = grid && grid.renderer;
    if (!grid || !renderer || !renderer.canvas || state.__cmlLongNoteEditorInstalled) return;

    state.__cmlLongNoteEditorInstalled = true;
    state.longEditMode = false;
    state.__longNotePreview = null;
    state.__longNoteDrag = null;
    state.__audioClipPreview = null;
    state.__longEditView = {
      scroll: { x: 0, y: 0 },
      tileWidth: renderer.tileWidth || 24,
      tileHeight: renderer.tileHeight || 18,
      dpi: renderer.dpi || window.devicePixelRatio || 1,
    };

    const eventDuration = (event) => Math.max(1, Math.round(Number(event.duration) || 1));
    const activeTrackId = () => (currentTrack() && currentTrack().id) || "track-1";

    function refreshEverything() {
      refreshInstrumentGrid();
      renderAudioClips();
      sm.player.syncWithMidiTrack();
      sm.changed();
      window.dispatchEvent(new Event("resize"));
    }

    function rowForPitch(pitch) {
      for (let row = 0; row < grid.notes.rows; row++) {
        try {
          if (grid.indexToPitch(row) === pitch) return row;
        } catch (_) {}
      }
      return null;
    }

    function pitchForRow(row) {
      return grid.indexToPitch(Math.max(0, Math.min(grid.notes.rows - 1, Math.round(row))));
    }

    function screenRowForGridRow(row) {
      return grid.notes.flipY ? grid.notes.flipY(row) : grid.notes.rows - row - 1;
    }

    function gridRowForScreenRow(screenRow) {
      const bounded = Math.max(0, Math.min(grid.notes.rows - 1, Math.floor(screenRow)));
      if (grid.notes.flipY) {
        for (let row = 0; row < grid.notes.rows; row++) {
          if (grid.notes.flipY(row) === bounded) return row;
        }
      }
      return grid.notes.rows - bounded - 1;
    }

    function canvasPoint(event) {
      const rect = renderer.canvas.getBoundingClientRect();
      const dpi = state.__longEditView.dpi || renderer.dpi || window.devicePixelRatio || 1;
      return { x: (event.clientX - rect.left) * dpi, y: (event.clientY - rect.top) * dpi, dpi };
    }

    function pointerToGrid(event) {
      const point = canvasPoint(event);
      const view = state.__longEditView;
      const dpi = point.dpi;
      const tileWidth = view.tileWidth || renderer.tileWidth || 24;
      const tileHeight = view.tileHeight || renderer.tileHeight || 18;
      const scrollX = ((view.scroll && view.scroll.x) || 0) * dpi;
      const scrollY = ((view.scroll && view.scroll.y) || 0) * dpi;
      const time = Math.max(0, Math.floor((point.x + scrollX) / (tileWidth * dpi)));
      const screenRow = Math.floor((point.y + scrollY) / (tileHeight * dpi));
      const row = gridRowForScreenRow(screenRow);
      return { time, row, note: pitchForRow(row) };
    }

    function eventRect(event) {
      const view = state.__longEditView;
      const dpi = view.dpi || renderer.dpi || window.devicePixelRatio || 1;
      const tileWidth = view.tileWidth || renderer.tileWidth || 24;
      const tileHeight = view.tileHeight || renderer.tileHeight || 18;
      const scrollX = ((view.scroll && view.scroll.x) || 0) * dpi;
      const scrollY = ((view.scroll && view.scroll.y) || 0) * dpi;
      const row = rowForPitch(event.note);
      if (row === null) return null;
      const x = event.time * tileWidth * dpi - scrollX;
      const y = screenRowForGridRow(row) * tileHeight * dpi - scrollY;
      const width = Math.max(tileWidth * dpi, eventDuration(event) * tileWidth * dpi);
      const height = tileHeight * dpi;
      return { x, y, width, height, right: x + width, bottom: y + height, row };
    }

    function audioLaneRow() {
      return Math.max(0, Math.min(grid.notes.rows - 1, 0));
    }

    function audioClipRect(clip) {
      const view = state.__longEditView;
      const dpi = view.dpi || renderer.dpi || window.devicePixelRatio || 1;
      const tileWidth = view.tileWidth || renderer.tileWidth || 24;
      const tileHeight = view.tileHeight || renderer.tileHeight || 18;
      const scrollX = ((view.scroll && view.scroll.x) || 0) * dpi;
      const scrollY = ((view.scroll && view.scroll.y) || 0) * dpi;
      const row = audioLaneRow();
      const x = Math.round((clip.startTime || 0) * tileWidth * dpi - scrollX);
      const y = Math.round(screenRowForGridRow(row) * tileHeight * dpi - scrollY);
      const width = Math.max(tileWidth * dpi, audioClipDurationSubBeats(clip) * tileWidth * dpi);
      const height = Math.max(tileHeight * dpi, Math.min(tileHeight * 1.55 * dpi, 28 * dpi));
      return { x, y, width, height, right: x + width, bottom: y + height, row };
    }

    function activeEvents() {
      const events = [];
      if (state.activeTrackId === "__drums") return events;
      forEachInstrumentEvent((event) => {
        if (isActiveEvent(event)) events.push(event);
      });
      forEachOverlayNote((event) => {
        if (isActiveEvent(event)) events.push(event);
      });
      return events.sort((a, b) => eventDuration(b) - eventDuration(a) || a.time - b.time);
    }

    function ghostEvents() {
      const events = [];
      if (!state.allTrackMode || state.activeTrackId === "__drums") return events;
      if (state.lowGraphics && !state.allTracksInLow) return events;
      forEachInstrumentEvent((event) => {
        if (!isActiveEvent(event)) events.push(event);
      });
      forEachOverlayNote((event) => {
        if (!isActiveEvent(event)) events.push(event);
      });
      return events.sort((a, b) => eventDuration(b) - eventDuration(a) || a.time - b.time);
    }

    function hitTest(event) {
      const point = canvasPoint(event);
      const edgePixels = 10 * point.dpi;
      for (const noteEvent of activeEvents()) {
        const rect = eventRect(noteEvent);
        if (!rect) continue;
        if (point.x < rect.x || point.x > rect.right || point.y < rect.y || point.y > rect.bottom) continue;
        const leftEdge = Math.abs(point.x - rect.x) <= edgePixels;
        const rightEdge = Math.abs(point.x - rect.right) <= edgePixels;
        return { event: noteEvent, rect, edge: leftEdge ? "left" : rightEdge ? "right" : null };
      }
      return null;
    }

    function audioHitTest(event) {
      const point = canvasPoint(event);
      const edgePixels = 10 * point.dpi;
      const clips = [...state.audioClips].sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
      for (const clip of clips) {
        const rect = audioClipRect(clip);
        if (point.x < rect.x || point.x > rect.right || point.y < rect.y || point.y > rect.bottom) continue;
        const leftEdge = Math.abs(point.x - rect.x) <= edgePixels;
        const rightEdge = Math.abs(point.x - rect.right) <= edgePixels;
        return { clip, rect, edge: leftEdge ? "left" : rightEdge ? "right" : null };
      }
      return null;
    }

    function removeEvent(event) {
      if (!removeInstrumentEvent(event)) {
        console.warn("Could not remove event", event);
      }
    }

    function addEvent(time, note, duration, trackId) {
      const event = sm.midi.instrument.add(Math.max(0, Math.round(time)), note, Math.max(1, Math.round(duration)), false);
      if (event) event.__cmlTrack = trackId || activeTrackId();
      return event;
    }

    function activeConflict(time, note) {
      let found = null;
      forEachInstrumentEvent((event) => {
        if (isActiveEvent(event) && event.note === note && time >= event.time && time < event.time + eventDuration(event)) found = event;
      });
      forEachOverlayNote((event) => {
        if (isActiveEvent(event) && event.note === note && time >= event.time && time < event.time + eventDuration(event)) found = event;
      });
      return found;
    }

    function drawRect(ctx, rect, color, alpha = 0.75, handle = true) {
      const dpi = state.__longEditView.dpi || renderer.dpi || window.devicePixelRatio || 1;
      const radius = 4 * dpi;
      const x = rect.x + dpi;
      const y = rect.y + dpi;
      const width = Math.max(1, rect.width - 2 * dpi);
      const height = Math.max(1, rect.height - 2 * dpi);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = Math.max(1, dpi);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (handle && width > 10 * dpi) {
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.fillRect(x + width - 5 * dpi, y + 3 * dpi, 2 * dpi, height - 6 * dpi);
        ctx.fillRect(x + width - 9 * dpi, y + 3 * dpi, 2 * dpi, height - 6 * dpi);
      }
      ctx.restore();
    }

    function drawGhostRect(ctx, rect, color) {
      const dpi = state.__longEditView.dpi || renderer.dpi || window.devicePixelRatio || 1;
      const x = rect.x + 2 * dpi;
      const y = rect.y + 2 * dpi;
      const width = Math.max(1, rect.width - 4 * dpi);
      const height = Math.max(1, rect.height - 4 * dpi);
      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = color || "#111";
      ctx.fillRect(x, y, width, height);
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = Math.max(1, dpi);
      ctx.strokeRect(x + 0.5 * dpi, y + 0.5 * dpi, Math.max(1, width - dpi), Math.max(1, height - dpi));
      ctx.restore();
    }

    function drawAudioClipBlock(ctx, clip, previewRect = null) {
      const rect = previewRect || audioClipRect(clip);
      const dpi = state.__longEditView.dpi || renderer.dpi || window.devicePixelRatio || 1;
      const active = clip.id === state.selectedAudioClipId;
      const x = rect.x + dpi;
      const y = rect.y + dpi;
      const width = Math.max(2 * dpi, rect.width - 2 * dpi);
      const height = Math.max(2 * dpi, rect.height - 2 * dpi);
      ctx.save();
      ctx.globalAlpha = clip.muted ? 0.38 : 0.86;
      ctx.fillStyle = active ? "#f4a806" : "#11a8e8";
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = Math.max(1, dpi);
      ctx.beginPath();
      ctx.roundRect?.(x, y, width, height, 4 * dpi);
      if (!ctx.roundRect) ctx.rect(x, y, width, height);
      ctx.fill();
      ctx.stroke();
      if (clip.buffer) {
        const data = clip.buffer.getChannelData(0);
        const start = Math.floor((clip.offsetSeconds || 0) * clip.buffer.sampleRate);
        const length = Math.max(1, Math.floor((clip.lengthSeconds || clip.buffer.duration) * clip.buffer.sampleRate));
        const end = Math.min(data.length, start + length);
        const columns = Math.max(8, Math.min(180, Math.floor(width / (2 * dpi))));
        const step = Math.max(1, Math.floor((end - start) / columns));
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = active ? "#fff7d6" : "#e8fbff";
        ctx.beginPath();
        for (let i = 0; i < columns; i++) {
          let min = 1;
          let max = -1;
          const sampleStart = start + i * step;
          for (let j = sampleStart; j < Math.min(end, sampleStart + step); j++) {
            const value = data[j] || 0;
            if (value < min) min = value;
            if (value > max) max = value;
          }
          const sx = x + (i / Math.max(1, columns - 1)) * width;
          const mid = y + height / 2;
          ctx.moveTo(sx, mid + min * height * 0.42);
          ctx.lineTo(sx, mid + max * height * 0.42);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x, y, Math.min(width, 44 * dpi), 14 * dpi);
      ctx.fillStyle = "#fff";
      ctx.font = `${Math.max(9, 10 * dpi)}px Arial`;
      ctx.fillText("AUDIO", x + 5 * dpi, y + 10 * dpi);
      if (width > 18 * dpi) {
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.fillRect(x + 4 * dpi, y + 4 * dpi, 2 * dpi, height - 8 * dpi);
        ctx.fillRect(x + width - 6 * dpi, y + 4 * dpi, 2 * dpi, height - 8 * dpi);
      }
      ctx.restore();
    }

    function drawLongNotes(rendererInstance, notes, _pointer, scroll) {
      if (!rendererInstance || !rendererInstance.context || !notes) return false;
      state.__longEditView = {
        scroll: scroll || { x: 0, y: 0 },
        tileWidth: rendererInstance.tileWidth || renderer.tileWidth || 24,
        tileHeight: rendererInstance.tileHeight || renderer.tileHeight || 18,
        dpi: rendererInstance.dpi || renderer.dpi || window.devicePixelRatio || 1,
      };
      if (!state.lowGraphics) requestAnimationFrame(renderAudioGridLayer);
      if (state.activeTrackId === "__drums") return false;
      const shouldDrawGhosts = !state.lowGraphics || (state.allTrackMode && state.allTracksInLow);
      if (shouldDrawGhosts) {
        ghostEvents().forEach((event) => {
          const rect = eventRect(event);
          if (!rect) return;
          const track = state.tracks.find((item) => item.id === (event.__cmlTrack || "track-1"));
          drawGhostRect(rendererInstance.context, rect, track?.color || "#111");
        });
      }
      const color = (currentTrack() && currentTrack().color) || "#16a8f0";
      if (!state.lowGraphics) {
        activeEvents().forEach((event) => {
          if (eventDuration(event) <= 1) return;
          const rect = eventRect(event);
          if (rect) drawRect(rendererInstance.context, rect, color, 0.72, true);
        });
      }
      if (state.__longNotePreview) {
        const rect = eventRect(state.__longNotePreview);
        if (rect) drawRect(rendererInstance.context, rect, "#f4a806", state.lowGraphics ? 0.68 : 0.48, false);
      }
      return false;
    }

    if (!renderer.__cmlLongNoteRendererPatched && typeof renderer.registerDrawMethod === "function") {
      renderer.registerDrawMethod(drawLongNotes);
      renderer.__cmlLongNoteRendererPatched = true;
    }

    const button = document.getElementById("cml-long-edit-mode");
    if (button && !button.__cmlLongEditWired) {
      const status = document.getElementById("cml-mod-status");
      button.onclick = () => {
        state.longEditMode = !state.longEditMode;
        button.textContent = state.longEditMode ? "Long Edit: On" : "Long Edit: Off";
        button.classList.toggle("active", state.longEditMode);
        if (status) status.textContent = state.longEditMode
          ? "Long Edit on: drag notes or audio blocks, drag edges to trim, double-click audio to chop."
          : "Long Edit off.";
        window.dispatchEvent(new Event("resize"));
      };
      button.__cmlLongEditWired = true;
    }

    function beginDrag(event) {
      if (!state.longEditMode || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const point = pointerToGrid(event);
      const hit = hitTest(event);
      const trackId = activeTrackId();
      const status = document.getElementById("cml-mod-status");

      if (state.activeTrackId === "__drums") return;

      if (hit && hit.edge) {
        const duration = eventDuration(hit.event);
        state.__longNoteDrag = {
          mode: "resize",
          edge: hit.edge,
          removed: { time: hit.event.time, note: hit.event.note, duration, trackId: hit.event.__cmlTrack || trackId },
          originalStart: hit.event.time,
          originalEnd: hit.event.time + duration - 1,
        };
        removeEvent(hit.event);
        state.__longNotePreview = { time: state.__longNoteDrag.removed.time, note: state.__longNoteDrag.removed.note, duration };
        refreshEverything();
        if (status) status.textContent = "Resizing held note. Release to apply.";
        return;
      }

      if (hit) {
        const duration = eventDuration(hit.event);
        const row = rowForPitch(hit.event.note) ?? point.row;
        state.__longNoteDrag = {
          mode: "move",
          removed: { time: hit.event.time, note: hit.event.note, duration, trackId: hit.event.__cmlTrack || trackId },
          grabOffset: Math.max(0, point.time - hit.event.time),
          grabRowOffset: point.row - row,
        };
        removeEvent(hit.event);
        state.__longNotePreview = { time: Math.max(0, point.time - state.__longNoteDrag.grabOffset), note: hit.event.note, duration };
        refreshEverything();
        if (status) status.textContent = "Moving held note. Release to place it.";
        return;
      }

      const existing = activeConflict(point.time, point.note);
      if (existing) removeEvent(existing);
      state.__longNoteDrag = { mode: "create", startTime: point.time, note: point.note, trackId };
      state.__longNotePreview = { time: point.time, note: point.note, duration: 1 };
      if (status) status.textContent = "Creating held note. Drag, then release.";
      window.dispatchEvent(new Event("resize"));
    }

    function updateDrag(event) {
      const drag = state.__longNoteDrag;
      if (!drag) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const point = pointerToGrid(event);

      if (drag.mode === "create") {
        const start = Math.min(drag.startTime, point.time);
        const end = Math.max(drag.startTime, point.time);
        state.__longNotePreview = { time: start, note: drag.note, duration: Math.max(1, end - start + 1) };
      } else if (drag.mode === "resize") {
        let start = drag.originalStart;
        let end = drag.originalEnd;
        if (drag.edge === "left") start = Math.max(0, Math.min(point.time, drag.originalEnd));
        else end = Math.max(drag.originalStart, point.time);
        state.__longNotePreview = { time: start, note: drag.removed.note, duration: Math.max(1, end - start + 1) };
      } else if (drag.mode === "move") {
        const targetRow = Math.max(0, Math.min(grid.notes.rows - 1, point.row - drag.grabRowOffset));
        state.__longNotePreview = {
          time: Math.max(0, point.time - drag.grabOffset),
          note: pitchForRow(targetRow),
          duration: drag.removed.duration,
        };
      } else if (drag.mode === "audio") {
        const clip = drag.clip;
        const start = Math.round(clip.startTime || 0);
        let previewStart = start;
        let previewLength = Math.max(1, audioClipDurationSubBeats(clip));
        if (drag.edge === "right") {
          const end = Math.max(drag.originalStart + 1, point.time + 1);
          previewLength = Math.max(1, end - drag.originalStart);
          clip.startTime = drag.originalStart;
          clip.lengthSeconds = previewLength * secondsPerSubBeat();
        } else if (drag.edge === "left") {
          const nextStart = Math.max(0, Math.min(point.time, drag.originalEnd - 1));
          const secondsDelta = (nextStart - drag.originalStart) * secondsPerSubBeat();
          clip.startTime = nextStart;
          clip.offsetSeconds = Math.max(0, drag.originalOffset + secondsDelta);
          clip.lengthSeconds = Math.max(0.02, drag.originalLength - secondsDelta);
          previewStart = clip.startTime;
          previewLength = audioClipDurationSubBeats(clip);
        } else {
          clip.startTime = Math.max(0, point.time - drag.grabOffset);
          previewStart = clip.startTime;
        }
        state.__audioClipPreview = { clip, rect: audioClipRect({ ...clip, startTime: previewStart, lengthSeconds: previewLength * secondsPerSubBeat() }) };
      }
      window.dispatchEvent(new Event("resize"));
    }

    function endDrag(event) {
      const drag = state.__longNoteDrag;
      if (!drag) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (drag.mode === "audio") {
        touchAudioClip(drag.clip);
        state.__audioClipPreview = null;
        state.__longNoteDrag = null;
        window.dispatchEvent(new Event("resize"));
        const status = document.getElementById("cml-mod-status");
        if (status) status.textContent = "Audio clip edit applied.";
        return;
      }
      const preview = state.__longNotePreview;
      if (preview) {
        if (drag.mode !== "resize") {
          const conflict = activeConflict(preview.time, preview.note);
          if (conflict) removeEvent(conflict);
        }
        addEvent(preview.time, preview.note, preview.duration, drag.trackId || drag.removed?.trackId);
      }
      state.__longNotePreview = null;
      state.__longNoteDrag = null;
      refreshEverything();
      const status = document.getElementById("cml-mod-status");
      if (status) status.textContent = "Long note edit applied.";
    }

    function cancelDrag() {
      const drag = state.__longNoteDrag;
      if (drag && drag.removed) addEvent(drag.removed.time, drag.removed.note, drag.removed.duration, drag.removed.trackId);
      if (drag && drag.mode === "audio" && drag.clip) {
        drag.clip.startTime = drag.originalStart;
        drag.clip.offsetSeconds = drag.originalOffset;
        drag.clip.lengthSeconds = drag.originalLength;
      }
      state.__audioClipPreview = null;
      state.__longNotePreview = null;
      state.__longNoteDrag = null;
      refreshEverything();
    }

    function deleteOnDoubleClick(event) {
      if (!state.longEditMode) return;
      if (state.activeTrackId === "__drums") return;
      const hit = hitTest(event);
      if (!hit) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      removeEvent(hit.event);
      refreshEverything();
      const status = document.getElementById("cml-mod-status");
      if (status) status.textContent = "Deleted held note.";
    }

    renderer.canvas.addEventListener("mousedown", beginDrag, true);
    window.addEventListener("mousemove", updateDrag, true);
    window.addEventListener("mouseup", endDrag, true);
    window.addEventListener("blur", cancelDrag, true);
    renderer.canvas.addEventListener("dblclick", deleteOnDoubleClick, true);
  }

  function numberValue(id, fallback) {
    const value = Number(document.getElementById(id).value);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  function toggleHeldMode() {
    patchHeldPlayback();
    state.heldMode = !state.heldMode;
    const button = document.getElementById("cml-held-mode");
    button.classList.toggle("active", state.heldMode);
    return state.heldMode ? "Held note mode on. Click grid cells to place held notes." : "Held note mode off.";
  }

  function applySettings() {
    patchHeldPlayback();
    const lower = Math.max(0, Math.round(numberValue("cml-lower-octaves", 0)));
    const upper = Math.max(1, Math.round(numberValue("cml-upper-octaves", sm.options.octaves)));
    const subdivision = Math.max(1, Math.round(numberValue("cml-subdivision", sm.options.subdivision || 2)));
    const rootNote = Math.max(0, state.baseRootNote - lower * 12);
    const topNoteExclusive = state.baseRootNote + upper * 12;
    const octaves = Math.max(1, Math.ceil((topNoteExclusive - rootNote) / 12));
    const next = fitOptionsToExistingNotes({
      ...sm.options.toJSON(),
      bars: Math.max(1, Math.round(numberValue("cml-bars", sm.options.bars))),
      subdivision,
      rootNote,
      octaves,
    });
    applyOptionsNoMorph(next);
  }

  function unsmush() {
    document.getElementById("cml-bars").value = Math.max(4, Number(document.getElementById("cml-bars").value) || 4);
    document.getElementById("cml-upper-octaves").value = Math.max(2, Number(document.getElementById("cml-upper-octaves").value) || 2);
    applySettings();
    return "Unsmushed: set at least 4 bars and 2 octaves up.";
  }

  function setCleanMode(enabled) {
    state.cleanMode = !!enabled;
    document.body.classList.toggle("cml-clean-mode", state.cleanMode);
    renderTracks();
    requestAnimationFrame(renderAudioGridLayer);
  }

  function toggleCleanMode() {
    setCleanMode(!state.cleanMode);
    const status = document.getElementById("cml-mod-status");
    if (status) status.textContent = state.cleanMode ? "Clean mode on. Press Y to bring menus back." : "Clean mode off.";
  }

  function setAllTrackMode(enabled) {
    state.allTrackMode = !!enabled;
    const button = document.getElementById("cml-all-tracks");
    if (button) {
      button.textContent = state.allTrackMode ? "Show Other Clips: On" : "Show Other Clips: Off";
      button.title = "Show notes from other clips as pale reference notes while editing the active clip.";
      button.classList.toggle("active", state.allTrackMode);
    }
    window.dispatchEvent(new Event("resize"));
    const status = document.getElementById("cml-mod-status");
    if (status) status.textContent = state.allTrackMode
      ? "All Tracks on: other clips show as pale reference notes."
      : "All Tracks off.";
  }

  function toggleAllTrackMode() {
    setAllTrackMode(!state.allTrackMode);
  }

  function setAllTracksInLow(enabled) {
    state.allTracksInLow = !!enabled;
    const button = document.getElementById("cml-all-tracks-low");
    if (button) {
      button.textContent = state.allTracksInLow ? "Show in Low Mode: On" : "Show in Low Mode: Off";
      button.title = "Keep other-clip reference notes visible when Low or Extra Low graphics mode is enabled.";
      button.classList.toggle("active", state.allTracksInLow);
    }
    window.dispatchEvent(new Event("resize"));
    const status = document.getElementById("cml-mod-status");
    if (status) status.textContent = state.allTracksInLow
      ? "All Tracks can show while Low or Extra Low is on."
      : "All Tracks hidden while Low or Extra Low is on.";
  }

  function toggleAllTracksInLow() {
    setAllTracksInLow(!state.allTracksInLow);
  }

  function patchGridAnimations() {
    [sm.grid.instrument, sm.grid.percussion].forEach((grid) => {
      if (!grid || typeof grid.animateNotes !== "function" || grid.__cmlAnimateNotesPatched) return;
      grid.__cmlOriginalAnimateNotes = grid.animateNotes.bind(grid);
      grid.animateNotes = function patchedAnimateNotes(position) {
        if (state.extraLowGraphics) {
          if (this.beatsState && this.beatsState[position]) this.beatsState[position].on = 0;
          return;
        }
        return this.__cmlOriginalAnimateNotes(position);
      };
      grid.__cmlAnimateNotesPatched = true;
    });
  }

  function patchDarkModeCanvas() {
    [sm.grid.instrument, sm.grid.percussion].forEach((grid) => {
      const renderer = grid && grid.renderer;
      if (!renderer || renderer.__cmlDarkModeCanvasPatched) return;
      const ctx = renderer.context;
      if (ctx && !ctx.__cmlDarkBackgroundFillPatched && typeof ctx.fillRect === "function") {
        ctx.__cmlOriginalFillRect = ctx.fillRect.bind(ctx);
        ctx.fillRect = function patchedFillRect(x, y, width, height) {
          const activeRenderer = this.__cmlDarkModeRenderer;
          const fullWidth = activeRenderer ? activeRenderer.width * activeRenderer.dpi : this.canvas?.width || 0;
          const fullHeight = activeRenderer ? activeRenderer.height * activeRenderer.dpi : this.canvas?.height || 0;
          const isFullCanvasFill = activeRenderer && x <= 0 && y <= 0 && width >= fullWidth * 0.98 && height >= fullHeight * 0.98;
          if (state.darkMode && isFullCanvasFill && !this.__cmlDarkModeBackgroundFilled) {
            this.__cmlDarkModeBackgroundFilled = true;
            const previousFill = this.fillStyle;
            this.fillStyle = "#2b3038";
            this.__cmlOriginalFillRect(x, y, width, height);
            this.fillStyle = previousFill;
            return;
          }
          return this.__cmlOriginalFillRect(x, y, width, height);
        };
        ctx.__cmlDarkBackgroundFillPatched = true;
      }

      if (typeof renderer.draw === "function") {
        renderer.__cmlOriginalDarkModeDraw = renderer.draw.bind(renderer);
        renderer.draw = function patchedDarkModeDraw(...args) {
          const context = this.context;
          const previous = context && context.__cmlDarkModeRenderer;
          if (context) context.__cmlDarkModeRenderer = this;
          if (context) context.__cmlDarkModeBackgroundFilled = false;
          try {
            return this.__cmlOriginalDarkModeDraw(...args);
          } finally {
            if (context) context.__cmlDarkModeRenderer = previous || null;
            if (context) context.__cmlDarkModeBackgroundFilled = false;
          }
        };
      }

      if (typeof renderer.drawBars === "function") {
        renderer.__cmlOriginalDrawBars = renderer.drawBars.bind(renderer);
        renderer.drawBars = function patchedDarkModeBars(notes, scroll) {
          if (!state.darkMode) return this.__cmlOriginalDrawBars(notes, scroll);
          const groupWidthInCells = notes.cols / this.groupCols;
          const start = Math.floor(this.bounds.xMin / groupWidthInCells) * groupWidthInCells;
          const width = this.tileWidth * groupWidthInCells * this.dpi;
          this.context.fillStyle = "#343a44";
          for (let col = start; col < this.bounds.xMax; col += groupWidthInCells) {
            if ((col / groupWidthInCells) % 2 < 1) {
              this.context.fillRect(col * this.tileWidth * this.dpi - scroll.x * this.dpi, 0, width, this.height * this.dpi);
            }
          }
        };
      }

      if (typeof renderer.drawGrid === "function") {
        renderer.__cmlOriginalDrawGrid = renderer.drawGrid.bind(renderer);
        renderer.drawGrid = function patchedDarkModeGrid(notes, scroll) {
          if (!state.darkMode) return this.__cmlOriginalDrawGrid(notes, scroll);
          if (this.tileHeight > 5) {
            for (let row = this.bounds.yMin + 1; row < this.bounds.yMax; row++) {
              let thickness = 1;
              const isGroupLine = (notes.rows - this.groupRows === 1 ? row - 1 : row) % this.groupRows === 0 && notes.rows > this.groupRows + 1;
              if (isGroupLine) thickness = 3;
              if (this.isEmbed) thickness = 0.5;
              this.context.fillStyle = isGroupLine ? "#56616f" : "#434c59";
              this.context.fillRect(0, row * this.tileHeight * this.dpi - scroll.y * this.dpi, this.width * this.dpi, thickness * this.dpi);
            }
          }
          for (let col = this.bounds.xMin + 1; col < this.bounds.xMax; col++) {
            const isBeatLine = this.subdivision > 1 && col % this.subdivision === 0;
            this.context.fillStyle = isBeatLine ? "#596575" : "#3d4550";
            const thickness = this.isEmbed ? 0.5 : 1;
            this.context.fillRect(col * this.tileWidth * this.dpi - scroll.x * this.dpi, 0, thickness * this.dpi, this.height * this.dpi);
          }
        };
      }

      renderer.__cmlDarkModeCanvasPatched = true;
    });
  }

  function updateGraphicsButtons() {
    const lowButton = document.getElementById("cml-low-graphics");
    const extraButton = document.getElementById("cml-extra-low-graphics");
    if (lowButton) {
      lowButton.textContent = state.lowGraphics ? "Low: On" : "Low: Off";
      lowButton.classList.toggle("active", state.lowGraphics && !state.extraLowGraphics);
    }
    if (extraButton) {
      extraButton.textContent = state.extraLowGraphics ? "Extra Low: On" : "Extra Low";
      extraButton.classList.toggle("active", state.extraLowGraphics);
    }
  }

  function setLowGraphicsMode(enabled) {
    state.lowGraphics = !!enabled;
    if (!state.lowGraphics) state.extraLowGraphics = false;
    document.body.classList.toggle("cml-low-graphics", state.lowGraphics);
    document.body.classList.toggle("cml-extra-low-graphics", state.extraLowGraphics);
    updateGraphicsButtons();
    refreshInstrumentGrid();
    renderAudioGridLayer();
    const status = document.getElementById("cml-mod-status");
    if (status) status.textContent = state.lowGraphics
      ? "Low graphics on: extra overlays are hidden for smoother large projects."
      : "Low graphics off.";
  }

  function toggleLowGraphicsMode() {
    setLowGraphicsMode(!state.lowGraphics);
  }

  function setExtraLowGraphicsMode(enabled) {
    const next = !!enabled;
    if (next && !state.extraLowGraphics) state.lowBeforeExtraLow = !!state.lowGraphics;
    state.extraLowGraphics = next;
    if (state.extraLowGraphics) state.lowGraphics = true;
    else state.lowGraphics = !!state.lowBeforeExtraLow;
    document.body.classList.toggle("cml-low-graphics", state.lowGraphics);
    document.body.classList.toggle("cml-extra-low-graphics", state.extraLowGraphics);
    patchGridAnimations();
    updateGraphicsButtons();
    refreshInstrumentGrid();
    renderAudioGridLayer();
    const status = document.getElementById("cml-mod-status");
    if (status) status.textContent = state.extraLowGraphics
      ? "Extra low graphics on: overlays and note-pass flashing are disabled."
      : "Extra low graphics off.";
  }

  function toggleExtraLowGraphicsMode() {
    setExtraLowGraphicsMode(!state.extraLowGraphics);
  }

  function updateDarkModeButton() {
    const button = document.getElementById("cml-dark-mode");
    if (!button) return;
    button.textContent = state.darkMode ? "Dark: On" : "Dark: Off";
    button.classList.toggle("active", state.darkMode);
  }

  function markDarkModeSurfaces() {
    document.querySelectorAll(".cml-song-bottom-surface").forEach((element) => {
      element.classList.remove("cml-song-bottom-surface");
    });
    const viewportHeight = window.innerHeight || 0;
    const viewportWidth = window.innerWidth || 0;
    document.body.querySelectorAll("body > *").forEach((element) => {
      if (!element || !element.getBoundingClientRect) return;
      if (["cml-mod-menu", "cml-top-tools", "cml-audio-grid-layer", "cml-mod-style"].includes(element.id)) return;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const looksLikeBottomBar =
        rect.width > viewportWidth * 0.45 &&
        rect.height >= 54 &&
        rect.bottom >= viewportHeight - 6 &&
        rect.top >= viewportHeight * 0.58 &&
        ["fixed", "absolute", "sticky"].includes(style.position);
      if (looksLikeBottomBar) element.classList.add("cml-song-bottom-surface");
    });
  }

  function setDarkMode(enabled) {
    state.darkMode = !!enabled;
    markDarkModeSurfaces();
    patchDarkModeCanvas();
    document.body.classList.toggle("cml-dark-mode", state.darkMode);
    updateDarkModeButton();
    window.dispatchEvent(new Event("resize"));
    const status = document.getElementById("cml-mod-status");
    if (status) status.textContent = state.darkMode
      ? "Dark mode on."
      : "Dark mode off.";
  }

  function toggleDarkMode() {
    setDarkMode(!state.darkMode);
  }

  document.getElementById("cml-mod-menu")?.remove();
  document.getElementById("cml-top-tools")?.remove();
  document.getElementById("cml-bottom-tools")?.remove();
  document.getElementById("cml-audio-grid-layer")?.remove();
  document.getElementById("cml-mod-style")?.remove();
  const style = document.createElement("style");
  style.id = "cml-mod-style";
  style.textContent = `
    #cml-mod-menu {
      position: fixed;
      z-index: 2147483647;
      top: 14px;
      right: 14px;
      width: 250px;
      padding: 12px;
      background: #111;
      color: #fff;
      border: 2px solid #16a8f0;
      border-radius: 8px;
      font: 13px/1.35 Arial, sans-serif;
      box-shadow: 0 10px 35px rgba(0,0,0,.35);
    }
    #cml-mod-menu h2 {
      margin: 0 0 10px;
      font-size: 16px;
      font-weight: 700;
    }
    #cml-mod-menu label {
      display: grid;
      grid-template-columns: 1fr 82px;
      gap: 8px;
      align-items: center;
      margin: 8px 0;
    }
    #cml-mod-menu input {
      width: 82px;
      box-sizing: border-box;
      padding: 5px;
      border-radius: 4px;
      border: 1px solid #777;
      background: #fff;
      color: #111;
    }
    #cml-mod-menu .row {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }
    #cml-mod-menu button {
      flex: 1;
      cursor: pointer;
      border: 0;
      border-radius: 5px;
      padding: 8px;
      color: #fff;
      background: #16a8f0;
      font-weight: 700;
    }
    #cml-mod-menu button.close {
      flex: 0 0 36px;
      background: #444;
    }
    #cml-mod-menu button.active {
      background: #f4a806;
      color: #111;
    }
    #cml-track-list {
      display: grid;
      gap: 6px;
      margin-top: 10px;
      max-height: 210px;
      overflow: auto;
    }
    #cml-floating-track-list {
      display: none;
      gap: 6px;
      align-items: center;
      max-width: min(520px, calc(100vw - 170px));
      overflow: auto;
      padding: 3px;
      background: rgba(255,255,255,0.92);
      border-radius: 8px;
      box-shadow: 0 4px 18px rgba(0,0,0,0.18);
    }
    #cml-mod-menu .cml-track-row,
    #cml-floating-track-list .cml-track-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 62px;
      gap: 6px;
      flex: 0 0 190px;
    }
    #cml-floating-track-list .cml-track-row {
      flex: 0 0 min(260px, calc(100vw - 280px));
    }
    #cml-mod-menu .cml-track-row[data-active="true"] .cml-track-pick,
    #cml-floating-track-list .cml-track-row[data-active="true"] .cml-track-pick {
      outline: 2px solid #fff;
    }
    #cml-mod-menu .cml-track-pick,
    #cml-floating-track-list .cml-track-pick {
      background: var(--track);
      color: #111;
      text-align: left;
      border-radius: 5px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #cml-mod-menu .cml-track-mute,
    #cml-floating-track-list .cml-track-mute {
      background: #444;
      padding-left: 4px;
      padding-right: 4px;
      border-radius: 5px;
    }
    #cml-mod-menu .cml-track-mute.active,
    #cml-floating-track-list .cml-track-mute.active {
      background: #ef4444;
      color: #fff;
    }
    #cml-audio-clip-list {
      display: grid;
      gap: 4px;
      max-height: 78px;
      overflow: auto;
      margin-top: 8px;
    }
    #cml-audio-clip-list .cml-empty-audio {
      color: #aaa;
      font-size: 12px;
      padding: 6px 0;
    }
    #cml-audio-clip-list .cml-audio-clip {
      border: 1px solid #333;
      border-radius: 6px;
      background: #161616;
      padding: 4px;
    }
    #cml-audio-clip-list .cml-audio-clip[data-active="true"] {
      border-color: #f4a806;
      box-shadow: 0 0 0 1px #f4a806 inset;
    }
    #cml-audio-clip-list .cml-audio-head,
    #cml-audio-clip-list .cml-audio-actions,
    #cml-audio-clip-list .cml-audio-fields {
      display: grid;
      grid-template-columns: 1fr 56px;
      gap: 4px;
      margin-bottom: 0;
    }
    #cml-audio-clip-list .cml-audio-actions {
      grid-template-columns: repeat(3, 1fr);
      margin: 5px 0 0;
    }
    #cml-audio-clip-list .cml-audio-fields {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    #cml-audio-clip-list button {
      padding: 4px;
      font-size: 11px;
    }
    #cml-audio-clip-list .cml-audio-select {
      display: grid;
      gap: 1px;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #cml-audio-clip-list .cml-audio-select span,
    #cml-audio-clip-list .cml-audio-select small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #cml-audio-clip-list .cml-audio-select small {
      color: rgba(255,255,255,0.82);
      font-size: 9px;
      font-weight: 400;
    }
    #cml-audio-clip-list .cml-audio-fields label {
      display: grid;
      grid-template-columns: 38px 1fr;
      gap: 4px;
      align-items: center;
      margin: 0;
      font-size: 11px;
    }
    #cml-audio-clip-list .cml-audio-fields input {
      width: 100%;
      padding: 3px;
      font-size: 11px;
    }
    #cml-audio-clip-list .cml-audio-wave {
      width: 100%;
      height: 38px;
      display: block;
      border-radius: 4px;
      background: #101820;
      cursor: grab;
      touch-action: none;
      user-select: none;
    }
    #cml-audio-clip-list .cml-audio-wave:active {
      cursor: grabbing;
    }
    #cml-audio-grid-layer {
      position: fixed;
      z-index: 2147483645;
      pointer-events: none;
      overflow: hidden;
    }
    #cml-audio-grid-layer .cml-audio-grid-block {
      position: absolute;
      min-width: 22px;
      border: 2px solid rgba(255,255,255,0.95);
      border-radius: 6px;
      background: var(--clip-color, #16a8f0);
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      color: #fff;
      cursor: grab;
      pointer-events: auto;
      touch-action: none;
      user-select: none;
      overflow: hidden;
    }
    #cml-audio-grid-layer .cml-audio-grid-block[data-active="true"],
    #cml-audio-grid-layer .cml-audio-grid-block.editing {
      background: #f4a806;
      box-shadow: 0 0 0 2px rgba(0,0,0,0.25), 0 3px 10px rgba(0,0,0,0.32);
    }
    #cml-audio-grid-layer .cml-audio-grid-title {
      position: absolute;
      left: 12px;
      top: 3px;
      z-index: 2;
      font: 700 10px/1 Arial, sans-serif;
      text-shadow: 0 1px 2px rgba(0,0,0,0.55);
    }
    #cml-audio-grid-layer .cml-audio-grid-wave {
      position: absolute;
      inset: 7px 12px 5px;
      opacity: 0.7;
      background:
        repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0 4px, transparent 4px 8px),
        linear-gradient(180deg, transparent 42%, rgba(255,255,255,0.9) 42% 58%, transparent 58%);
    }
    #cml-audio-grid-layer .cml-audio-grid-handle {
      position: absolute;
      top: 0;
      bottom: 0;
      z-index: 3;
      width: 12px;
      background: rgba(255,255,255,0.22);
      cursor: ew-resize;
    }
    #cml-audio-grid-layer .cml-audio-grid-handle.left {
      left: 0;
      border-right: 1px solid rgba(255,255,255,0.7);
    }
    #cml-audio-grid-layer .cml-audio-grid-handle.right {
      right: 0;
      border-left: 1px solid rgba(255,255,255,0.7);
    }
    #cml-top-tools {
      position: fixed;
      z-index: 2147483646;
      top: 31px;
      left: 125px;
      display: flex;
      gap: 4px;
      align-items: center;
      pointer-events: auto;
      font: 9px/1.1 Arial, sans-serif;
      max-width: calc(100vw - 520px);
      overflow: visible;
    }
    #cml-top-tools button {
      cursor: pointer;
      border: 0;
      border-radius: 999px;
      padding: 4px 6px;
      color: #fff;
      background: #1daeea;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(0,0,0,.14);
      white-space: nowrap;
    }
    #cml-top-tools #cml-delete-current,
    #cml-top-tools #cml-reset-all,
    #cml-top-tools #cml-export-json {
      background: #ef4444;
    }
    #cml-mod-menu .cml-section-tabs {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 4px;
      margin: 7px 0 8px;
    }
    #cml-mod-menu .cml-section-tabs button {
      padding: 6px 4px;
      font-size: 10px;
      border-radius: 5px;
      background: #333;
    }
    #cml-mod-menu .cml-section-tabs button.active {
      background: #1daeea;
      color: #fff;
    }
    #cml-mod-menu .cml-section {
      display: none;
    }
    #cml-mod-menu .cml-section.active {
      display: block;
    }
    #cml-top-tools #cml-floating-track-list button {
      cursor: pointer;
      border: 0;
      border-radius: 5px;
      padding: 8px;
      color: #fff;
      font: 700 13px/1.35 Arial, sans-serif;
      box-shadow: none;
      white-space: nowrap;
    }
    #cml-top-tools #cml-floating-track-list .cml-track-pick {
      color: #111;
      background: var(--track);
      text-align: left;
    }
    #cml-top-tools #cml-floating-track-list .cml-track-mute {
      background: #444;
    }
    #cml-top-tools #cml-floating-track-list .cml-track-mute.active {
      background: #ef4444;
      color: #fff;
    }
    #cml-top-tools #cml-floating-track-list .cml-track-nav {
      flex: 0 0 30px;
      width: 30px;
      height: 30px;
      padding: 0;
      border-radius: 999px;
      background: #1daeea;
      color: #fff;
      font: 700 16px/1 Arial, sans-serif;
    }
    #cml-floating-track-list .cml-track-slide-count {
      flex: 0 0 auto;
      color: #222;
      font: 700 11px/1 Arial, sans-serif;
      min-width: 34px;
      text-align: center;
    }
    body.cml-clean-mode #cml-mod-menu,
    body.cml-clean-mode #cml-top-tools > button {
      display: none;
    }
    body.cml-clean-mode #cml-floating-track-list {
      display: flex;
    }
    body.cml-clean-mode #cml-top-tools {
      max-width: calc(100vw - 160px);
    }
    @media (max-width: 1250px) {
      #cml-top-tools {
        left: 120px;
        max-width: calc(100vw - 470px);
      }
      #cml-top-tools button {
        padding: 3px 5px;
        font-size: 8px;
      }
    }
    #cml-drum-legend {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 5px 7px;
      margin: 8px 0 4px;
      padding: 7px;
      border: 1px solid #333;
      border-radius: 6px;
      background: #191919;
    }
    #cml-drum-legend .cml-drum-legend-item {
      display: flex;
      align-items: center;
      min-width: 0;
      gap: 4px;
      color: #eee;
      font-size: 11px;
      line-height: 1.1;
    }
    #cml-drum-legend .cml-drum-swatch {
      width: 10px;
      height: 10px;
      flex: 0 0 10px;
      border-radius: 2px;
      background: var(--drum);
      box-shadow: 0 0 0 1px rgba(255,255,255,.2) inset;
    }
    #cml-mod-status {
      min-height: 18px;
      margin-top: 8px;
      color: #cfefff;
      font-size: 12px;
    }
    body.cml-low-graphics #cml-mod-menu,
    body.cml-low-graphics #cml-top-tools,
    body.cml-low-graphics #cml-floating-track-list,
    body.cml-low-graphics #cml-bottom-tools {
      box-shadow: none !important;
      backdrop-filter: none !important;
    }
    body.cml-low-graphics #cml-audio-grid-layer {
      display: none !important;
    }
    body.cml-low-graphics #cml-mod-menu *,
    body.cml-low-graphics #cml-top-tools * {
      transition: none !important;
    }
    body.cml-extra-low-graphics #cml-mod-menu,
    body.cml-extra-low-graphics #cml-top-tools,
    body.cml-extra-low-graphics #cml-bottom-tools,
    body.cml-extra-low-graphics #cml-floating-track-list {
      background: #111 !important;
      border-color: #777 !important;
      color: #fff !important;
    }
    body.cml-extra-low-graphics #cml-mod-menu button,
    body.cml-extra-low-graphics #cml-top-tools button,
    body.cml-extra-low-graphics #cml-floating-track-list button {
      box-shadow: none !important;
      text-shadow: none !important;
      background-image: none !important;
    }
    body.cml-extra-low-graphics #cml-mod-menu button:not(.active),
    body.cml-extra-low-graphics #cml-top-tools button:not(.active) {
      background: #333 !important;
      color: #fff !important;
    }
    body.cml-dark-mode {
      background: #24272d !important;
    }
    body.cml-dark-mode .background,
    body.cml-dark-mode .grid,
    body.cml-dark-mode #container,
    body.cml-dark-mode #content {
      background-color: #24272d !important;
    }
    body.cml-dark-mode .cml-song-bottom-surface,
    body.cml-dark-mode [id*="bottom" i]:not(#cml-bottom-tools),
    body.cml-dark-mode [class*="bottom" i]:not(#cml-bottom-tools),
    body.cml-dark-mode [class*="toolbar" i],
    body.cml-dark-mode [class*="controls" i] {
      background: #2c3139 !important;
      color: #eef3f8 !important;
      border-color: rgba(255,255,255,0.12) !important;
      box-shadow: 0 -1px 0 rgba(255,255,255,0.08), 0 -10px 24px rgba(0,0,0,0.16) !important;
    }
    body.cml-dark-mode .cml-song-bottom-surface *,
    body.cml-dark-mode [id*="bottom" i]:not(#cml-bottom-tools) *,
    body.cml-dark-mode [class*="bottom" i]:not(#cml-bottom-tools) *,
    body.cml-dark-mode [class*="toolbar" i] *,
    body.cml-dark-mode [class*="controls" i] * {
      color: #eef3f8 !important;
    }
    body.cml-dark-mode .cml-song-bottom-surface :is(div, span, label, p),
    body.cml-dark-mode [id*="bottom" i]:not(#cml-bottom-tools) :is(div, span, label, p),
    body.cml-dark-mode [class*="bottom" i]:not(#cml-bottom-tools) :is(div, span, label, p),
    body.cml-dark-mode [class*="toolbar" i] :is(div, span, label, p),
    body.cml-dark-mode [class*="controls" i] :is(div, span, label, p) {
      background: transparent !important;
    }
    body.cml-dark-mode .cml-song-bottom-surface input,
    body.cml-dark-mode [id*="bottom" i]:not(#cml-bottom-tools) input,
    body.cml-dark-mode [class*="bottom" i]:not(#cml-bottom-tools) input,
    body.cml-dark-mode [class*="toolbar" i] input,
    body.cml-dark-mode [class*="controls" i] input {
      background: #3a404a !important;
      color: #f8fafc !important;
      border-color: rgba(255,255,255,0.2) !important;
    }
    body.cml-dark-mode #bottom,
    body.cml-dark-mode #bottom-left,
    body.cml-dark-mode #bottom-right,
    body.cml-dark-mode #tempo-slider {
      background: #2c3139 !important;
      color: #eef3f8 !important;
    }
    body.cml-dark-mode #tempo-slider {
      border-color: rgba(255,255,255,0.16) !important;
    }
    body.cml-dark-mode #tempo-slider label {
      color: #d8e1ea !important;
      background: transparent !important;
    }
    body.cml-dark-mode #tempo-slider input.input-number {
      background: #2c3139 !important;
      color: #27b9f2 !important;
    }
    body.cml-dark-mode #tempo-slider .range-cover::before {
      background: #4b5563 !important;
    }
    body.cml-dark-mode #tempo-slider .range-cover .range-dupe {
      background-color: #16a8f0 !important;
    }
    body.cml-dark-mode #cml-audio-grid-layer .cml-audio-grid-block {
      border-color: rgba(10,14,20,0.95);
      box-shadow: 0 2px 10px rgba(0,0,0,0.45);
    }
    body.cml-dark-mode #cml-floating-track-list {
      background: rgba(12,16,24,0.92);
    }
    body.cml-dark-mode #cml-top-tools #cml-floating-track-list .cml-track-row[data-active="true"] .cml-track-pick,
    body.cml-dark-mode #cml-mod-menu .cml-track-row[data-active="true"] .cml-track-pick {
      outline-color: #f8fafc;
    }
  `;
  document.head.appendChild(style);

  const menu = document.createElement("div");
  menu.id = "cml-mod-menu";
  const drumLegend = drumTypes.map((type) => `
    <div class="cml-drum-legend-item" title="${type}">
      <span class="cml-drum-swatch" style="--drum:${drumColors[type] || drumColors.perc}"></span>
      <span>${type}</span>
    </div>
  `).join("");
  menu.innerHTML = `
    <h2>Song Maker Mod Menu</h2>
    <div class="cml-section-tabs">
      <button class="active" data-cml-section="setup">Setup</button>
      <button data-cml-section="clips">Clips</button>
      <button data-cml-section="import">Import</button>
      <button data-cml-section="drums">Drums</button>
      <button data-cml-section="perf">Perf</button>
    </div>
    <div class="cml-section active" data-cml-panel="setup">
      <label>Bars <input id="cml-bars" type="number" min="1" step="1" value="${sm.options.bars}"></label>
      <label>Octaves up <input id="cml-upper-octaves" type="number" min="1" step="1" value="${sm.options.octaves}"></label>
      <label>Octaves down <input id="cml-lower-octaves" type="number" min="0" step="1" value="0"></label>
      <label>Beat split <input id="cml-subdivision" type="number" min="1" max="32" step="1" value="${sm.options.subdivision}"></label>
      <label>Held note beats <input id="cml-hold-beats" type="number" min="0.5" step="0.5" value="2"></label>
      <div class="row">
        <button id="cml-apply">Apply</button>
        <button id="cml-held-mode">Held Mode</button>
        <button class="close" id="cml-close">X</button>
      </div>
      <div class="row">
        <button id="cml-unsmush">Unsmush</button>
        <button id="cml-long-edit-mode" title="Drag notes or audio blocks to move/trim/chop them">Long Edit: Off</button>
      </div>
    </div>
    <div class="cml-section" data-cml-panel="clips">
      <div class="row">
        <button id="cml-add-track">Add Clip</button>
        <button id="cml-all-tracks" title="Show notes from other clips as pale reference notes while editing the active clip.">Show Other Clips: Off</button>
      </div>
      <div id="cml-track-list"></div>
    </div>
    <div class="cml-section" data-cml-panel="import">
      <input id="cml-json-file" type="file" accept=".json,application/json" hidden>
      <div class="row">
        <button id="cml-audio-import">Add MP3 Clip</button>
        <button id="cml-custom-inst-import">Port Instrument</button>
        <input id="cml-audio-file" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a" hidden>
        <input id="cml-custom-inst-file" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a" hidden>
      </div>
      <div id="cml-audio-clip-list"></div>
    </div>
    <div class="cml-section" data-cml-panel="drums">
      <div id="cml-drum-legend">${drumLegend}</div>
    </div>
    <div class="cml-section" data-cml-panel="perf">
      <div class="row">
        <button id="cml-dark-mode">Dark: Off</button>
      </div>
      <div class="row cml-graphics-row">
        <button id="cml-low-graphics">Low: Off</button>
        <button id="cml-extra-low-graphics">Extra Low</button>
      </div>
    </div>
    <div id="cml-mod-status">Turn on Held Mode, then click notes in the grid.</div>
  `;
  document.body.appendChild(menu);
  menu.querySelectorAll(".cml-section-tabs button").forEach((button) => {
    button.onclick = () => {
      const section = button.dataset.cmlSection;
      menu.querySelectorAll(".cml-section-tabs button").forEach((item) => item.classList.toggle("active", item === button));
      menu.querySelectorAll(".cml-section").forEach((panel) => panel.classList.toggle("active", panel.dataset.cmlPanel === section));
      if (section === "clips") renderTracks();
      if (section === "import") renderAudioClips();
    };
  });

  const audioGridLayer = document.createElement("div");
  audioGridLayer.id = "cml-audio-grid-layer";
  document.body.appendChild(audioGridLayer);

  const topTools = document.createElement("div");
  topTools.id = "cml-top-tools";
  topTools.innerHTML = `
    <button id="cml-all-tracks-low" title="Keep other-clip reference notes visible when Low or Extra Low graphics mode is enabled.">Show in Low Mode: On</button>
    <button id="cml-reset-current">Reset Clip</button>
    <button id="cml-delete-current">Delete Clip</button>
    <button id="cml-reset-all">Reset All</button>
    <button id="cml-undo">Undo</button>
    <button id="cml-redo">Redo</button>
    <button id="cml-export-json">Export JSON</button>
    <button id="cml-import-json">Import JSON</button>
    <div id="cml-floating-track-list"></div>
  `;
  document.body.appendChild(topTools);

  const status = document.getElementById("cml-mod-status");
  const run = (fn, ok) => {
    try {
      fn();
      status.textContent = ok;
    } catch (err) {
      status.textContent = err.message || String(err);
      console.error(err);
    }
  };

  document.getElementById("cml-apply").onclick = () => run(applySettings, "Applied bars/octaves.");
  document.getElementById("cml-all-tracks").onclick = toggleAllTrackMode;
  document.getElementById("cml-all-tracks-low").onclick = toggleAllTracksInLow;
  document.getElementById("cml-unsmush").onclick = () => {
    try {
      status.textContent = unsmush();
    } catch (err) {
      status.textContent = err.message || String(err);
      console.error(err);
    }
  };
  document.getElementById("cml-add-track").onclick = () => {
    try {
      status.textContent = addTrack();
    } catch (err) {
      status.textContent = err.message || String(err);
      console.error(err);
    }
  };
  document.getElementById("cml-reset-current").onclick = () => {
    try {
      status.textContent = resetCurrentClip();
    } catch (err) {
      status.textContent = err.message || String(err);
      console.error(err);
    }
  };
  document.getElementById("cml-delete-current").onclick = () => {
    try {
      status.textContent = state.activeTrackId === "__drums" ? resetCurrentClip("__drums") : deleteTrack(state.activeTrackId);
    } catch (err) {
      status.textContent = err.message || String(err);
      console.error(err);
    }
  };
  document.getElementById("cml-reset-all").onclick = () => {
    try {
      status.textContent = resetAll();
    } catch (err) {
      status.textContent = err.message || String(err);
      console.error(err);
    }
  };
  document.getElementById("cml-undo").onclick = () => {
    try {
      status.textContent = undoModChange();
    } catch (err) {
      status.textContent = err.message || String(err);
      console.error(err);
    }
  };
  document.getElementById("cml-redo").onclick = () => {
    try {
      status.textContent = redoModChange();
    } catch (err) {
      status.textContent = err.message || String(err);
      console.error(err);
    }
  };
  document.getElementById("cml-export-json").onclick = () => {
    try {
      status.textContent = exportJson();
    } catch (err) {
      status.textContent = err.message || String(err);
      console.error(err);
    }
  };
  document.getElementById("cml-import-json").onclick = () => document.getElementById("cml-json-file").click();
  document.getElementById("cml-json-file").onchange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) importJsonFile(file);
    event.target.value = "";
  };
  document.getElementById("cml-dark-mode").onclick = toggleDarkMode;
  document.getElementById("cml-low-graphics").onclick = toggleLowGraphicsMode;
  document.getElementById("cml-extra-low-graphics").onclick = toggleExtraLowGraphicsMode;
  document.getElementById("cml-audio-import").onclick = () => document.getElementById("cml-audio-file").click();
  document.getElementById("cml-audio-file").onchange = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      try {
        status.textContent = await importAudioClipFile(file);
      } catch (err) {
        status.textContent = err.message || String(err);
        console.error(err);
      }
    }
    event.target.value = "";
  };
  document.getElementById("cml-custom-inst-import").onclick = () => document.getElementById("cml-custom-inst-file").click();
  document.getElementById("cml-custom-inst-file").onchange = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      try {
        status.textContent = await importCustomInstrumentFile(file);
      } catch (err) {
        status.textContent = err.message || String(err);
        console.error(err);
      }
    }
    event.target.value = "";
  };
  document.getElementById("cml-held-mode").onclick = () => {
    try {
      status.textContent = toggleHeldMode();
    } catch (err) {
      status.textContent = err.message || String(err);
      console.error(err);
    }
  };
  document.getElementById("cml-close").onclick = () => {
    menu.remove();
    topTools.remove();
    document.body.classList.remove("cml-clean-mode");
  };
  if (window.__cmlCleanModeKeyHandler) {
    window.removeEventListener("keydown", window.__cmlCleanModeKeyHandler, true);
  }
  window.__cmlCleanModeKeyHandler = (event) => {
    const target = event.target;
    const editingText = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
    if (editingText || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (event.key && event.key.toLowerCase() === "y") {
      event.preventDefault();
      toggleCleanMode();
    }
  };
  window.addEventListener("keydown", window.__cmlCleanModeKeyHandler, true);
  if (window.__cmlDarkModeSurfaceHandler) {
    window.removeEventListener("resize", window.__cmlDarkModeSurfaceHandler, true);
  }
  window.__cmlDarkModeSurfaceHandler = () => {
    if (state.darkMode) requestAnimationFrame(markDarkModeSurfaces);
  };
  window.addEventListener("resize", window.__cmlDarkModeSurfaceHandler, true);

  window[PATCH_MARK] = { sm, state, patchHeldPlayback, patchEnhancedDrumCanvas, patchSaveAndHistory, installLongNoteEditor, applySettings, unsmush, toggleHeldMode, toggleCleanMode, setCleanMode, toggleDarkMode, setDarkMode, patchDarkModeCanvas, toggleAllTrackMode, setAllTrackMode, toggleAllTracksInLow, setAllTracksInLow, toggleLowGraphicsMode, setLowGraphicsMode, toggleExtraLowGraphicsMode, setExtraLowGraphicsMode, cycleGlobalInstrument, updateGlobalInstrumentButton, importWebInstrumentUrl, patchGridAnimations, refreshInstrumentGrid, refreshPercussionGrid, addTrack, deleteTrack, resetCurrentClip, resetAll, undoModChange, redoModChange, exportJson, importJsonFile, importAudioClipFile, importCustomInstrumentFile, splitTracksByOctave };
  patchHeldPlayback();
  patchEnhancedDrumPlayback();
  patchEnhancedDrumCanvas();
  patchSaveAndHistory();
  installLongNoteEditor();
  patchGridAnimations();
  patchDarkModeCanvas();
  markDarkModeSurfaces();
  document.body.classList.toggle("cml-dark-mode", state.darkMode);
  updateDarkModeButton();
  updateGraphicsButtons();
  setAllTrackMode(state.allTrackMode);
  setAllTracksInLow(state.allTracksInLow);
  ensureEventTracks();
  setCleanMode(false);
  renderTracks();
  renderAudioClips();
  refreshInstrumentGrid();
  refreshPercussionGrid();
  requestAnimationFrame(renderAudioGridLayer);
  console.log("Song Maker mod menu loaded.", window[PATCH_MARK]);
})();
