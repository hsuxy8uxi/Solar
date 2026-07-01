(() => {
  const w = [window, ...[...document.querySelectorAll("iframe")].map(f => {
    try { return f.contentWindow; } catch {}
  })].find(x => {
    try { return x?.characters && x?.carousel && x?.Tone && x?.pixi && x?.PIXI; } catch { return false; }
  });

  if (!w) return alert("Switch Console context to oscillators-service, then paste again.");

  const chars = w.characters;

  function installHeartWave() {
    const oldHeartIndex = chars.findIndex(c => c.__isHeartWave);
    if (oldHeartIndex >= 0) {
      const oldHeart = chars.splice(oldHeartIndex, 1)[0];
      try { oldHeart.__stopNow?.(); } catch {}
      try { oldHeart.container.parent?.removeChild(oldHeart.container); } catch {}
      try { oldHeart.__domLabel?.remove(); } catch {}
    }
    if (typeof w.Character2 !== "function") {
      alert("Heart Wave needs the Oscillators Character2 constructor. Try switching Console context to oscillators-service, then paste again.");
      return;
    }

    const heart = new w.Character2({
      type: "sine",
      mouthY: -128,
      eyeY: 190,
      armX: 205,
      armY: -190,
      armSpacing: 50,
      armRotation: -0.22,
      eyeDisplacement: 36,
      volume: -13,
      vibratoStrength: 18,
      color: 0xe94b8a,
      mouth: {
        pattern: "texture/puppets_sine@2x.png",
        scale: 0.62,
        radius: 0.8
      },
      body: {
        middle: function(g) {
          g.moveTo(0, 0);
          g.bezierCurveTo(-290, -152, -277, -410, -97, -410);
          g.bezierCurveTo(-41, -410, -11, -378, 0, -337);
          g.bezierCurveTo(11, -378, 41, -410, 97, -410);
          g.bezierCurveTo(277, -410, 290, -152, 0, 0);
        }
      }
    });

    heart.__isHeartWave = true;
    heart.__displayName = "heart";
    heart.__soundType = "heart";
    heart.type = "sine";
    heart.color = 0xe94b8a;
    heart.cssColor = "#e94b8a";
    heart.bodyContainer.position.y += 17;
    heart.armContainer.position.y += 28;
    heart.eyes.container.position.y += 8;
    heart.mouth.container.position.y += 8;
    heart.container.position.y = heart.container.height / 4;

    try {
      heart.osc.type = "triangle";
    } catch {
      try { heart.osc.type = "sine"; } catch {}
    }
    try { heart.vibrato.frequency.value = 7.2; } catch {}
    heart.volume = -12;

    const insertAt = Math.min(2, chars.length);
    chars.splice(insertAt, 0, heart);
  }

  function oscillatorConfig(kind) {
    if (kind === "square") return {
      type: "square",
      mouth: { pattern: "texture/puppets_square@2x.png" },
      body: { middle: g => {
        const width = 465, height = 420;
        g.drawRoundedRect(-width / 2, -height, width, height, 30);
      } },
      volume: -20
    };
    if (kind === "sawtooth") return {
      type: "sawtooth",
      mouthY: -125,
      mouth: { pattern: "texture/puppets_saw@2x.png" },
      eyeY: 220,
      body: { middle: g => {
        const width = 465, height = 350, spike = 120;
        g.moveTo(-width / 2, 0);
        g.lineTo(-width / 2, -height);
        g.lineTo(-width / 6, -height - spike);
        g.lineTo(-width / 6, -height);
        g.lineTo(width / 6, -height - spike);
        g.lineTo(width / 6, -height);
        g.lineTo(width / 2, -height - spike);
        g.lineTo(width / 2, -height);
        g.lineTo(width / 2, 0);
      } },
      volume: -20,
      color: 0xffb729
    };
    if (kind === "triangle") return {
      type: "triangle",
      mouthY: -100,
      armX: 130,
      armY: -180,
      armSpacing: 70,
      armRotation: 0.6,
      mouth: { pattern: "texture/puppets_triangle@2x.png", scale: 0.6, radius: 0.8 },
      body: { middle: g => {
        g.moveTo(195, 0);
        g.bezierCurveTo(223, 0, 241, -31, 227, -55);
        g.lineTo(32, -394);
        g.bezierCurveTo(25, -406, 12.5, -412.5, 0, -412.5);
        g.bezierCurveTo(-25, -406, -12.5, -412.5, -32, -394);
        g.lineTo(-227, -55);
        g.bezierCurveTo(-241, -31, -223, 0, -195, 0);
      } },
      eyeY: 210,
      eyeDisplacement: 10,
      volume: -10,
      color: 0xff4582
    };
    if (kind === "heart") return {
      type: "sine",
      mouthY: -128,
      eyeY: 190,
      armX: 205,
      armY: -190,
      armSpacing: 50,
      armRotation: -0.22,
      eyeDisplacement: 36,
      volume: -13,
      vibratoStrength: 18,
      color: 0xe94b8a,
      mouth: { pattern: "texture/puppets_sine@2x.png", scale: 0.62, radius: 0.8 },
      body: { middle: g => {
        g.moveTo(0, 0);
        g.bezierCurveTo(-290, -152, -277, -410, -97, -410);
        g.bezierCurveTo(-41, -410, -11, -378, 0, -337);
        g.bezierCurveTo(11, -378, 41, -410, 97, -410);
        g.bezierCurveTo(277, -410, 290, -152, 0, 0);
      } }
    };
    if (kind === "star") return {
      type: "sine",
      mouthY: -126,
      eyeY: 230,
      armX: 205,
      armY: -205,
      armSpacing: 38,
      armRotation: -0.64,
      eyeDisplacement: 35,
      volume: -14,
      vibratoStrength: 28,
      color: 0xffd13b,
      mouth: { pattern: "texture/puppets_sine@2x.png", scale: 0.62, radius: 0.8 },
      body: { middle: g => {
        const outer = 250;
        const inner = 112;
        const centerY = -185;
        let firstX = 0, firstY = 0;
        for (let i = 0; i < 10; i++) {
          const radius = i % 2 === 0 ? outer : inner;
          const angle = -Math.PI / 2 + i * Math.PI / 5;
          const x = Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          if (i === 0) {
            firstX = x;
            firstY = y;
            g.moveTo(x, y);
          } else {
            g.lineTo(x, y);
          }
        }
        g.lineTo(firstX, firstY);
      } }
    };
    return {
      type: "sine",
      mouth: { pattern: "texture/puppets_sine@2x.png" },
      body: { middle: g => {
        const width = 465;
        g.drawEllipse(0, -width / 2, width / 2, width / 2 * 0.95);
      } },
      eyeY: 170,
      eyeDisplacement: 30,
      color: 0x00b6ee,
      volume: -10
    };
  }

  function finishHeartCharacter(c) {
    c.__isHeartWave = true;
    c.__soundType = "heart";
    c.type = "sine";
    c.color = 0xe94b8a;
    c.cssColor = "#e94b8a";
    c.bodyContainer.position.y += 17;
    c.armContainer.position.y += 28;
    c.eyes.container.position.y += 8;
    c.mouth.container.position.y += 8;
    c.container.position.y = c.container.height / 4;
  }

  function makeCustomLayer(freq, destination, type = "sine") {
    let layer = null;
    try {
      layer = new w.Tone.Oscillator({ frequency: freq, type });
    } catch {
      try { layer = new w.Tone.Oscillator(freq, type); } catch {}
    }
    if (!layer) return null;
    try { layer.connect(destination); } catch { try { layer.toDestination(); } catch {} }
    try { layer.volume.value = -Infinity; } catch {}
    return layer;
  }

  function installStarVoice(c) {
    if (!c) return;
    c.__isStarWave = true;
    c.__soundType = "star";
    c.type = "sine";
    c.volume = -14;
    try { c.osc.type = "sine"; } catch {}
    try { c.vibrato.frequency.value = 9.5; } catch {}
    if (c.__starVoiceReady || !w.Tone || typeof w.Tone.Oscillator !== "function") return;
    const base = Number(c.currentFrequency || c.osc?.frequency?.value || 440);
    c.__starLayers = [
      { ratio: 1.5, offset: -13, osc: makeCustomLayer(base * 1.5, c.vol, "sine") },
      { ratio: 2.25, offset: -18, osc: makeCustomLayer(base * 2.25, c.vol, "triangle") },
      { ratio: 4.02, offset: -24, osc: makeCustomLayer(base * 4.02, c.vol, "sine") }
    ].filter(layer => layer.osc);
    c.__starVoiceReady = true;
  }

  function finishStarCharacter(c) {
    c.__isStarWave = true;
    c.__soundType = "star";
    c.__displayName = c.__displayName || "star";
    c.type = "sine";
    c.color = 0xffd13b;
    c.cssColor = "#ffd13b";
    c.bodyContainer.position.y += 8;
    c.eyes.container.position.y += 6;
    c.mouth.container.position.y += 8;
    c.container.position.y = c.container.height / 4;
    installStarVoice(c);
    installCustomMouthWaves(c, "star");
  }

  function installCustomMouthWaves(c, kind) {
    if (!c?.mouth?.open || !w.PIXI?.Graphics) return;
    c.__customMouthKind = kind;
    if (c.mouth.pattern) c.mouth.pattern.visible = false;
    if (!c.mouth.__customWaveLayer) {
      const wave = new w.PIXI.Graphics();
      wave.alpha = 1;
      c.mouth.open.addChild(wave);
      c.mouth.__customWaveLayer = wave;
    }
    updateCustomMouthWaves(c);
  }

  function drawStarWavePattern(g, offset = 0) {
    g.clear();
    g.lineStyle(12, 0xffffff, 1);
    for (let x = -520 + offset; x < 520; x += 96) {
      g.moveTo(x + 0, 0);
      g.lineTo(x + 36, 0);
      g.lineTo(x + 48, -34);
      g.lineTo(x + 60, 0);
      g.lineTo(x + 96, 0);
    }
  }

  function updateCustomMouthWaves(c) {
    if (!c?.__customMouthKind || !c.mouth?.__customWaveLayer) return;
    const period = c.__customMouthKind === "star" ? 96 : 150;
    const tileX = Number(c.mouth.pattern?.tilePosition?.x);
    const fallback = ((performance.now ? performance.now() : Date.now()) * 0.03);
    const raw = Number.isFinite(tileX) ? tileX : fallback;
    const offset = ((raw % period) + period) % period;
    if (c.__customMouthKind === "star") drawStarWavePattern(c.mouth.__customWaveLayer, offset);
  }

  function installStarWave() {
    const oldStarIndex = chars.findIndex(c => c.__isStarWave);
    if (oldStarIndex >= 0) {
      const oldStar = chars.splice(oldStarIndex, 1)[0];
      try { oldStar.__stopNow?.(); } catch {}
      try { oldStar.container.parent?.removeChild(oldStar.container); } catch {}
      try { oldStar.__domLabel?.remove(); } catch {}
    }
    if (typeof w.Character2 !== "function") {
      alert("Star needs the Oscillators Character2 constructor. Try switching Console context to oscillators-service, then paste again.");
      return;
    }

    const star = new w.Character2(oscillatorConfig("star"));
    finishStarCharacter(star);
    const insertAt = Math.min(3, chars.length);
    chars.splice(insertAt, 0, star);
  }

  try { installHeartWave(); } catch (err) { console.warn("Heart install failed:", err); }
  try { installStarWave(); } catch (err) { console.warn("Star install failed:", err); }

  const carousel = w.carousel;
  if (!carousel.__polyOscOriginal) {
    carousel.__polyOscOriginal = {
      update: carousel.update,
      arrive: carousel.arrive,
      setActive: carousel.setActive,
      setChildWidth: carousel.setChildWidth,
      childWidth: carousel.childWidth
    };
  }

  let currentMode = "normal";
  let voices = [];
  let characterOrder = [];
  let songTitle = "Untitled Song";
  const disabledCharacters = new Set();
  let draggedCharacter = null;
  let cloneSerial = 1;
  let gridOverlay = null;
  let gridSelectedKey = "square";
  let gridPlayReturn = false;
  let gridDrag = null;
  let gridPreviewVoice = null;
  let gridPreviewTimer = 0;
  const gridCells = new Map();
  const gridNoteIds = new Map();
  let gridNextNoteId = 1;
  let gridBars = 8;
  const gridStepsPerBar = 16;
  let gridCols = gridBars * gridStepsPerBar;
  let gridEndCol = gridCols;
  const gridMaxBars = 60;
  const gridRetriggerGap = 0.035;
  const gridCellWidth = 18;
  const gridCellHeight = 20;
  const gridLabelWidth = 52;
  const gridLowNote = 48;
  const gridHighNote = 90;
  const caption = w.document.getElementById("caption");
  const domType = w.document.getElementById("type-value");
  const domFreq = w.document.getElementById("freq-value");

  let notes = [], events = [], playing = false, raf = 0, startMs = 0, eventIndex = 0, uiHidden = false;
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const isVoice = c => ["square", "sawtooth", "triangle", "sine"].includes(c.type) || c.__isHeartWave || c.__isStarWave;

  function characterKey(c) {
    return c.__cloneKey || (c.__isHeartWave ? "heart" : c.__isStarWave ? "star" : c.type);
  }

  function characterBaseKey(c) {
    return c.__baseKey || (c.__isHeartWave ? "heart" : c.__isStarWave ? "star" : c.type);
  }

  function characterName(c) {
    return c.__displayName || c.type;
  }

  function characterByKey(key) {
    return orderedVoiceChars().find(c => characterKey(c) === key) || orderedVoiceChars()[0];
  }

  function isCharacterEnabled(c) {
    return !disabledCharacters.has(characterKey(c));
  }

  function setCharacterEnabled(key, enabled) {
    if (!enabled && getVisibleChars().length <= 1 && !disabledCharacters.has(key)) {
      alert("Keep at least one character enabled.");
      return false;
    }
    if (enabled) disabledCharacters.delete(key);
    else disabledCharacters.add(key);
    document.querySelectorAll(`[data-osc-character="${key}"]`).forEach(input => {
      input.checked = enabled;
    });
    refreshVoices();
    syncCharacterToggleList();
    syncCharacterToggleOrder();
    if (currentMode === "grid") {
      refreshGridTools();
      renderGridCells();
    } else if (currentMode === "studio") {
      applyStudioMode();
    } else {
      applyNormalMode();
    }
    const status = document.getElementById("status");
    if (status) status.textContent = `Enabled characters: ${voices.length}.`;
    return true;
  }

  function syncCharacterOrder() {
    const keys = chars.filter(isVoice).map(characterKey);
    characterOrder = [
      ...characterOrder.filter(k => keys.includes(k)),
      ...keys.filter(k => !characterOrder.includes(k))
    ];
  }

  function orderedVoiceChars() {
    syncCharacterOrder();
    return chars
      .filter(isVoice)
      .sort((a, b) => characterOrder.indexOf(characterKey(a)) - characterOrder.indexOf(characterKey(b)));
  }

  function getVisibleChars() {
    return orderedVoiceChars().filter(c => isCharacterEnabled(c));
  }

  function duplicateCharacter(baseKey = gridSelectedKey) {
    const source = characterByKey(baseKey);
    const kind = characterBaseKey(source || { type: baseKey });
    if (typeof w.Character2 !== "function") return alert("Cannot duplicate: Character2 is unavailable.");
    const clone = new w.Character2(oscillatorConfig(kind));
    if (kind === "heart") finishHeartCharacter(clone);
    if (kind === "star") finishStarCharacter(clone);
    clone.__baseKey = kind;
    clone.__cloneIndex = orderedVoiceChars().filter(c => characterBaseKey(c) === kind).length + 1;
    clone.__cloneKey = `${kind}-${++cloneSerial}`;
    clone.__displayName = `${kind} ${clone.__cloneIndex}`;
    clone.container.position.y = clone.container.height / 4;
    chars.push(clone);
    characterOrder.push(characterKey(clone));
    patchVoice(clone);
    installLabels();
    syncCharacterToggleList();
    refreshVoices();
    if (currentMode === "grid") {
      refreshGridTools();
      gridSelectedKey = characterKey(clone);
      selectGridCharacter(gridSelectedKey);
    } else if (currentMode === "studio") {
      applyStudioMode();
    } else {
      applyNormalMode();
    }
    const status = document.getElementById("status");
    if (status) status.textContent = `Duplicated ${kind}. Enabled characters: ${voices.length}.`;
  }

  function swapCharacterOrder(a, b) {
    const ak = characterKey(a), bk = characterKey(b);
    const ai = characterOrder.indexOf(ak), bi = characterOrder.indexOf(bk);
    if (ai < 0 || bi < 0 || ai === bi) return false;
    [characterOrder[ai], characterOrder[bi]] = [characterOrder[bi], characterOrder[ai]];
    return true;
  }

  function refreshVoices() {
    voices = getVisibleChars().filter(isVoice);
  }

  w.document.getElementById("osc-dom-label-style")?.remove();
  const labelStyle = w.document.createElement("style");
  labelStyle.id = "osc-dom-label-style";
  labelStyle.textContent = `
    .osc-dom-label {
      position: fixed;
      z-index: 999998;
      transform: translate(-50%, 0);
      text-align: center;
      font-family: Courier, monospace;
      font-weight: 900;
      pointer-events: none;
      line-height: 1.1;
      text-shadow: 0 1px 0 #fff, 0 0 4px #fff;
      white-space: nowrap;
    }
    .osc-dom-label .osc-name { font-size: 20px; }
    .osc-dom-label .osc-freq { font-size: 16px; margin-top: 3px; }
  `;
  w.document.head.appendChild(labelStyle);

  function setUiHidden(hidden) {
    uiHidden = hidden;
    const panel = document.getElementById("poly-osc-mod");
    if (panel) panel.style.display = hidden ? "none" : "block";
    chars.forEach(c => {
      if (c.__domLabel) c.__domLabel.style.display = hidden || currentMode !== "studio" || !getVisibleChars().includes(c) ? "none" : "block";
    });
  }

  function updateLabel(c) {
    if (!c.__domLabel) return;
    const freq = Math.round(c.currentFrequency || c.osc?.frequency?.value || 0);
    c.__domLabel.querySelector(".osc-name").textContent = c.__displayName || c.type;
    c.__domLabel.querySelector(".osc-freq").textContent = freq ? `${freq} Hz` : "-- Hz";
    c.__domLabel.style.color = c.cssColor;
  }

  function installLabels() {
    chars.forEach(c => {
      if (!c.__domLabel) {
        const el = w.document.createElement("div");
        el.className = "osc-dom-label";
        el.innerHTML = `<div class="osc-name"></div><div class="osc-freq"></div>`;
        w.document.body.appendChild(el);
        c.__domLabel = el;
      }
      updateLabel(c);
    });
  }

  function positionLabels() {
    const rect = w.pixi.renderer.view.getBoundingClientRect();
    const visible = getVisibleChars();
    chars.forEach(c => {
      if (!c.__domLabel) return;
      c.__domLabel.style.display = uiHidden || gridPlayReturn || currentMode !== "studio" || !visible.includes(c) ? "none" : "block";
      if (c.__domLabel.style.display === "none") return;
      const p = c.container.getGlobalPosition ? c.container.getGlobalPosition() : c.container.position;
      c.__domLabel.style.left = `${rect.left + p.x}px`;
      c.__domLabel.style.top = `${rect.top + p.y + 230 * c.container.scale.y}px`;
      updateLabel(c);
    });
  }

  function syncCharacterToggleOrder() {
    const box = document.getElementById("character-toggles");
    if (!box) return;
    orderedVoiceChars().forEach(c => {
      const input = box.querySelector(`[data-osc-character="${characterKey(c)}"]`);
      const label = input?.closest("label");
      if (label) box.appendChild(label);
    });
  }

  function syncCharacterToggleList() {
    const box = document.getElementById("character-toggles");
    if (!box) return;
    for (const c of orderedVoiceChars()) {
      const key = characterKey(c);
      let input = box.querySelector(`[data-osc-character="${key}"]`);
      let label = input?.closest("label");
      if (!label) {
        label = document.createElement("label");
        label.title = key === "heart" ? "Show or remove Heart in Normal and Grid modes" : "Show or hide this character";
        label.style.cssText = "display:flex;align-items:center;gap:7px;min-width:0";
        input = document.createElement("input");
        input.type = "checkbox";
        input.checked = isCharacterEnabled(c);
        input.dataset.oscCharacter = key;
        const name = document.createElement("span");
        name.style.cssText = `overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${c.cssColor};flex:1`;
        name.textContent = characterName(c);
        label.append(input, name);
      }
      input.checked = isCharacterEnabled(c);
      let name = label.querySelector("span");
      if (name) {
        name.textContent = characterName(c);
        name.style.color = c.cssColor;
      }
      let dup = label.querySelector("[data-duplicate-character]");
      if (!dup) {
        dup = document.createElement("button");
        dup.type = "button";
        dup.textContent = "+";
        dup.title = "Duplicate this oscillator";
        dup.style.cssText = "width:24px;height:24px;border:1px solid #222;border-radius:6px;background:#ffb729;color:#111;font:900 15px system-ui;cursor:pointer;flex:0 0 auto";
        label.appendChild(dup);
      }
      dup.dataset.duplicateCharacter = key;
      dup.onclick = e => {
        e.preventDefault();
        e.stopPropagation();
        duplicateCharacter(key);
      };
      input.onchange = () => setCharacterEnabled(key, input.checked);
      box.appendChild(label);
    }
  }

  function installCharacterDragging() {
    const view = w.pixi?.renderer?.view;
    const dragDoc = w.document;
    if (view && dragDoc.__polyDocShuffleVersion !== 4) {
      dragDoc.__polyDocShuffleVersion = 4;
      const dragOpts = { capture: true, passive: false };

      const eventPoint = e => e.touches?.[0] || e.changedTouches?.[0] || e;
      const isOnView = e => {
        const path = e.composedPath?.() || [];
        return e.target === view || path.includes(view);
      };
      const stopOriginal = e => {
        e.preventDefault?.();
        e.stopImmediatePropagation?.();
        e.stopPropagation?.();
      };
      const localPoint = e => {
        const point = eventPoint(e);
        if (!point) return null;
        const rect = view.getBoundingClientRect();
        const sx = (w.pixi.renderer.width || rect.width) / rect.width;
        const sy = (w.pixi.renderer.height || rect.height) / rect.height;
        const global = new w.PIXI.Point((point.clientX - rect.left) * sx, (point.clientY - rect.top) * sy);
        try { return carousel.container.toLocal(global); }
        catch { return { x: global.x - carousel.container.position.x, y: global.y - carousel.container.position.y }; }
      };

      const pickCharacter = p => {
        let picked = null, best = Infinity;
        for (const c of getVisibleChars()) {
          const slot = c.__studioSlot || c.container.position;
          const dx = p.x - slot.x;
          const dy = p.y - slot.y;
          const d = Math.hypot(dx, dy);
          if (d < best) { best = d; picked = c; }
        }
        return best < 210 ? picked : null;
      };

      const finishCanvasDrag = e => {
        if (!draggedCharacter?.canvas) return;
        stopOriginal(e);
        const c = draggedCharacter.char;
        const nearest = draggedCharacter.hover;
        draggedCharacter = null;
        if (nearest && nearest !== c && swapCharacterOrder(c, nearest)) {
          syncCharacterToggleOrder();
          refreshVoices();
        }
        installAllVisibleStage();
        getVisibleChars().forEach(x => x.container.alpha = 1);
        const status = document.getElementById("status");
        if (status) status.textContent = `Character order changed. Enabled characters: ${voices.length}.`;
        dragDoc.removeEventListener("pointermove", moveCanvasDrag, dragOpts);
        dragDoc.removeEventListener("pointerup", finishCanvasDrag, dragOpts);
        dragDoc.removeEventListener("pointercancel", finishCanvasDrag, dragOpts);
        dragDoc.removeEventListener("mousemove", moveCanvasDrag, dragOpts);
        dragDoc.removeEventListener("mouseup", finishCanvasDrag, dragOpts);
        dragDoc.removeEventListener("touchmove", moveCanvasDrag, dragOpts);
        dragDoc.removeEventListener("touchend", finishCanvasDrag, dragOpts);
        dragDoc.removeEventListener("touchcancel", finishCanvasDrag, dragOpts);
      };

      function moveCanvasDrag(e) {
        if (!draggedCharacter?.canvas) return;
        stopOriginal(e);
        const p = localPoint(e);
        if (!p) return;
        const hover = pickCharacter(p);
        draggedCharacter.hover = hover && hover !== draggedCharacter.char ? hover : null;
        carousel.update?.();
      }

      const startCanvasDrag = e => {
        if (currentMode !== "studio" || playing) return;
        if (!isOnView(e)) return;
        if (draggedCharacter?.canvas) {
          stopOriginal(e);
          return;
        }
        const p = localPoint(e);
        if (!p) return;
        const c = pickCharacter(p);
        if (!c) return;
        stopOriginal(e);
        chars.forEach(x => {
          try { x.__stopNow?.(); } catch {}
          try { x.stop?.(); } catch {}
          x.playing = false;
        });
        draggedCharacter = {
          char: c,
          hover: null,
          fromSlot: c.__studioSlot ? { ...c.__studioSlot } : { x: c.container.position.x, y: c.container.position.y },
          canvas: true
        };
        c.container.alpha = 0.92;
        carousel.container.addChild(c.container);
        dragDoc.addEventListener("pointermove", moveCanvasDrag, dragOpts);
        dragDoc.addEventListener("pointerup", finishCanvasDrag, dragOpts);
        dragDoc.addEventListener("pointercancel", finishCanvasDrag, dragOpts);
        dragDoc.addEventListener("mousemove", moveCanvasDrag, dragOpts);
        dragDoc.addEventListener("mouseup", finishCanvasDrag, dragOpts);
        dragDoc.addEventListener("touchmove", moveCanvasDrag, dragOpts);
        dragDoc.addEventListener("touchend", finishCanvasDrag, dragOpts);
        dragDoc.addEventListener("touchcancel", finishCanvasDrag, dragOpts);
      };

      dragDoc.addEventListener("pointerdown", startCanvasDrag, dragOpts);
      dragDoc.addEventListener("mousedown", startCanvasDrag, dragOpts);
      dragDoc.addEventListener("touchstart", startCanvasDrag, dragOpts);
    }

    chars.filter(isVoice).forEach(c => {
      if (c.__polyDragReady) return;
      c.__polyDragReady = true;
      c.container.interactive = true;
      c.container.buttonMode = true;
    });
  }

  function installAllVisibleStage() {
    function layout() {
      const wide = w.innerWidth > 780;
      const spacingX = wide ? 355 : 320;
      const spacingY = wide ? 0 : 470;
      const scale = wide ? 0.58 : 0.44;
      const stageChars = getVisibleChars();

      carousel.container.position.x = 0;
      carousel.container.position.y = wide ? 78 : 12;

      chars.forEach(c => c.container.visible = stageChars.includes(c));
      stageChars.forEach((c, i) => {
        const row = wide ? 0 : Math.floor(i / 2);
        const col = wide ? i : i % 2;
        const count = wide ? stageChars.length : Math.min(2, stageChars.length);
        const x = (col - (count - 1) / 2) * spacingX;
        const y = row * spacingY;

        c.__studioSlot = { x, y, scale };
      });

      stageChars.forEach(c => {
        let target = c.__studioSlot;
        if (draggedCharacter?.canvas && draggedCharacter.hover) {
          if (c === draggedCharacter.char && draggedCharacter.hover.__studioSlot) target = draggedCharacter.hover.__studioSlot;
          else if (c === draggedCharacter.hover && draggedCharacter.fromSlot) target = draggedCharacter.fromSlot;
        }
        const ease = c.__polyWasLaidOut ? 0.35 : 1;
        c.container.position.x += (target.x - c.container.position.x) * ease;
        c.container.position.y += (target.y - c.container.position.y) * ease;
        c.container.scale.set(scale);
        c.container.alpha = draggedCharacter?.canvas
          ? (c === draggedCharacter.char ? 0.92 : c === draggedCharacter.hover ? 0.72 : 1)
          : 1;
        c.__polyWasLaidOut = true;
        carousel.container.addChild(c.container);
      });

      if (carousel.prevButton) carousel.prevButton.style.display = "none";
      if (carousel.nextButton) carousel.nextButton.style.display = "none";
      positionLabels();
    }

    carousel.update = layout;
    carousel.arrive = layout;
    carousel.setActive = function (i) {
      this.activeChildIndex = i;
      w.activeCharacter = getVisibleChars()[i] || voices[0];
    };

    installLabels();
    installCharacterDragging();
    layout();
    if (w.__polyOscStudioResize) w.removeEventListener("resize", w.__polyOscStudioResize);
    w.__polyOscStudioResize = layout;
    w.addEventListener("resize", layout);
  }

  function syncModeUi() {
    const panel = document.getElementById("poly-osc-mod");
    const normal = panel?.querySelector("#mode-normal");
    const grid = panel?.querySelector("#mode-grid");
    if (normal) normal.style.background = currentMode === "normal" ? "#ffb729" : "#fff";
    if (grid) grid.style.background = currentMode === "grid" ? "#ffb729" : "#fff";
    gridOverlay?.querySelectorAll("[data-grid-mode]").forEach(btn => {
      btn.style.background = btn.dataset.gridMode === currentMode ? "#ffb729" : "#f7f7f7";
      btn.style.color = "#111";
    });
  }

  function noteName(note) {
    const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    return `${names[note % 12]}${Math.floor(note / 12) - 1}`;
  }

  function hideGridOverlay() {
    if (gridOverlay) gridOverlay.style.display = "none";
  }

  function renderGridCells() {
    if (!gridOverlay) return;
    const preview = gridDrag?.preview || new Set();
    const hidden = gridDrag?.ignore || new Set();
    const board = gridOverlay.querySelector("#grid-board");
    board?.querySelectorAll(".osc-grid-note-block,.osc-grid-end-block").forEach(el => el.remove());
    gridOverlay.querySelectorAll(".osc-grid-cell").forEach(cell => {
      cell.style.background = "#2d3138";
      cell.style.opacity = "1";
      cell.style.boxShadow = "";
    });

    const drawBlock = (start, end, note, charKey, previewMode = "", noteId = "") => {
      if (!board) return;
      const char = characterByKey(charKey);
      const block = document.createElement("div");
      block.className = "osc-grid-note-block";
      block.dataset.start = start;
      block.dataset.end = end;
      block.dataset.note = note;
      block.dataset.charKey = charKey;
      block.dataset.noteId = noteId;
      block.style.cssText = [
        "position:absolute",
        `left:${gridLabelWidth + start * gridCellWidth + 2}px`,
        `top:${(gridHighNote - note) * gridCellHeight + 2}px`,
        `width:${Math.max(4, (end - start + 1) * gridCellWidth - 4)}px`,
        `height:${gridCellHeight - 4}px`,
        `background:${char?.cssColor || "#38a7ff"}`,
        "border-radius:5px",
        `box-shadow:${previewMode ? "0 0 0 3px #38a7ff, 0 0 16px #38a7ff88" : "inset 0 0 0 2px #0008"}`,
        `opacity:${previewMode === "erase" ? ".35" : ".92"}`,
        "pointer-events:auto",
        "cursor:grab",
        "z-index:4"
      ].join(";");
      if (!previewMode) {
        block.onpointerdown = e => startGridBlockDrag(e, { start, end, note, charKey, noteId }, "move");
        ["left", "right"].forEach(side => {
          const grip = document.createElement("div");
          grip.dataset.resizeSide = side;
          grip.style.cssText = `position:absolute;${side}:0;top:0;bottom:0;width:7px;cursor:ew-resize;background:#0002;border-${side === "left" ? "right" : "left"}:1px solid #fff5`;
          grip.onpointerdown = e => startGridBlockDrag(e, { start, end, note, charKey, noteId }, side === "left" ? "resize-left" : "resize-right");
          block.appendChild(grip);
        });
      }
      board.appendChild(block);
    };

    const lanes = new Map();
    for (const [key, charKey] of gridCells) {
      if (hidden.has(key) || (preview.has(key) && gridDrag?.mode === "erase")) continue;
      const [col, note] = key.split(":").map(Number);
      const noteId = gridNoteIds.get(key) || `single:${key}`;
      const laneKey = `${charKey}:${note}:${noteId}`;
      if (!lanes.has(laneKey)) lanes.set(laneKey, { charKey, note, noteId, cols: [] });
      lanes.get(laneKey).cols.push(col);
    }
    for (const lane of lanes.values()) {
      lane.cols.sort((a, b) => a - b);
      for (let i = 0; i < lane.cols.length;) {
        const start = lane.cols[i];
        let end = start;
        while (i + 1 < lane.cols.length && lane.cols[i + 1] === end + 1) {
          i++;
          end = lane.cols[i];
        }
        drawBlock(start, end, lane.note, lane.charKey, "", lane.noteId);
        i++;
      }
    }
    if (preview.size) {
      const cols = [...preview].map(k => Number(k.split(":")[0])).sort((a, b) => a - b);
      drawBlock(cols[0], cols[cols.length - 1], gridDrag.note, gridDrag.charKey, gridDrag.mode, gridDrag.noteId);
    }
    drawGridEndBlock();
  }

  function drawGridEndBlock() {
    const board = gridOverlay?.querySelector("#grid-board");
    if (!board) return;
    const end = document.createElement("button");
    end.className = "osc-grid-end-block";
    end.textContent = "END";
    end.title = "Drag to choose where the song ends";
    end.style.cssText = [
      "position:absolute",
      `left:${gridLabelWidth + gridEndCol * gridCellWidth - 12}px`,
      "top:0",
      "bottom:0",
      "width:24px",
      "border:0",
      "border-left:3px solid #ffb729",
      "background:#ffb72933",
      "color:#ffda7a",
      "font:900 10px system-ui",
      "writing-mode:vertical-rl",
      "text-orientation:mixed",
      "cursor:ew-resize",
      "z-index:5"
    ].join(";");
    end.onpointerdown = startGridEndDrag;
    board.appendChild(end);
  }

  function selectGridCharacter(key) {
    gridSelectedKey = key;
    if (!gridOverlay) return;
    gridOverlay.querySelectorAll("[data-grid-tool]").forEach(btn => {
      const char = characterByKey(btn.dataset.gridTool);
      btn.style.outline = btn.dataset.gridTool === key ? "3px solid #38a7ff" : "0";
      btn.style.boxShadow = btn.dataset.gridTool === key ? "0 0 0 2px #111, 0 0 18px #38a7ff88" : "none";
      btn.style.background = char?.cssColor || "#fff";
    });
  }

  function gridWarning(text) {
    const el = gridOverlay?.querySelector("#grid-warning");
    if (!el) return alert(text);
    el.textContent = text;
    el.style.opacity = "1";
    clearTimeout(el.__timer);
    el.__timer = setTimeout(() => el.style.opacity = "0.72", 2500);
  }

  function gridRangeKeys(startCol, endCol, note) {
    const a = Math.min(startCol, endCol);
    const b = Math.max(startCol, endCol);
    const keys = [];
    for (let col = a; col <= b; col++) keys.push(`${col}:${note}`);
    return keys;
  }

  function gridCellFromEvent(e) {
    const point = e.touches?.[0] || e.changedTouches?.[0] || e;
    if (!point) return null;
    const board = gridOverlay?.querySelector("#grid-board");
    if (!board) return null;
    const rect = board.getBoundingClientRect();
    const col = Math.floor((point.clientX - rect.left - gridLabelWidth) / gridCellWidth);
    const note = gridHighNote - Math.floor((point.clientY - rect.top) / gridCellHeight);
    if (col < 0 || col >= gridCols || note < gridLowNote || note > gridHighNote) return null;
    return { dataset: { col, note } };
  }

  function gridHasConflict(keys, charKey) {
    return gridHasConflictExcept(keys, charKey, new Set(keys));
  }

  function gridHasConflictExcept(keys, charKey, ignore = new Set()) {
    for (const key of keys) {
      const [col, note] = key.split(":").map(Number);
      if (col < 0 || col >= gridCols || note < gridLowNote || note > gridHighNote) return true;
      for (const [usedKey, usedChar] of gridCells) {
        if (ignore.has(usedKey)) continue;
        const [usedCol] = usedKey.split(":").map(Number);
        if (usedCol === col && usedChar === charKey) return true;
      }
    }
    return false;
  }

  function writeGridRange(keys, charKey, noteId = gridNextNoteId++) {
    keys.forEach(k => {
      gridCells.set(k, charKey);
      gridNoteIds.set(k, noteId);
    });
    return noteId;
  }

  function previewGridNote(charKey, note, velocity = 96) {
    if (playing) return;
    const voice = characterByKey(charKey);
    if (!voice?.__startNow || !voice?.__setHzNow) return;
    clearTimeout(gridPreviewTimer);
    if (!voice.__polyVoicePatched) patchVoice(voice);
    if (gridPreviewVoice && gridPreviewVoice !== voice) {
      try { gridPreviewVoice.__stopNow(); } catch {}
    }
    try {
      const freq = hz(note);
      voice.__currentGridId = 0;
      if (voice.__isHeartWave) {
        const amount = clamp(Number(velocity) || 96, 1, 127) / 127;
        const loudness = shouldUseVelocity() ? 0.35 + amount * 0.65 : 1;
        try { if (w.Tone.context.state !== "running") w.Tone.start(); } catch {}
        try { voice.osc.toDestination?.(); } catch {}
        try { voice.osc.type = "triangle"; } catch {}
        try {
          if (!voice.__oscStarted) {
            voice.osc.start(0);
            voice.__oscStarted = true;
          }
        } catch {}
        voice.playing = true;
        voice.currentFrequency = freq;
        try { voice.osc.frequency.value = freq; } catch {}
        try { voice.osc.volume.value = voice.volume + 20 * Math.log10(loudness); } catch {}
        try { voice.vibrato.amplitude.value = 0.08 + amount * 0.07; } catch {}
        try { voice.stretchNode.set({ k: 1.4 + amount, damping: 0.3 }); } catch {}
        try { voice.mouthOpenNode.set({ k: 0.3, damping: 0.67, in: 0.6 + amount * 0.6, out: 0.25 + amount * 0.25 }); } catch {}
        try { voice.debounceBlink(); } catch {}
        updateLabel(voice);
      } else {
        voice.__setHzNow(freq);
        voice.__startNow(velocity);
        voice.__setHzNow(freq);
      }
      gridPreviewVoice = voice;
      gridPreviewTimer = setTimeout(() => {
        try { voice.__stopNow(); } catch {}
        if (gridPreviewVoice === voice) gridPreviewVoice = null;
      }, 260);
    } catch {}
  }

  function startGridBlockDrag(e, block, action) {
    e.preventDefault();
    e.stopPropagation();
    const oldKeys = new Set(gridRangeKeys(block.start, block.end, block.note));
    const length = block.end - block.start + 1;
    const startX = e.clientX, startY = e.clientY;

    const previewFor = ev => {
      const dx = Math.round((ev.clientX - startX) / gridCellWidth);
      const dy = Math.round((ev.clientY - startY) / gridCellHeight);
      let start = block.start, end = block.end;
      const note = clamp(block.note - dy, gridLowNote, gridHighNote);
      if (action === "move") {
        start = clamp(block.start + dx, 0, Math.max(0, gridCols - length));
        end = start + length - 1;
      } else if (action === "resize-left") {
        start = clamp(block.start + dx, 0, block.end);
      } else {
        end = clamp(block.end + dx, block.start, gridCols - 1);
      }
      return { start, end, note, keys: gridRangeKeys(start, end, note) };
    };

    gridDrag = { ...block, mode: action, ignore: oldKeys, preview: oldKeys };
    let lastPreviewNote = block.note;
    previewGridNote(block.charKey, block.note, 90);
    renderGridCells();
    const move = ev => {
      ev.preventDefault();
      const next = previewFor(ev);
      gridDrag = { ...block, ...next, mode: action, ignore: oldKeys, preview: new Set(next.keys) };
      if (next.note !== lastPreviewNote) {
        lastPreviewNote = next.note;
        previewGridNote(block.charKey, next.note, 90);
      }
      renderGridCells();
    };
    const up = ev => {
      ev.preventDefault();
      const next = previewFor(ev);
      if (gridHasConflictExcept(next.keys, block.charKey, oldKeys)) {
        gridWarning("That move would make one oscillator play 2 notes at the same time.");
      } else {
        oldKeys.forEach(k => {
          if (gridCells.get(k) === block.charKey) {
            gridCells.delete(k);
            gridNoteIds.delete(k);
          }
        });
        writeGridRange(next.keys, block.charKey, block.noteId || gridNextNoteId++);
      }
      gridDrag = null;
      renderGridCells();
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", up, true);
    };
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", up, true);
  }

  function startGridEndDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    const board = gridOverlay?.querySelector("#grid-board");
    const moveTo = ev => {
      const rect = board.getBoundingClientRect();
      gridEndCol = clamp(Math.round((ev.clientX - rect.left - gridLabelWidth) / gridCellWidth), 1, gridCols);
      renderGridCells();
    };
    const move = ev => { ev.preventDefault(); moveTo(ev); };
    const up = ev => {
      ev.preventDefault();
      moveTo(ev);
      gridWarning(`Song ends at bar ${(gridEndCol / gridStepsPerBar).toFixed(2)}.`);
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", up, true);
    };
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", up, true);
  }

  function startGridDrag(e, col, note) {
    e.preventDefault();
    e.stopPropagation();
    const key = `${col}:${note}`;
    const existing = gridCells.get(key);
    gridDrag = {
      startCol: col,
      endCol: col,
      note,
      charKey: gridSelectedKey,
      mode: existing === gridSelectedKey ? "erase" : "draw",
      noteId: gridNextNoteId++,
      preview: new Set([key])
    };
    if (gridDrag.mode === "draw") previewGridNote(gridDrag.charKey, note, 96);
    renderGridCells();

    const move = ev => {
      ev.preventDefault();
      const cell = gridCellFromEvent(ev);
      if (!cell) return;
      gridDrag.endCol = Number(cell.dataset.col);
      gridDrag.preview = new Set(gridRangeKeys(gridDrag.startCol, gridDrag.endCol, gridDrag.note));
      renderGridCells();
    };
    const up = ev => {
      ev.preventDefault();
      const keys = [...gridDrag.preview];
      if (gridDrag.mode === "erase") {
        keys.forEach(k => {
          if (gridCells.get(k) === gridDrag.charKey) {
            gridCells.delete(k);
            gridNoteIds.delete(k);
          }
        });
      } else if (gridHasConflict(keys, gridDrag.charKey)) {
        gridWarning("That oscillator already has a note during part of this held note.");
      } else {
        writeGridRange(keys, gridDrag.charKey, gridDrag.noteId);
      }
      gridDrag = null;
      renderGridCells();
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", up, true);
    };
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", up, true);
  }

  function createGridOverlay() {
    if (gridOverlay) return gridOverlay;
    const overlay = document.createElement("div");
    overlay.id = "osc-grid-overlay";
    overlay.style.cssText = "position:fixed;inset:0;z-index:999990;background:#24262b;color:#f3f4f6;font:700 13px system-ui,sans-serif;display:none;flex-direction:column;overflow:hidden";
    overlay.innerHTML = `
      <div style="min-height:56px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 16px;background:#17191d;border-bottom:1px solid #3a3d44;flex-wrap:wrap">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button data-grid-mode="normal" style="height:34px;min-width:78px;border:2px solid #222;border-radius:8px;background:#f7f7f7;font:900 13px system-ui;cursor:pointer">Normal</button>
          <button data-grid-mode="studio" title="Play the current grid song in the studio layout from the beginning" style="height:34px;min-width:98px;border:2px solid #222;border-radius:8px;background:#f7f7f7;font:900 13px system-ui;cursor:pointer">Studio Play</button>
          <button data-grid-mode="grid" style="height:34px;min-width:78px;border:2px solid #222;border-radius:8px;background:#ffb729;font:900 13px system-ui;cursor:pointer">Grid</button>
          <div style="margin-left:8px">Grid Sequencer <span style="font-size:12px;font-weight:600;color:#aeb4bf">(16 steps/bar, C3-F#6)</span></div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <label style="display:flex;gap:6px;align-items:center;color:#c5cbd5">Title <input id="grid-song-title" type="text" value="${songTitle}" style="width:150px;height:28px;border:1px solid #59606c;border-radius:7px;background:#20232a;color:#fff;font:inherit;padding:0 6px"></label>
          <label style="display:flex;gap:6px;align-items:center;color:#c5cbd5">Bars <input id="grid-bars" type="number" min="1" max="${gridMaxBars}" value="${gridBars}" style="width:62px;height:28px;border:1px solid #59606c;border-radius:7px;background:#20232a;color:#fff;font:inherit;padding:0 6px"></label>
          <label title="Show or remove the Heart character from Normal and Grid modes" style="height:32px;display:flex;gap:6px;align-items:center;border:1px solid #59606c;border-radius:7px;background:#2f333a;color:#f3f4f6;font:inherit;padding:0 9px;cursor:pointer"><input id="grid-heart-toggle" data-osc-character="heart" type="checkbox" ${disabledCharacters.has("heart") ? "" : "checked"}> Heart</label>
          <button id="grid-save-json" style="height:32px;border:1px solid #59606c;border-radius:7px;background:#2f333a;color:#f3f4f6;font:inherit">Save JSON</button>
          <label style="height:32px;display:flex;align-items:center;border:1px solid #59606c;border-radius:7px;background:#2f333a;color:#f3f4f6;font:inherit;padding:0 9px;cursor:pointer">Import JSON<input id="grid-json" type="file" accept=".json,application/json" style="display:none"></label>
          <button id="grid-tutorial" style="height:32px;border:1px solid #59606c;border-radius:7px;background:#2f333a;color:#f3f4f6;font:inherit">Tutorial</button>
          <button id="grid-clear" style="height:32px;border:1px solid #59606c;border-radius:7px;background:#2f333a;color:#f3f4f6;font:inherit">Clear</button>
          <button id="grid-play-grid" style="height:32px;border:1px solid #2388d9;border-radius:7px;background:#2494ed;color:#fff;font:inherit">Play in Grid</button>
          <button id="grid-play-studio" style="height:32px;border:1px solid #ffb729;border-radius:7px;background:#ffb729;color:#111;font:inherit">Play in Studio</button>
        </div>
      </div>
      <div id="grid-warning" style="padding:8px 16px;background:#2f333a;color:#ffc4d8;border-bottom:1px solid #454a55;opacity:.78">Warning: one oscillator cannot play 2 notes at the same time. Drag notes, resize their edges, and drag the END marker to choose the song length.</div>
      <div id="grid-scroll" style="flex:1;min-height:0;min-width:0;overflow:auto;padding:14px;background:#24262b;scrollbar-gutter:stable both-edges;touch-action:pan-x pan-y">
        <div id="grid-board" style="position:relative"></div>
      </div>
      <div id="grid-tools" style="flex:0 0 auto;display:flex;gap:8px;align-items:center;padding:12px 16px;background:#17191d;border-top:1px solid #3a3d44;overflow-x:auto"></div>
    `;
    document.body.appendChild(overlay);
    gridOverlay = overlay;

    buildGridBoard();
    overlay.querySelector("#grid-song-title").oninput = e => {
      songTitle = String(e.target.value || "").trim() || "Untitled Song";
    };
    overlay.querySelector("#grid-bars").onchange = e => setGridBars(e.target.value);
    overlay.querySelector("#grid-bars").oninput = e => setGridBars(e.target.value);
    overlay.querySelector("#grid-heart-toggle").onchange = e => setCharacterEnabled("heart", e.target.checked);
    overlay.querySelector('[data-grid-mode="normal"]').onclick = applyNormalMode;
    overlay.querySelector('[data-grid-mode="studio"]').onclick = () => playGridSong("studio");
    overlay.querySelector('[data-grid-mode="grid"]').onclick = applyGridMode;
    overlay.querySelector("#grid-save-json").onclick = saveGridSongJson;
    overlay.querySelector("#grid-json").onchange = e => {
      importGridSongJson(e.target.files[0]);
      e.target.value = "";
    };
    overlay.querySelector("#grid-tutorial").onclick = showGridTutorial;
    overlay.querySelector("#grid-clear").onclick = () => {
      gridCells.clear();
      gridNoteIds.clear();
      gridNextNoteId = 1;
      renderGridCells();
    };
    overlay.querySelector("#grid-play-grid").onclick = () => playGridSong("grid");
    overlay.querySelector("#grid-play-studio").onclick = () => playGridSong("studio");
    overlay.querySelector("#grid-scroll").onwheel = e => {
      const scroller = e.currentTarget;
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) && (e.shiftKey || e.ctrlKey)) {
        scroller.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    return overlay;
  }

  function buildGridBoard() {
    if (!gridOverlay) return;
    const board = gridOverlay.querySelector("#grid-board");
    board.innerHTML = `<div id="grid-playhead" style="position:absolute;top:0;bottom:0;left:${gridLabelWidth}px;width:3px;background:#2f9cff;box-shadow:0 0 14px #2f9cff;pointer-events:none;display:none;z-index:6"></div>`;
    board.style.cssText = `position:relative;display:grid;grid-template-columns:${gridLabelWidth}px repeat(${gridCols},${gridCellWidth}px);grid-auto-rows:${gridCellHeight}px;align-items:stretch;width:max-content;border:1px solid #3f444d;background:#1b1d22;box-shadow:0 18px 42px #0005`;
    for (let note = gridHighNote; note >= gridLowNote; note--) {
      const label = document.createElement("div");
      label.textContent = noteName(note);
      label.style.cssText = "display:flex;align-items:center;justify-content:center;background:#16181c;color:#c5cbd5;border-right:1px solid #3f444d;border-bottom:1px solid #30343b;font-size:11px;position:sticky;left:0;z-index:2";
      board.appendChild(label);
      for (let col = 0; col < gridCols; col++) {
        const cell = document.createElement("button");
        cell.className = "osc-grid-cell";
        cell.dataset.col = col;
        cell.dataset.note = note;
        cell.style.cssText = `width:${gridCellWidth}px;height:${gridCellHeight}px;border:0;border-right:${col % gridStepsPerBar === gridStepsPerBar - 1 ? 2 : 1}px solid ${col % 4 === 3 ? "#4c5360" : "#333842"};border-bottom:1px solid #30343b;background:#2d3138;cursor:crosshair;padding:0`;
        cell.onpointerdown = e => startGridDrag(e, col, note);
        board.appendChild(cell);
      }
    }
    renderGridCells();
  }

  function setGridBars(value) {
    const next = clamp(Math.round(Number(value) || 1), 1, gridMaxBars);
    if (next === gridBars) return;
    gridBars = next;
    gridCols = gridBars * gridStepsPerBar;
    gridEndCol = clamp(gridEndCol, 1, gridCols);
    for (const key of [...gridCells.keys()]) {
      const [col] = key.split(":").map(Number);
      if (col >= gridCols) {
        gridCells.delete(key);
        gridNoteIds.delete(key);
      }
    }
    const input = gridOverlay?.querySelector("#grid-bars");
    if (input) input.value = gridBars;
    buildGridBoard();
  }

  function safeSongFilename(title) {
    return (String(title || "Untitled Song").trim() || "Untitled Song")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ")
      .slice(0, 80);
  }

  function serializeGridSong() {
    return {
      kind: "oscillator-grid-song",
      version: 1,
      title: songTitle,
      bars: gridBars,
      endCol: gridEndCol,
      selectedCharacter: gridSelectedKey,
      characterOrder: [...characterOrder],
      disabledCharacters: [...disabledCharacters],
      characters: orderedVoiceChars().map(c => ({
        key: characterKey(c),
        baseKey: characterBaseKey(c),
        name: characterName(c),
        disabled: disabledCharacters.has(characterKey(c)),
      })),
      cells: [...gridCells.entries()].map(([cell, charKey]) => ({
        cell,
        charKey,
        noteId: gridNoteIds.get(cell) || null,
      })),
    };
  }

  function saveGridSongJson() {
    const titleInput = gridOverlay?.querySelector("#grid-song-title");
    songTitle = String(titleInput?.value || songTitle || "").trim() || "Untitled Song";
    const blob = new Blob([JSON.stringify(serializeGridSong(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeSongFilename(songTitle)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    gridWarning(`Saved "${songTitle}" as JSON.`);
  }

  function applyGridSongSnapshot(snapshot) {
    if (!snapshot || snapshot.kind !== "oscillator-grid-song" || !Array.isArray(snapshot.cells)) {
      throw new Error("That JSON is not an oscillator grid song.");
    }
    songTitle = String(snapshot.title || "Untitled Song").trim() || "Untitled Song";
    gridBars = clamp(Math.round(Number(snapshot.bars) || 8), 1, gridMaxBars);
    gridCols = gridBars * gridStepsPerBar;
    gridEndCol = clamp(Math.round(Number(snapshot.endCol) || gridCols), 1, gridCols);
    gridSelectedKey = snapshot.selectedCharacter || gridSelectedKey;
    if (Array.isArray(snapshot.characters)) {
      snapshot.characters.forEach(def => {
        const key = String(def.key || "");
        if (!key || orderedVoiceChars().some(c => characterKey(c) === key)) return;
        const baseKey = String(def.baseKey || key).split("-")[0];
        if (typeof w.Character2 !== "function") return;
        const clone = new w.Character2(oscillatorConfig(baseKey));
        if (baseKey === "heart") finishHeartCharacter(clone);
        if (baseKey === "star") finishStarCharacter(clone);
        clone.__baseKey = baseKey;
        clone.__cloneKey = key;
        clone.__displayName = String(def.name || key);
        const serialMatch = key.match(/-(\d+)$/);
        if (serialMatch) cloneSerial = Math.max(cloneSerial, Number(serialMatch[1]) || cloneSerial);
        clone.container.position.y = clone.container.height / 4;
        chars.push(clone);
        patchVoice(clone);
      });
    }
    if (Array.isArray(snapshot.characterOrder)) {
      characterOrder = snapshot.characterOrder.filter(key => orderedVoiceChars().some(c => characterKey(c) === key));
    }
    disabledCharacters.clear();
    if (Array.isArray(snapshot.disabledCharacters)) {
      snapshot.disabledCharacters.forEach(key => disabledCharacters.add(String(key)));
    }
    gridCells.clear();
    gridNoteIds.clear();
    gridNextNoteId = 1;
    snapshot.cells.forEach(item => {
      const [col, note] = String(item.cell || "").split(":").map(Number);
      if (!Number.isFinite(col) || !Number.isFinite(note) || col < 0 || col >= gridCols || note < gridLowNote || note > gridHighNote) return;
      const cell = `${col}:${note}`;
      gridCells.set(cell, item.charKey || "square");
      const noteId = Math.max(1, Math.round(Number(item.noteId) || gridNextNoteId++));
      gridNoteIds.set(cell, noteId);
      gridNextNoteId = Math.max(gridNextNoteId, noteId + 1);
    });
    createGridOverlay();
    const titleInput = gridOverlay.querySelector("#grid-song-title");
    if (titleInput) titleInput.value = songTitle;
    const barsInput = gridOverlay.querySelector("#grid-bars");
    if (barsInput) barsInput.value = gridBars;
    document.querySelectorAll("[data-osc-character]").forEach(input => {
      input.checked = !disabledCharacters.has(input.dataset.oscCharacter);
    });
    buildGridBoard();
    refreshVoices();
    refreshGridTools();
    renderGridCells();
    gridWarning(`Imported "${songTitle}".`);
  }

  function importGridSongJson(fileObj) {
    if (!fileObj) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        applyGridSongSnapshot(JSON.parse(String(reader.result || "")));
      } catch (err) {
        gridWarning(err.message || "Could not import JSON.");
      }
    };
    reader.readAsText(fileObj);
  }

  function showGridTutorial() {
    document.getElementById("grid-tutorial-modal")?.remove();
    const modal = document.createElement("div");
    modal.id = "grid-tutorial-modal";
    modal.style.cssText = "position:fixed;inset:0;z-index:1000001;background:#0009;display:grid;place-items:center;color:#f4f6f8;font:700 14px system-ui";
    modal.innerHTML = `
      <div style="width:min(560px,calc(100vw - 32px));background:#20232a;border:1px solid #59606c;border-radius:10px;box-shadow:0 24px 70px #0008;padding:18px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px">
          <div style="font-size:20px">Grid Tutorial</div>
          <button id="grid-tutorial-close" style="width:34px;height:34px;border:1px solid #59606c;border-radius:8px;background:#2f333a;color:#fff;font:900 16px system-ui;cursor:pointer">x</button>
        </div>
        <div style="display:grid;gap:10px;color:#d7dce5;font-weight:650;line-height:1.35">
          <div>Pick a character from the bottom toolbar, then drag across the grid to create a held note.</div>
          <div>Drag the middle of an existing note to move it left, right, up, or down.</div>
          <div>Drag the left or right edge of a note to shorten or extend it.</div>
          <div>Drag the orange END marker to control where playback stops.</div>
          <div>Use Save JSON and Import JSON to keep titled grid songs, then use Play in Grid or Studio Play.</div>
        </div>
      </div>
    `;
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    modal.querySelector("#grid-tutorial-close").onclick = () => modal.remove();
    document.body.appendChild(modal);
  }

  function refreshGridTools() {
    createGridOverlay();
    const tools = gridOverlay.querySelector("#grid-tools");
    tools.innerHTML = "";
    for (const c of getVisibleChars()) {
      const wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;align-items:center;gap:4px;flex:0 0 auto";
      const btn = document.createElement("button");
      btn.dataset.gridTool = characterKey(c);
      btn.textContent = characterName(c);
      btn.style.cssText = `height:42px;min-width:88px;border:2px solid #222;border-radius:8px;color:#111;background:${c.cssColor};font:900 13px system-ui;cursor:pointer`;
      btn.onclick = () => selectGridCharacter(characterKey(c));
      const dup = document.createElement("button");
      dup.textContent = "+";
      dup.title = `Duplicate ${characterName(c)}`;
      dup.style.cssText = "width:32px;height:42px;border:2px solid #222;border-radius:8px;background:#ffb729;color:#111;font:900 16px system-ui;cursor:pointer";
      dup.onclick = () => duplicateCharacter(characterKey(c));
      wrap.append(btn, dup);
      tools.appendChild(wrap);
    }
    if (!getVisibleChars().some(c => characterKey(c) === gridSelectedKey)) gridSelectedKey = characterKey(getVisibleChars()[0] || orderedVoiceChars()[0]);
    selectGridCharacter(gridSelectedKey);
  }

  function buildGridEvents() {
    refreshVoices();
    const voiceByKey = new Map(voices.map((v, i) => [characterKey(v), i]));
    const step = 0.125;
    const out = [];
    let id = 1;
    const lanes = new Map();
    for (const [key, charKey] of gridCells) {
      const [col, note] = key.split(":").map(Number);
      if (col >= gridEndCol) continue;
      const noteId = gridNoteIds.get(key) || `single:${key}`;
      const laneKey = `${charKey}:${note}:${noteId}`;
      if (!lanes.has(laneKey)) lanes.set(laneKey, { charKey, note, noteId, cols: [] });
      lanes.get(laneKey).cols.push(col);
    }
    for (const lane of lanes.values()) {
      lane.cols.sort((a, b) => a - b);
      const voiceIndex = voiceByKey.get(lane.charKey);
      if (voiceIndex == null) continue;
      for (let i = 0; i < lane.cols.length;) {
        const start = lane.cols[i];
        let end = start;
        while (i + 1 < lane.cols.length && lane.cols[i + 1] === end + 1) {
          i++;
          end = lane.cols[i];
        }
        end = Math.min(end, gridEndCol - 1);
        const eid = id++;
        const onTime = start * step;
        const offTime = Math.max(onTime + 0.035, (end + 1) * step - gridRetriggerGap);
        out.push({ type: "on", time: onTime, voiceIndex, note: lane.note, vel: 110, id: eid });
        out.push({ type: "off", time: offTime, voiceIndex, id: eid });
        i++;
      }
    }
    return out.sort((a, b) => a.time - b.time || (a.type === "off" ? -1 : 1));
  }

  function showGridBackButton() {
    document.getElementById("grid-back-button")?.remove();
    const back = document.createElement("button");
    back.id = "grid-back-button";
    back.textContent = "Back to Grid";
    back.style.cssText = "position:fixed;top:14px;left:14px;z-index:999999;height:38px;border:2px solid #222;border-radius:8px;background:#ffb729;color:#111;font:900 13px system-ui;box-shadow:0 8px 22px #0003;cursor:pointer";
    back.onclick = () => {
      stopSong("Stopped.");
      gridPlayReturn = false;
      back.remove();
      const panel = document.getElementById("poly-osc-mod");
      if (panel) panel.style.display = "block";
      applyGridMode();
    };
    document.body.appendChild(back);
  }

  function playGridSong(view = "grid") {
    const gridEvents = buildGridEvents();
    if (!gridEvents.length) return gridWarning("Place at least one grid note first.");
    const playInStudio = view === "studio";
    playing = false;
    cancelAnimationFrame(raf);
    events = gridEvents;
    renderGridCells();
    const playhead = gridOverlay?.querySelector("#grid-playhead");
    if (playhead) {
      playhead.style.display = playInStudio ? "none" : "block";
      playhead.style.left = `${gridLabelWidth}px`;
    }
    const panel = document.getElementById("poly-osc-mod");
    if (panel) panel.style.display = "none";
    gridPlayReturn = playInStudio;
    if (playInStudio) applyStudioMode();
    events = gridEvents;
    if (gridOverlay) gridOverlay.style.display = playInStudio ? "none" : "flex";
    if (playInStudio) showGridBackButton();
    else document.getElementById("grid-back-button")?.remove();
    voices.forEach(v => { v.__currentGridId = 0; v.__stopNow(); });
    playing = true; eventIndex = 0; startMs = performance.now();

    const total = Math.max(0.125, gridEndCol * 0.125);
    const loop = () => {
      if (!playing) return;
      const now = (performance.now() - startMs) / 1000;
      while (eventIndex < events.length && events[eventIndex].time <= now) {
        const e = events[eventIndex++], v = voices[e.voiceIndex];
        if (!v) continue;
        if (e.type === "on") { v.__stopNow(); v.__currentGridId = e.id; v.__setHzNow(hz(e.note)); v.__startNow(e.vel); }
        else if (v.__currentGridId === e.id) v.__stopNow();
      }
      chars.forEach(updateLabel);
      positionLabels();
      if (playhead && !playInStudio) playhead.style.left = `${gridLabelWidth + Math.min(1, now / total) * gridEndCol * gridCellWidth}px`;
      if (now > total + 0.03) {
        if (playhead) playhead.style.display = "none";
        stopSong("Done.");
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
  }

  function applyGridMode() {
    currentMode = "grid";
    gridPlayReturn = false;
    stopSong("Stopped.");
    const panel = document.getElementById("poly-osc-mod");
    if (panel) panel.style.display = "none";
    const playhead = gridOverlay?.querySelector("#grid-playhead");
    if (playhead) playhead.style.display = "none";
    if (caption) caption.style.display = "none";
    chars.forEach(c => {
      c.container.visible = false;
      if (c.__domLabel) c.__domLabel.style.display = "none";
    });
    refreshGridTools();
    renderGridCells();
    gridOverlay.style.display = "flex";
    document.getElementById("grid-back-button")?.remove();
    syncModeUi();
  }

  function applyNormalMode() {
    currentMode = "normal";
    gridPlayReturn = false;
    hideGridOverlay();
    document.getElementById("grid-back-button")?.remove();
    const panel = document.getElementById("poly-osc-mod");
    if (panel && !uiHidden) panel.style.display = "block";
    draggedCharacter = null;
    refreshVoices();
    stopSong("Stopped.");
    const visible = getVisibleChars();

    if (w.__polyOscStudioResize) {
      w.removeEventListener("resize", w.__polyOscStudioResize);
      w.__polyOscStudioResize = null;
    }
    if (caption) {
      caption.style.display = "block";
      caption.style.visibility = "visible";
      caption.style.opacity = "1";
    }
    carousel.container.position.y = 0;
    chars.forEach(c => {
      c.container.visible = visible.includes(c);
      c.container.alpha = 1;
      c.container.scale.set(1);
      c.container.position.y = c.container.height / 4;
      c.__polyWasLaidOut = false;
      if (c.__domLabel) c.__domLabel.style.display = "none";
    });

    carousel.children = visible.map(c => c.container);
    if (carousel.container.removeChildren) carousel.container.removeChildren();
    visible.forEach(c => carousel.container.addChild(c.container));

    carousel.update = function() {
      const target = this.grabbed ? this.grabTarget : -this.activeChildIndex * this.childWidth;
      const ease = this.grabbed ? (this.disableFeedback ? 0 : 0.5) : (this.restEasing ?? 0.25);
      const delta = target - this.container.position.x;
      this.container.position.x = Math.abs(delta) > 0 && Math.abs(delta) < 1 ? target : this.container.position.x + delta * ease;
    };

    carousel.arrive = function() {
      this.container.position.x = this.grabbed ? this.grabTarget : this.targetXPosition;
    };

    carousel.setChildWidth = function(cw) {
      this.childWidth = cw || this.childWidth || w.innerWidth;
      this.children.forEach((child, i) => child.position.x = i * this.childWidth);
      this.setActive(this.activeChildIndex || 0);
    };

    carousel.setActive = function(i) {
      const index = clamp(Number(i) || 0, 0, Math.max(0, visible.length - 1));
      const now = performance.now();
      if (
        this.__polyOscNormalReady &&
        now - (this.__polyOscLastNormalSetAt || 0) < 140 &&
        index !== this.activeChildIndex &&
        Math.abs(index - this.activeChildIndex) === 1
      ) return;
      this.__polyOscLastNormalSetAt = now;
      this.activeChildIndex = index;
      this.targetXPosition = -index * (this.childWidth || w.innerWidth);
      w.activeCharacter = visible[index] || voices[0];
      if (domType && w.activeCharacter) {
        domType.innerHTML = `'${w.activeCharacter.__displayName || w.activeCharacter.type}'`;
        domType.style.color = w.activeCharacter.cssColor;
      }
      if (domFreq && w.activeCharacter) {
        domFreq.innerHTML = Math.round(w.activeCharacter.currentFrequency || w.activeCharacter.osc?.frequency?.value || 0);
        domFreq.style.color = w.activeCharacter.cssColor;
      }
      if (this.prevButton) {
        this.prevButton.style.display = visible.length > 1 ? "" : "none";
        this.prevButton.classList.toggle("hidden", index === 0);
      }
      if (this.nextButton) {
        this.nextButton.style.display = visible.length > 1 ? "" : "none";
        this.nextButton.classList.toggle("hidden", index === visible.length - 1);
      }
    };

    carousel.next = function() {
      const now = performance.now();
      if (now - (this.__polyOscLastArrowAt || 0) < 120) return;
      this.__polyOscLastArrowAt = now;
      this.setActive((this.activeChildIndex || 0) + 1);
    };

    carousel.prev = function() {
      const now = performance.now();
      if (now - (this.__polyOscLastArrowAt || 0) < 120) return;
      this.__polyOscLastArrowAt = now;
      this.setActive((this.activeChildIndex || 0) - 1);
    };

    if (carousel.nextListener) carousel.nextListener.listener = carousel.next.bind(carousel);
    if (carousel.prevListener) carousel.prevListener.listener = carousel.prev.bind(carousel);

    carousel.__polyOscNormalReady = false;
    carousel.setChildWidth(carousel.childWidth || w.innerWidth);
    carousel.setActive(Math.min(carousel.activeChildIndex || 0, Math.max(0, visible.length - 1)));
    carousel.__polyOscNormalReady = true;
    carousel.__polyOscLastNormalSetAt = 0;
    if (typeof carousel.update === "function") carousel.update.call(carousel);
    syncModeUi();
  }

  function applyStudioMode() {
    currentMode = "studio";
    hideGridOverlay();
    if (!gridPlayReturn) document.getElementById("grid-back-button")?.remove();
    const panel = document.getElementById("poly-osc-mod");
    if (panel && !uiHidden && !gridPlayReturn) panel.style.display = "block";
    refreshVoices();
    if (caption) caption.style.display = "none";
    installAllVisibleStage();
    syncModeUi();
  }

  function patchVoice(v) {
    if (!v.__polyStarUpdatePatched && typeof v.update === "function") {
      v.__polyStarUpdatePatched = true;
      const originalUpdate = v.update;
      v.update = function(...args) {
        originalUpdate.apply(this, args);
        if (this.__isStarWave) {
          installStarVoice(this);
          const freq = Number(this.currentFrequency || this.osc?.frequency?.value || 440);
          (this.__starLayers || []).forEach(layer => {
            try {
              layer.osc.frequency.value = freq * layer.ratio;
              if (this.playing) {
                layer.osc.volume.value = this.volume + layer.offset;
                if (!layer.started) {
                  layer.osc.start(0);
                  layer.started = true;
                }
              }
            } catch {}
          });
        }
        updateCustomMouthWaves(this);
      };
    }
    if (v.__isStarWave && !v.__polyManualStarAudioPatched) {
      v.__polyManualStarAudioPatched = true;
      const originalStart = v.start;
      const originalStop = v.stop;
      v.start = function(...args) {
        const result = originalStart?.apply(this, args);
        installStarVoice(this);
        const freq = Number(this.currentFrequency || this.osc?.frequency?.value || 440);
        (this.__starLayers || []).forEach(layer => {
          try {
            layer.osc.frequency.value = freq * layer.ratio;
            layer.osc.volume.value = this.volume + layer.offset;
            if (!layer.started) {
              layer.osc.start(0);
              layer.started = true;
            }
          } catch {}
        });
        return result;
      };
      v.stop = function(...args) {
        const result = originalStop?.apply(this, args);
        (this.__starLayers || []).forEach(layer => {
          try { layer.osc.volume.value = -Infinity; } catch {}
        });
        return result;
      };
    }
    if (v.__polyVoicePatched) return;
    v.__polyVoicePatched = true;
    v.__oscStarted = false;

    v.__startNow = function (velocity = 100) {
      const useVelocity = shouldUseVelocity();
      const amount = useVelocity ? clamp(Number(velocity) || 64, 1, 127) / 127 : 1;
      const loudness = useVelocity ? 0.35 + amount * 0.65 : 1;
      const animation = useVelocity ? 0.45 + amount * 0.85 : 1;
      const velocityDb = useVelocity ? 20 * Math.log10(loudness) : 0;

      if (w.Tone.context.state !== "running") w.Tone.start();
      this.playing = true;
      this.osc.volume.value = this.volume + velocityDb;
      if (this.__isStarWave) {
        installStarVoice(this);
        this.osc.volume.value = this.volume - 2 + velocityDb;
        (this.__starLayers || []).forEach(layer => {
          try {
            layer.osc.volume.value = this.volume + layer.offset + velocityDb;
            if (!layer.started) {
              layer.osc.start(0);
              layer.started = true;
            }
          } catch {}
        });
      }
      this.vibrato.amplitude.value = useVelocity ? 0.08 + amount * 0.07 : 0.15;
      if (!this.__oscStarted) {
        try { this.osc.start(0); } catch {}
        this.__oscStarted = true;
      }
      this.stretchNode.set({ k: useVelocity ? 1.4 + animation : 2, damping: 0.3 });
      this.mouthOpenNode.set({ k: 0.3, damping: 0.67, in: animation, out: 0.25 + amount * 0.25 });
      this.debounceBlink();
      updateLabel(this);
    };

    v.__stopNow = function () {
      this.playing = false;
      this.osc.volume.value = -Infinity;
      if (this.__isStarWave) {
        (this.__starLayers || []).forEach(layer => {
          try { layer.osc.volume.value = -Infinity; } catch {}
        });
      }
      this.stretchNode.set({ in: 0, k: 0.4, damping: 0.67 });
      this.mouthOpenNode.set({ in: 0 });
      this.debounceBlink();
      updateLabel(this);
    };

    v.__setHzNow = function (freq) {
      freq = Math.max(this.minFrequency, Math.min(this.maxFrequency, freq));
      this.currentFrequency = freq;
      const stretchTarget = -1 + 2 * ((freq - this.minFrequency) / (this.maxFrequency - this.minFrequency));
      try { this.osc.frequency.cancelScheduledValues?.(w.Tone.now()); } catch {}
      this.stretchNode.signals.in.value = stretchTarget;
      this.osc.frequency.value = freq;
      if (this.__isStarWave) {
        installStarVoice(this);
        (this.__starLayers || []).forEach(layer => {
          try { layer.osc.frequency.value = freq * layer.ratio; } catch {}
        });
      }
      updateLabel(this);
    };
  }

  function shouldUseVelocity() {
    return true;
  }

  function stopSong(msg = "Stopped.") {
    playing = false; cancelAnimationFrame(raf);
    clearTimeout(gridPreviewTimer);
    if (gridPreviewVoice) { try { gridPreviewVoice.__stopNow(); } catch {} gridPreviewVoice = null; }
    voices.forEach(v => v.__stopNow());
    const play = document.getElementById("play");
    const stopBtn = document.getElementById("stop");
    const status = document.getElementById("status");
    if (play) play.disabled = !events.length;
    if (stopBtn) stopBtn.disabled = true;
    if (status) status.textContent = events.length ? msg : `Ready. Enabled characters: ${voices.length}.`;
  }

  installLabels();
  chars.forEach(patchVoice);
  document.getElementById("poly-osc-mod")?.remove();

  const panel = document.createElement("div");
  panel.id = "poly-osc-mod";
  panel.style.cssText = "position:fixed;top:14px;right:14px;z-index:999999;width:min(410px,calc(100vw - 28px));min-width:290px;min-height:190px;max-width:calc(100vw - 8px);max-height:calc(100vh - 8px);background:#fff;color:#222;border:2px solid #222;border-radius:12px;box-shadow:0 12px 34px #0003;font:700 13px system-ui,sans-serif;overflow:auto";
  panel.innerHTML = `
    <div id="drag" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#ffb729;border-bottom:2px solid #222;cursor:move;user-select:none">
      <b>Oscillator Mod</b><button id="close" style="border:0;background:transparent;font:900 18px system-ui;cursor:pointer">x</button>
    </div>
    <div style="padding:12px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button id="mode-normal" style="height:36px;border:2px solid #222;border-radius:8px;background:#ffb729;font:inherit;cursor:pointer">Normal</button>
        <button id="mode-grid" style="height:36px;border:2px solid #222;border-radius:8px;background:#fff;font:inherit;cursor:pointer">Grid</button>
      </div>
      <div style="margin-top:10px">
        <div style="font-size:12px;color:#555;margin-bottom:5px">Characters</div>
        <div id="character-toggles" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 10px">
          ${orderedVoiceChars().map(c => `<label title="${characterKey(c) === "heart" ? "Show or remove Heart in Normal and Grid modes" : "Show or hide this character"}" style="display:flex;align-items:center;gap:7px;min-width:0"><input data-osc-character="${characterKey(c)}" type="checkbox" ${isCharacterEnabled(c) ? "checked" : ""}> <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${c.cssColor}">${characterName(c)}</span></label>`).join("")}
        </div>
      </div>
      <div id="status" style="margin-top:10px;color:#555;font-size:12px">Ready. Use Grid to write, save, import, and play songs.</div>
    </div>
    <div id="resize-grip" title="Resize" style="position:absolute;right:0;bottom:0;width:20px;height:20px;cursor:nwse-resize;background:linear-gradient(135deg,transparent 0 45%,#222 46% 55%,transparent 56% 63%,#222 64% 73%,transparent 74%);opacity:.7"></div>`;
  document.body.appendChild(panel);
  syncCharacterToggleList();

  const status = panel.querySelector("#status");
  const characterToggles = [...panel.querySelectorAll("[data-osc-character]")];
  const modeNormal = panel.querySelector("#mode-normal");
  const modeGrid = panel.querySelector("#mode-grid");
  const drag = panel.querySelector("#drag");
  const resizeGrip = panel.querySelector("#resize-grip");

  drag.onpointerdown = e => {
    if (e.target.closest("button,input,label")) return;
    const rect = panel.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY;
    const startLeft = rect.left, startTop = rect.top;
    panel.style.left = `${startLeft}px`;
    panel.style.top = `${startTop}px`;
    panel.style.right = "auto";
    panel.setPointerCapture?.(e.pointerId);

    const move = ev => {
      const nextLeft = clamp(startLeft + ev.clientX - startX, 4, window.innerWidth - panel.offsetWidth - 4);
      const nextTop = clamp(startTop + ev.clientY - startY, 4, window.innerHeight - panel.offsetHeight - 4);
      panel.style.left = `${nextLeft}px`;
      panel.style.top = `${nextTop}px`;
    };
    const up = ev => {
      panel.releasePointerCapture?.(ev.pointerId);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  resizeGrip.onpointerdown = e => {
    e.preventDefault();
    e.stopPropagation();
    const rect = panel.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY;
    const startWidth = rect.width, startHeight = rect.height;
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.top}px`;
    panel.style.right = "auto";
    panel.setPointerCapture?.(e.pointerId);

    const move = ev => {
      const maxWidth = window.innerWidth - rect.left - 4;
      const maxHeight = window.innerHeight - rect.top - 4;
      panel.style.width = `${clamp(startWidth + ev.clientX - startX, 290, maxWidth)}px`;
      panel.style.height = `${clamp(startHeight + ev.clientY - startY, 190, maxHeight)}px`;
    };
    const up = ev => {
      panel.releasePointerCapture?.(ev.pointerId);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  characterToggles.forEach(input => input.onchange = () => {
    setCharacterEnabled(input.dataset.oscCharacter, input.checked);
  });
  modeNormal.onclick = applyNormalMode;
  modeGrid.onclick = applyGridMode;
  panel.querySelector("#close").onclick = () => { stopSong(); panel.remove(); };
  refreshVoices();
  if (!voices.length) return alert("Could not find oscillator voices.");
  applyNormalMode();
  status.textContent = `Ready. Normal mode is active. Use Grid to make and save songs.`;

  if (window.__polyOscYHandler) document.removeEventListener("keydown", window.__polyOscYHandler);
  window.__polyOscYHandler = e => {
    if (e.key.toLowerCase() !== "y") return;
    if (document.activeElement && ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
    setUiHidden(!uiHidden);
  };
  document.addEventListener("keydown", window.__polyOscYHandler);
})();
