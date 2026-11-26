/* ============================================================================
   ♥ FX — canvas magic
   ----------------------------------------------------------------------------
   One lightweight engine for:
     • confetti, petals and sparkles        (#fx canvas)
     • fireworks with rockets + trails      (#fx canvas)
     • a soft ambient starfield             (#ambient canvas)
     • reusable night skies                 (finale + wish modal)
   ========================================================================== */

const FX = (() => {
  "use strict";

  const TAU = Math.PI * 2;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const REDUCED = prefersReducedMotion;
  const MOBILE = window.matchMedia("(max-width: 768px)").matches;
  const MAX_PARTICLES = MOBILE ? 520 : 1100;

  const COLORS = [
    "#f6b8cd", "#e889a9", "#d76c91", "#f7c9d8",
    "#d9c9f3", "#b9a6e6", "#f0d9a0", "#c9a24b",
    "#fff4e6", "#ffd9e6",
  ];

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smoothstep = (a, b, v) => {
    const t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  /* ==========================================================================
     FX CANVAS — confetti + fireworks
     ========================================================================== */
  let canvas = null;
  let ctx = null;
  let W = 0;
  let H = 0;
  let particles = [];
  let rings = [];
  let raf = null;
  let last = 0;
  let running = false;

  function init() {
    canvas = document.getElementById("fx");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stop();
      } else if (particles.length || rings.length) {
        wake();
      }
    });
  }

  function resize() {
    if (!canvas || !ctx) return;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function wake() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  function trim() {
    if (particles.length > MAX_PARTICLES) {
      particles.splice(0, particles.length - MAX_PARTICLES);
    }
  }

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.04);
    last = now;

    ctx.clearRect(0, 0, W, H);

    /* ---- expanding rings ---- */
    if (rings.length) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.life += dt;
        const p = r.life / r.ttl;
        if (p >= 1) {
          rings.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = (1 - p) * 0.5;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2 * (1 - p) + 0.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r + r.max * p, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* ---- confetti ---- */
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      if (p.type === "rocket") {
        p.px = p.x;
        p.py = p.y;
        p.vy += 150 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life += dt;

        // sparkly trail
        if (Math.random() < 0.85) {
          particles.push({
            type: "spark",
            x: p.x + rand(-1.5, 1.5),
            y: p.y + rand(-1, 3),
            px: p.x,
            py: p.y + 4,
            vx: rand(-14, 14),
            vy: rand(10, 50),
            g: 30,
            drag: 0.94,
            color: pick(["#ffe9b0", "#f0d9a0", "#ffffff"]),
            life: 0,
            ttl: rand(0.25, 0.55),
            size: rand(0.8, 1.8),
          });
        }

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#fff6dc";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.1, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.restore();

        if (p.y <= p.targetY || p.vy >= 0) {
          burst(p.x, p.y, {
            count: MOBILE ? 36 : 58,
            color: p.color,
            speed: rand(180, 300),
            gravity: 95,
            ttl: rand(1.1, 1.9),
          });
          rings.push({ x: p.x, y: p.y, r: 2, max: rand(50, 90), color: p.color, life: 0, ttl: 0.7 });
          particles.splice(i, 1);
        }
        continue;
      }

      p.life += dt;

      if (p.type === "spark") {
        p.px = p.x;
        p.py = p.y;
        p.vx *= Math.pow(p.drag || 0.96, dt * 60);
        p.vy = p.vy * Math.pow(p.drag || 0.96, dt * 60) + (p.g || 60) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const fade = 1 - smoothstep(p.ttl * 0.55, p.ttl, p.life);
        if (p.life >= p.ttl) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = Math.max(0, fade);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.fillStyle = "#fffaf0";
        ctx.globalAlpha = Math.max(0, fade * 0.9);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.75, 0, TAU);
        ctx.fill();
        ctx.restore();
        continue;
      }

      if (p.type === "star") {
        p.vx *= Math.pow(0.97, dt * 60);
        p.vy = p.vy * Math.pow(0.97, dt * 60) + 60 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;

        const fade = 1 - smoothstep(p.ttl * 0.5, p.ttl, p.life);
        if (p.life >= p.ttl) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = fade;
        ctx.fillStyle = p.color;
        drawStar(ctx, 0, 0, p.size, p.size * 0.38, 4);
        ctx.fill();
        ctx.restore();
        continue;
      }

      /* confetti / petal */
      p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.g * dt;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.flip += p.flipSpeed * dt;

      const fade = 1 - smoothstep(p.ttl - 0.9, p.ttl, p.life);
      if (p.life >= p.ttl || p.y > H + 60) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, fade);
      ctx.fillStyle = p.color;

      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, TAU);
        ctx.fill();
      } else if (p.shape === "petal") {
        ctx.scale(1, 0.55 + Math.abs(Math.cos(p.flip)) * 0.6);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, TAU);
        ctx.fill();
      } else {
        ctx.scale(1, Math.cos(p.flip) * 0.85 + 0.15);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }

    trim();

    if (particles.length || rings.length) {
      raf = requestAnimationFrame(tick);
    } else {
      running = false;
      ctx.clearRect(0, 0, W, H);
    }
  }

  function drawStar(c, x, y, outer, inner, points) {
    c.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i * Math.PI) / points - Math.PI / 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
  }

  /* ---------------------------------------------------------------- spawners */

  function confettiBurst(x, y, opts = {}) {
    if (!ctx || REDUCED) return;
    const {
      count = MOBILE ? 60 : 90,
      spread = 80,
      angle = -90,
      speed = 520,
      gravity = 720,
      colors = COLORS,
      shapes = ["rect", "rect", "circle", "ribbon"],
      originJitter = 8,
    } = opts;

    for (let i = 0; i < count; i++) {
      const a = ((angle + rand(-spread / 2, spread / 2)) * Math.PI) / 180;
      const v = speed * rand(0.35, 1);
      const shape = pick(shapes);
      particles.push({
        type: "confetti",
        x: x + rand(-originJitter, originJitter),
        y: y + rand(-originJitter, originJitter),
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        g: gravity,
        drag: 0.985,
        w: rand(5, 11),
        h: rand(8, 16),
        color: pick(colors),
        rot: rand(0, TAU),
        vr: rand(-9, 9),
        flip: rand(0, TAU),
        flipSpeed: rand(3, 9),
        life: 0,
        ttl: rand(2.8, 5.2),
        shape,
      });
    }
    trim();
    wake();
  }

  function confettiRain(count = 100) {
    if (!ctx || REDUCED) return;
    for (let i = 0; i < count; i++) {
      particles.push({
        type: "confetti",
        x: rand(-20, W + 20),
        y: rand(-H * 0.5, -10),
        vx: rand(-40, 40),
        vy: rand(80, 190),
        g: 120,
        drag: 0.995,
        w: rand(5, 10),
        h: rand(9, 17),
        color: pick(COLORS),
        rot: rand(0, TAU),
        vr: rand(-7, 7),
        flip: rand(0, TAU),
        flipSpeed: rand(3, 8),
        life: 0,
        ttl: rand(5, 8),
        shape: pick(["rect", "rect", "circle", "ribbon"]),
      });
    }
    trim();
    wake();
  }

  function petalBurst(x, y, count = 26) {
    if (!ctx || REDUCED) return;
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const v = rand(120, 340);
      particles.push({
        type: "confetti",
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 120,
        g: 260,
        drag: 0.97,
        w: rand(10, 20),
        h: rand(14, 26),
        color: pick(["#ffd9e6", "#f6b8cd", "#f3a6c0", "#ffe8ef", "#f7c9d8"]),
        rot: rand(0, TAU),
        vr: rand(-5, 5),
        flip: rand(0, TAU),
        flipSpeed: rand(2, 5),
        life: 0,
        ttl: rand(3.5, 6),
        shape: "petal",
      });
    }
    trim();
    wake();
  }

  function sparkleBurst(x, y, count = 16) {
    if (!ctx || REDUCED) return;
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const v = rand(50, 240);
      particles.push({
        type: "star",
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        g: 80,
        color: pick(["#f0d9a0", "#fff6dc", "#f6b8cd", "#ffffff"]),
        rot: rand(0, TAU),
        vr: rand(-5, 5),
        size: rand(4, 10),
        life: 0,
        ttl: rand(0.7, 1.5),
      });
    }
    trim();
    wake();
  }

  function burst(x, y, opts = {}) {
    if (REDUCED) return;
    const {
      count = MOBILE ? 32 : 52,
      color,
      colors = COLORS,
      speed = 240,
      gravity = 90,
      ttl = 1.5,
    } = opts;
    const palette = color ? [color, "#fff6dc", color] : colors;

    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const v = speed * Math.pow(Math.random(), 0.45) * rand(0.75, 1.1);
      particles.push({
        type: "spark",
        x,
        y,
        px: x,
        py: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        g: gravity,
        drag: 0.955,
        color: pick(palette),
        life: 0,
        ttl: ttl * rand(0.7, 1.15),
        size: rand(1.1, 2.4),
      });
    }
    trim();
    wake();
  }

  function heartBurst(x, y, scale = 10) {
    if (!ctx || REDUCED) return;
    const points = 64;
    for (let i = 0; i < points; i++) {
      const t = (i / points) * TAU;
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      particles.push({
        type: "spark",
        x: x + hx * scale,
        y: y - hy * scale,
        px: x + hx * scale,
        py: y - hy * scale,
        vx: hx * rand(0.5, 1.6),
        vy: -hy * rand(0.5, 1.6),
        g: 14,
        drag: 0.985,
        color: pick(["#f6b8cd", "#f0d9a0", "#ffd9e6", "#ffffff", "#e889a9"]),
        life: 0,
        ttl: rand(1.4, 2.4),
        size: rand(1.4, 2.6),
      });
    }
    rings.push({ x, y, r: 4, max: scale * 20, color: "#f6b8cd", life: 0, ttl: 1.1 });
    trim();
    wake();
  }

  function launchRocket(x) {
    if (!ctx || REDUCED) return;
    const startX = x ?? rand(W * 0.12, W * 0.88);
    particles.push({
      type: "rocket",
      x: startX,
      y: H + 10,
      px: startX,
      py: H + 10,
      vx: rand(-55, 55),
      vy: -rand(560, 720),
      targetY: rand(H * 0.14, H * 0.45),
      color: pick(COLORS),
      life: 0,
    });
    wake();
  }

  function fireworks(count = 4) {
    if (REDUCED) return;
    for (let i = 0; i < count; i++) {
      setTimeout(() => launchRocket(), i * rand(180, 420));
    }
  }

  function celebrate() {
    if (REDUCED) return;
    confettiBurst(W * 0.5, H * 0.44, { count: MOBILE ? 70 : 120, speed: 620 });
    setTimeout(() => confettiBurst(W * 0.2, H * 0.6, { count: MOBILE ? 45 : 70, speed: 480 }), 160);
    setTimeout(() => confettiBurst(W * 0.8, H * 0.6, { count: MOBILE ? 45 : 70, speed: 480 }), 300);
    fireworks(5);
    setTimeout(() => heartBurst(W * 0.5, H * 0.36, MOBILE ? 8 : 12), 800);
  }

  /* ==========================================================================
     AMBIENT STARFIELD
     ========================================================================== */
  let amb = null;
  let ambCtx = null;
  let ambW = 0;
  let ambH = 0;
  let ambStars = [];
  let ambBokeh = [];
  let ambRaf = null;
  let ambLast = 0;
  let ambShooting = null;
  let ambNextShoot = 0;
  const bokehSprites = {};

  function makeBokehSprite(color) {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, color.replace("1)", "0.35)"));
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return c;
  }

  function initAmbient() {
    amb = document.getElementById("ambient");
    if (!amb) return;
    ambCtx = amb.getContext("2d");
    bokehSprites.pink = makeBokehSprite("rgba(246,184,205,1)");
    bokehSprites.gold = makeBokehSprite("rgba(231,201,122,1)");
    bokehSprites.lav = makeBokehSprite("rgba(201,182,240,1)");

    resizeAmbient();
    window.addEventListener("resize", resizeAmbient);
    ambNextShoot = performance.now() + rand(9000, 16000);
    ambRaf = requestAnimationFrame(ambientTick);
  }

  function resizeAmbient() {
    if (!amb || !ambCtx) return;
    ambW = window.innerWidth;
    ambH = window.innerHeight;
    amb.width = Math.floor(ambW * DPR);
    amb.height = Math.floor(ambH * DPR);
    amb.style.width = ambW + "px";
    amb.style.height = ambH + "px";
    ambCtx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const starCount = MOBILE ? 46 : 82;
    ambStars = Array.from({ length: starCount }, () => ({
      x: Math.random() * ambW,
      y: Math.random() * ambH,
      r: rand(0.4, 1.6),
      phase: rand(0, TAU),
      speed: rand(0.35, 1.1),
      gold: Math.random() < 0.25,
    }));

    ambBokeh = Array.from({ length: MOBILE ? 6 : 11 }, () => ({
      x: Math.random() * ambW,
      y: Math.random() * ambH,
      size: rand(40, 150),
      sprite: pick(["pink", "gold", "lav"]),
      alpha: rand(0.12, 0.34),
      drift: rand(0.1, 0.35),
      phase: rand(0, TAU),
      speed: rand(0.15, 0.4),
    }));
  }

  function ambientTick(now) {
    if (!ambCtx) return;
    // ~30fps is plenty for a dreamy background
    if (now - ambLast < 32) {
      ambRaf = requestAnimationFrame(ambientTick);
      return;
    }
    const dt = Math.min((now - ambLast) / 1000, 0.1);
    ambLast = now;
    const t = now / 1000;

    ambCtx.clearRect(0, 0, ambW, ambH);

    /* soft bokeh */
    for (const b of ambBokeh) {
      const x = b.x + Math.sin(t * b.speed + b.phase) * 26;
      const y = b.y + Math.cos(t * b.speed * 0.8 + b.phase) * 20;
      ambCtx.globalAlpha = b.alpha * (0.75 + 0.25 * Math.sin(t * 0.4 + b.phase));
      ambCtx.drawImage(bokehSprites[b.sprite], x - b.size / 2, y - b.size / 2, b.size, b.size);
    }
    ambCtx.globalAlpha = 1;

    /* twinkling stars */
    for (const s of ambStars) {
      const a = 0.2 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      ambCtx.globalAlpha = a;
      ambCtx.fillStyle = s.gold ? "#c9a24b" : "#ffffff";
      ambCtx.beginPath();
      ambCtx.arc(s.x, s.y, s.r, 0, TAU);
      ambCtx.fill();
    }
    ambCtx.globalAlpha = 1;

    /* an occasional gold shooting star in the hero */
    if (now > ambNextShoot && !ambShooting) {
      ambShooting = {
        x: rand(ambW * 0.25, ambW * 0.85),
        y: rand(0, ambH * 0.3),
        vx: rand(-520, -380),
        vy: rand(180, 260),
        life: 0,
        ttl: 1.15,
      };
      ambNextShoot = now + rand(11000, 20000);
    }
    if (ambShooting) {
      const s = ambShooting;
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const fade = 1 - smoothstep(s.ttl * 0.6, s.ttl, s.life);
      if (s.life >= s.ttl) {
        ambShooting = null;
      } else {
        const tailX = s.x - s.vx * 0.13;
        const tailY = s.y - s.vy * 0.13;
        const grad = ambCtx.createLinearGradient(s.x, s.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255, 246, 220, ${0.75 * fade})`);
        grad.addColorStop(1, "rgba(255, 246, 220, 0)");
        ambCtx.strokeStyle = grad;
        ambCtx.lineWidth = 1.6;
        ambCtx.beginPath();
        ambCtx.moveTo(s.x, s.y);
        ambCtx.lineTo(tailX, tailY);
        ambCtx.stroke();
      }
    }

    ambRaf = requestAnimationFrame(ambientTick);
  }

  /* ==========================================================================
     REUSABLE NIGHT SKY (finale + wish modal)
     ========================================================================== */
  function createNight(canvasEl, options = {}) {
    const { shooting = true, warm = true } = options;
    const c = canvasEl;
    const g = c.getContext("2d");
    let w = 0;
    let h = 0;
    let stars = [];
    let shots = [];
    let rafId = null;
    let running = false;
    let lastT = 0;
    let nextShot = 0;
    let visible = true;

    function measure() {
      const rect = c.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      c.width = Math.floor(w * DPR);
      c.height = Math.floor(h * DPR);
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildStars();
    }

    function buildStars() {
      const count = clamp(Math.round((w * h) / 8000), 60, 220);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: rand(0.4, 1.7),
        phase: rand(0, TAU),
        speed: rand(0.3, 1.2),
        gold: Math.random() < (warm ? 0.22 : 0.1),
        big: Math.random() < 0.06,
      }));
    }

    function spawnShot() {
      const fromLeft = Math.random() > 0.4;
      shots.push({
        x: fromLeft ? rand(w * 0.05, w * 0.5) : rand(w * 0.5, w * 0.95),
        y: rand(h * 0.05, h * 0.4),
        vx: (fromLeft ? 1 : -1) * rand(560, 900),
        vy: rand(190, 330),
        life: 0,
        ttl: rand(1, 1.7),
        big: Math.random() < 0.4,
      });
    }

    function loop(now) {
      if (!running) return;
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      const t = now / 1000;

      g.clearRect(0, 0, w, h);

      for (const s of stars) {
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
        g.globalAlpha = tw;
        g.fillStyle = s.gold ? "#e7c97a" : "#fffaf0";
        if (s.big) {
          g.globalAlpha = tw * 0.5;
          g.beginPath();
          g.arc(s.x, s.y, s.r * 4, 0, TAU);
          g.fill();
          g.globalAlpha = tw;
        }
        g.beginPath();
        g.arc(s.x, s.y, s.r, 0, TAU);
        g.fill();
      }
      g.globalAlpha = 1;

      if (shooting && now > nextShot) {
        spawnShot();
        nextShot = now + rand(2800, 7000);
      }

      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.life += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const fade = 1 - smoothstep(s.ttl * 0.55, s.ttl, s.life);
        if (s.life >= s.ttl || s.x < -200 || s.x > w + 200) {
          shots.splice(i, 1);
          continue;
        }
        const tailX = s.x - s.vx * (s.big ? 0.16 : 0.1);
        const tailY = s.y - s.vy * (s.big ? 0.16 : 0.1);
        const grad = g.createLinearGradient(s.x, s.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255, 247, 220, ${0.95 * fade})`);
        grad.addColorStop(0.5, `rgba(255, 236, 180, ${0.35 * fade})`);
        grad.addColorStop(1, "rgba(255, 236, 180, 0)");
        g.strokeStyle = grad;
        g.lineWidth = s.big ? 2.4 : 1.4;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(s.x, s.y);
        g.lineTo(tailX, tailY);
        g.stroke();

        g.fillStyle = `rgba(255, 252, 240, ${fade})`;
        g.beginPath();
        g.arc(s.x, s.y, s.big ? 2.4 : 1.6, 0, TAU);
        g.fill();
      }

      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (running) return;
      measure();
      running = true;
      lastT = performance.now();
      nextShot = performance.now() + rand(1200, 3500);
      rafId = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      g.clearRect(0, 0, w, h);
    }

    function shoot() {
      spawnShot();
      spawnShot();
    }

    function setVisible(v) {
      visible = v;
      if (v && !running) start();
      if (!v && running) stop();
    }

    return { start, stop, shoot, resize: measure, setVisible, get visible() { return visible; } };
  }

  /* ==========================================================================
     PUBLIC API
     ========================================================================== */
  return {
    init,
    confettiBurst,
    confettiRain,
    petalBurst,
    sparkleBurst,
    heartBurst,
    fireworks,
    celebrate,
    launchRocket,
    initAmbient,
    createNight,
  };
})();

/* Make the engine reachable from the app's window.FX checks. */
window.FX = FX;
