/* ============================================================================
   ♥ AUDIO — a music-box "Happy Birthday" + little sound effects
   ----------------------------------------------------------------------------
   No audio files required: everything is synthesised with the Web Audio API.
   A gentle music-box waltz of "Happy Birthday" (public domain) over a warm
   pad, with soft chimes for magical moments. It loops forever and starts only
   after a real user gesture (the "Open" button).
   ========================================================================== */

const AudioEngine = (() => {
  "use strict";

  let ctx = null;
  let master = null;
  let dry = null;
  let wet = null;
  let reverb = null;
  let musicBus = null;
  let started = false;
  let muted = false;
  let tuneTimer = null;

  const MUSIC_LEVEL = 0.58;
  const BEAT = 0.62; // seconds per beat (~97 bpm, a gentle waltz)

  const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /* "Happy Birthday to You" — one bar per phrase, in C major.
     [midi note, beats]; 0 is a rest. */
  const MELODY = [
    [67, 0.5], [67, 0.5], [69, 1], [67, 1], [72, 1], [71, 2], [0, 1],
    [67, 0.5], [67, 0.5], [69, 1], [67, 1], [74, 1], [72, 2], [0, 1],
    [67, 0.5], [67, 0.5], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2],
    [77, 0.5], [77, 0.5], [76, 1], [72, 1], [74, 1], [72, 2], [0, 1],
  ];

  /* Soft pads under the tune: [start beat, midi chord, length in beats] */
  const PADS = [
    [0, [48, 55, 64, 67], 4.2],
    [4, [43, 50, 59, 62], 3.2],
    [7, [43, 50, 59, 62], 4.2],
    [11, [48, 55, 64, 67], 3.2],
    [14, [48, 55, 64, 67], 3.2],
    [17, [41, 48, 57, 60], 4.2],
    [21, [41, 48, 57, 60], 3.2],
    [24, [48, 55, 64, 67], 4.4],
  ];

  try {
    muted = window.localStorage.getItem("bday-muted") === "1";
  } catch (e) {
    muted = false;
  }

  /* ---------------------------------------------------------------- context */

  function buildContext() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;

    ctx = new AC();

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 24;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.28;

    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(compressor);
    compressor.connect(ctx.destination);

    dry = ctx.createGain();
    dry.gain.value = 0.9;
    dry.connect(master);

    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(2.8, 2.4);
    wet = ctx.createGain();
    wet.gain.value = 0.42;
    reverb.connect(wet);
    wet.connect(master);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.9;
    musicBus.connect(dry);

    const musicSend = ctx.createGain();
    musicSend.gain.value = 0.55;
    musicBus.connect(musicSend);
    musicSend.connect(reverb);

    return true;
  }

  /* Generate a soft hall impulse response for the reverb. */
  function makeImpulse(seconds, decay) {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const impulse = ctx.createBuffer(2, length, rate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (1 - t * 0.15);
      }
    }
    return impulse;
  }

  function send(node, wetAmount = 0.35) {
    node.connect(dry);
    const s = ctx.createGain();
    s.gain.value = wetAmount;
    node.connect(s);
    s.connect(reverb);
  }

  function now() {
    return ctx ? ctx.currentTime : 0;
  }

  /* ---------------------------------------------------------------- music */

  /* A single music-box note: a soft sine with a bright bell overtone. */
  function musicBoxNote(freq, t, dur) {
    const release = Math.max(1.15, dur * 2.2);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.115, t + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t + release);
    send(env, 0.7);

    const fundamental = ctx.createOscillator();
    fundamental.type = "sine";
    fundamental.frequency.value = freq;

    const bell = ctx.createOscillator();
    bell.type = "triangle";
    bell.frequency.value = freq * 2;
    const bellGain = ctx.createGain();
    bellGain.gain.value = 0.15;

    const glass = ctx.createOscillator();
    glass.type = "sine";
    glass.frequency.value = freq * 3;
    const glassGain = ctx.createGain();
    glassGain.gain.value = 0.045;

    fundamental.connect(env);
    bell.connect(bellGain);
    bellGain.connect(env);
    glass.connect(glassGain);
    glassGain.connect(env);

    const stopAt = t + release + 0.05;
    [fundamental, bell, glass].forEach((osc) => {
      osc.start(t);
      osc.stop(stopAt);
    });
  }

  /* A warm pad chord that breathes underneath the melody. */
  function padChord(notes, t, dur) {
    const env = ctx.createGain();
    const attack = Math.min(1.4, dur * 0.45);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.045, t + attack);
    env.gain.setValueAtTime(0.04, t + dur * 0.72);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1150;
    filter.Q.value = 0.5;
    env.connect(filter);
    send(filter, 0.55);

    notes.forEach((note, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = midiToHz(note);
      osc.detune.value = i % 2 ? 4 : -4;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.5 : 0.18;
      osc.connect(g);
      g.connect(env);
      osc.start(t);
      osc.stop(t + dur + 0.2);
    });
  }

  /* Schedule one verse of "Happy Birthday", then quietly queue the next. */
  function scheduleVerse(delay = 0.3) {
    if (!ctx || !started || muted) return;

    const t0 = now() + delay;
    let beat = 0;

    MELODY.forEach(([note, len]) => {
      if (note) musicBoxNote(midiToHz(note), t0 + beat * BEAT, len * BEAT);
      beat += len;
    });

    PADS.forEach(([at, notes, len]) => {
      padChord(notes, t0 + at * BEAT, len * BEAT);
    });

    const verseMs = (beat * BEAT + 2.4) * 1000;
    window.clearTimeout(tuneTimer);
    tuneTimer = window.setTimeout(() => {
      tuneTimer = null;
      scheduleVerse(0.35);
    }, verseMs);
  }

  /* ---------------------------------------------------------------- effects */

  function noiseBuffer(seconds = 1) {
    const rate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, Math.floor(rate * seconds), rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function chime() {
    if (!ctx) return;
    const t0 = now() + 0.02;
    const notes = [1046.5, 1318.5, 1568.0];
    notes.forEach((freq, i) => {
      const t = t0 + i * 0.1;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.045, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);
      osc.connect(g);
      send(g, 0.9);
      osc.start(t);
      osc.stop(t + 2.2);
    });
  }

  function sparkle() {
    if (!ctx) return;
    const t0 = now() + 0.02;
    [1568, 2093, 2637].forEach((freq, i) => {
      const t = t0 + i * 0.07;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.025, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      osc.connect(g);
      send(g, 0.85);
      osc.start(t);
      osc.stop(t + 1.2);
    });
  }

  function pop() {
    if (!ctx) return;
    const t0 = now() + 0.01;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(720, t0);
    osc.frequency.exponentialRampToValueAtTime(190, t0 + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
    osc.connect(g);
    send(g, 0.25);
    osc.start(t0);
    osc.stop(t0 + 0.22);
  }

  function whoosh() {
    if (!ctx) return;
    const t0 = now() + 0.01;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(1.4);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(950, t0);
    filter.frequency.exponentialRampToValueAtTime(220, t0 + 1.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.16, t0 + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.25);
    src.connect(filter);
    filter.connect(g);
    send(g, 0.3);
    src.start(t0);
    src.stop(t0 + 1.4);
  }

  /* ---------------------------------------------------------------- control */

  async function start() {
    if (started) {
      if (ctx && ctx.state === "suspended") {
        try { await ctx.resume(); } catch (e) { /* ignore */ }
      }
      return;
    }
    if (!buildContext()) return;

    started = true;
    try {
      if (ctx.state === "suspended") await ctx.resume();
    } catch (e) { /* ignore */ }

    const t = now();
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(0.0001, t);
    if (!muted) {
      master.gain.linearRampToValueAtTime(MUSIC_LEVEL, t + 2.5);
    }

    scheduleVerse(0.4);
  }

  async function toggle() {
    if (!started) {
      await start();
      if (muted) setMuted(false);
      return !muted;
    }
    setMuted(!muted);
    if (ctx && ctx.state === "suspended") {
      try { await ctx.resume(); } catch (e) { /* ignore */ }
    }
    return !muted;
  }

  function setMuted(value) {
    muted = !!value;
    try {
      window.localStorage.setItem("bday-muted", muted ? "1" : "0");
    } catch (e) { /* ignore */ }

    if (!ctx || !master) return;
    const t = now();
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t);
    master.gain.linearRampToValueAtTime(muted ? 0.0001 : MUSIC_LEVEL, t + 0.6);

    if (muted) {
      /* Let the current notes ring out; stop queuing new verses. */
      window.clearTimeout(tuneTimer);
      tuneTimer = null;
    } else if (started && !tuneTimer) {
      /* Coming back from mute: pick the melody up again. */
      scheduleVerse(0.4);
    }
  }

  function duck(on) {
    if (!ctx || !musicBus) return;
    const t = now();
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(Math.max(musicBus.gain.value, 0.0001), t);
    musicBus.gain.linearRampToValueAtTime(on ? 0.12 : 0.9, t + 0.4);
  }

  function isMuted() {
    return muted;
  }

  function isStarted() {
    return started;
  }

  return {
    start,
    toggle,
    setMuted,
    duck,
    chime,
    sparkle,
    pop,
    whoosh,
    isMuted,
    isStarted,
    get audible() {
      return started && !muted;
    },
  };
})();

/* Make the soundtrack reachable from the app's window.AudioEngine checks. */
window.AudioEngine = AudioEngine;
