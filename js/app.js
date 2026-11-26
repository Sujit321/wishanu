/* ============================================================================
   ♥ APP — the heart of the experience
   ----------------------------------------------------------------------------
   Preloader, opening transition, navigation, scroll reveals, countdown,
   typewriter letter, floating hearts, ambient nights and shared helpers.
   ========================================================================== */

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const reduce = prefersReducedMotion;

  let gsapReady = false;
  let opened = false;
  let preloaderDone = false;
  let heroIntroDone = false;
  let floatiesStarted = false;
  let toastTimer = null;
  let soundToastShown = false;

  const nights = { final: null, wish: null };

  /* ==========================================================================
     START
     ========================================================================== */
  function init() {
    setNames();

    if (window.lucide) {
      try {
        window.lucide.createIcons();
      } catch (err) {
        /* icons are decorative; never break the surprise */
      }
    }

    try {
      history.scrollRestoration = "manual";
    } catch (err) {
      /* ignore */
    }
    window.scrollTo(0, 0);
    document.documentElement.classList.add("is-locked");
    document.documentElement.classList.remove("no-js");

    gsapReady = !!(window.gsap && window.ScrollTrigger);
    if (gsapReady) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      document.documentElement.classList.add("js");
      window.ScrollTrigger.config({ ignoreMobileResize: true });
    }

    if (window.FX) {
      FX.init();
      FX.initAmbient();
    }

    initPreloader();
    initSound();
    initNavigation();
    initReveals();
    initCountdown();
    initLetter();
    initNightCanvas();
    initFireworks();
    initCursor();
    initOpenButton();

    // expose a small, friendly API for the interaction module
    window.Bday = {
      reduce,
      get gsapReady() {
        return gsapReady;
      },
      get opened() {
        return opened;
      },
      nights,
      toast,
      setLock,
      scrollToSection,
      showNav,
      startFloaties,
      updateSoundUI,
    };

    // Re-measure once every photo has decoded
    window.addEventListener("load", () => {
      if (gsapReady) window.setTimeout(() => window.ScrollTrigger.refresh(), 200);
    });
  }

  function setNames() {
    $$("[data-name]").forEach((el) => {
      el.textContent = CONFIG.name;
    });
    $$("[data-her-name]").forEach((el) => {
      el.textContent = CONFIG.herName;
    });
    $$("[data-his-name]").forEach((el) => {
      el.textContent = CONFIG.hisName;
    });
    document.title = "Happy Birthday, " + CONFIG.name;
  }

  /* ==========================================================================
     PRELOADER
     ========================================================================== */
  function initPreloader() {
    const preloader = $("#preloader");
    const bar = $("#preloaderBar");
    if (!preloader) return;

    if (gsapReady) {
      window.gsap.to(bar, { width: "100%", duration: 1.7, ease: "power2.inOut" });
    } else if (bar) {
      bar.style.width = "100%";
    }

    const finish = () => {
      if (preloaderDone) return;
      preloaderDone = true;
      preloader.classList.add("is-done");
      heroIntro();
      window.setTimeout(() => {
        preloader.style.display = "none";
      }, 950);
      if (gsapReady) window.setTimeout(() => window.ScrollTrigger.refresh(), 200);
    };

    if (document.readyState === "complete") {
      window.setTimeout(finish, 400);
    } else {
      window.addEventListener("load", () => window.setTimeout(finish, 400), { once: true });
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => window.setTimeout(finish, 350));
    }
    window.setTimeout(finish, 3200); // never leave anyone waiting
  }

  function heroIntro() {
    if (!gsapReady || heroIntroDone) return;
    heroIntroDone = true;
    const gsap = window.gsap;
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.from(".hero-eyebrow", { y: 18, opacity: 0, duration: 0.9 }, 0.1)
      .from(".hero-title__word", { y: 70, opacity: 0, rotationX: -55, duration: 1.15, stagger: 0.1, transformOrigin: "50% 100%" }, 0.2)
      .from(".hero-title__line--two > *", { y: 52, opacity: 0, duration: 1.05, stagger: 0.12 }, 0.6)
      .from(".hero-sub", { y: 22, opacity: 0, duration: 0.9 }, 1.0)
      .from(".hero-action", { y: 26, opacity: 0, duration: 0.9 }, 1.15)
      .from(".hero-hint", { opacity: 0, duration: 0.8 }, 1.35)
      .from(".floral", { opacity: 0, duration: 1.4 }, 0.5)
      .from(".hero-foot", { opacity: 0, duration: 0.9 }, 1.55);
  }

  /* ==========================================================================
     SOUND
     ========================================================================== */
  function initSound() {
    const btn = $("#soundBtn");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      try {
        const audible = await AudioEngine.toggle();
        updateSoundUI();
        toast(
          audible
            ? "Music on — a soft little soundtrack for you."
            : "Music muted. Tap the note whenever you want it back."
        );
      } catch (err) {
        toast("The music could not start — but the magic is still here.");
      }
    });
    updateSoundUI();
  }

  function updateSoundUI() {
    const btn = $("#soundBtn");
    if (!btn || !window.AudioEngine) return;
    const playing = AudioEngine.isStarted() && !AudioEngine.isMuted();
    btn.classList.toggle("is-playing", playing);
    btn.setAttribute("aria-pressed", String(playing));
    btn.setAttribute("aria-label", playing ? "Mute the music" : "Turn the music on");
  }

  /* ==========================================================================
     NAVIGATION
     ========================================================================== */
  function initNavigation() {
    $$('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        const href = link.getAttribute("href");
        if (!href || href === "#") return;
        const target = document.querySelector(href);
        if (!target) return;
        event.preventDefault();
        if (document.documentElement.classList.contains("is-locked") && !opened) return;
        scrollToSection(href);
      });
    });

    if (!gsapReady) return;

    const ids = ["hero", "cake", "memories", "letter", "gift", "fireworks", "wish"];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      window.ScrollTrigger.create({
        trigger: el,
        start: id === "hero" ? "top top" : "top 50%",
        end: id === "hero" ? "bottom 45%" : "bottom 50%",
        onToggle: (self) => {
          if (self.isActive) setActiveNav(id);
        },
      });
    });
  }

  function setActiveNav(id) {
    $$("[data-nav]").forEach((a) => a.classList.toggle("is-active", a.dataset.nav === id));
    $$("[data-dock]").forEach((a) => a.classList.toggle("is-active", a.dataset.dock === id));
  }

  function showNav() {
    const nav = $("#siteNav");
    const dock = $("#dock");
    if (nav) nav.classList.add("is-visible");
    if (dock) dock.classList.add("is-visible");
  }

  function scrollToSection(selector, offset = 70) {
    if (selector === "#hero") {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      return;
    }
    const el = document.querySelector(selector);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
  }

  /* ==========================================================================
     SCROLL REVEALS
     ========================================================================== */
  function initReveals() {
    if (!gsapReady) return;
    const gsap = window.gsap;

    // Gentle fade-ups for section headers and cards.
    $$(".reveal").forEach((el) => {
      const fadeOnly = el.matches(".portrait-card, .letter-paper");
      const vars = {
        opacity: 0,
        duration: 1.05,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      };
      if (!fadeOnly) vars.y = 36;
      gsap.fromTo(
        el,
        { opacity: 0, ...(fadeOnly ? {} : { y: 36 }) },
        { opacity: 1, ...(fadeOnly ? {} : { y: 0 }), duration: 1.05, ease: "power3.out", scrollTrigger: vars.scrollTrigger }
      );
    });

    gsap.from(".memory-card", {
      opacity: 0,
      y: 44,
      duration: 1,
      stagger: 0.1,
      ease: "power3.out",
      clearProps: "transform",
      scrollTrigger: { trigger: ".gallery", start: "top 82%", once: true },
    });

    gsap.from(".cake-stage", {
      opacity: 0,
      y: 52,
      duration: 1.2,
      ease: "power3.out",
      scrollTrigger: { trigger: ".cake-stage", start: "top 86%", once: true },
    });

    gsap.fromTo(
      ".birthday-title__name",
      { opacity: 0, scale: 0.94, y: 22 },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 1.35,
        ease: "power4.out",
        scrollTrigger: { trigger: ".celebration", start: "top 55%", once: true },
      }
    );

    // Watermarks drift slowly as you scroll.
    $$(".section-bg__watermark").forEach((mark) => {
      gsap.to(mark, {
        yPercent: -10,
        ease: "none",
        scrollTrigger: {
          trigger: mark.closest(".section"),
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    });

    // Slim reading progress bar.
    const progressBar = $("#progressBar");
    if (progressBar) {
      gsap.to(progressBar, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.25,
        },
      });
    }
  }

  /* ==========================================================================
     COUNTDOWN
     ========================================================================== */
  function initCountdown() {
    updateCountdown();
    window.setInterval(updateCountdown, 1000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) updateCountdown();
    });
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function updateCountdown() {
    const target = new Date(CONFIG.birthdayISO);
    const now = new Date();
    if (Number.isNaN(target.getTime())) return;

    const sameDay =
      now.getFullYear() === target.getFullYear() &&
      now.getMonth() === target.getMonth() &&
      now.getDate() === target.getDate();

    const card = $("#countdownCard");
    const note = $("#countdownNote");
    const inline = $("#countdownInline");
    const dEl = $("#cdDays");
    const hEl = $("#cdHours");
    const mEl = $("#cdMinutes");
    const sEl = $("#cdSeconds");

    if (sameDay) {
      if (card) card.classList.add("is-today");
      if (note) note.textContent = "Today is the day. Happy birthday, my love.";
      if (inline) inline.textContent = "today is the day ✦";
      return;
    }

    const diff = target.getTime() - now.getTime();
    if (diff <= 0) {
      if (card) card.classList.add("is-today");
      if (note) note.textContent = "A day worth celebrating, always.";
      if (inline) inline.textContent = "a day worth celebrating, always";
      return;
    }

    if (card) card.classList.remove("is-today");
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (dEl) dEl.textContent = pad2(days);
    if (hEl) hEl.textContent = pad2(hours);
    if (mEl) mEl.textContent = pad2(minutes);
    if (sEl) sEl.textContent = pad2(seconds);
    if (note) note.textContent = days > 0 ? "Until the world celebrates you." : "Almost time to celebrate you.";
    if (inline) {
      inline.textContent =
        days > 0
          ? `in ${days}d ${pad2(hours)}h ${pad2(minutes)}m`
          : `in ${pad2(hours)}h ${pad2(minutes)}m ${pad2(seconds)}s`;
    }
  }

  /* ==========================================================================
     LETTER — typewriter
     ========================================================================== */
  let letterStarted = false;
  let letterDone = false;
  let skipTyping = false;

  function initLetter() {
    const paper = $("#letterPaper");
    const body = $("#letterBody");
    const skip = $("#letterSkip");
    if (!paper || !body) return;

    if (skip) {
      skip.addEventListener("click", () => {
        skipTyping = true;
        if (!letterStarted) {
          typeLetter();
        } else {
          completeLetter();
        }
      });
    }

    const start = () => {
      if (letterStarted) return;
      window.setTimeout(() => {
        if (!letterStarted) typeLetter();
      }, 450);
    };

    if (reduce) {
      start();
      return;
    }

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              start();
              io.disconnect();
            }
          });
        },
        { threshold: 0.25 }
      );
      io.observe(paper);
    } else {
      start();
    }
  }

  function buildLetter() {
    const body = $("#letterBody");
    if (!body) return;
    body.innerHTML = "";
    CONFIG.letter.forEach(() => {
      const p = document.createElement("p");
      const span = document.createElement("span");
      p.appendChild(span);
      body.appendChild(p);
    });
  }

  function completeLetter() {
    if (letterDone) return;
    const body = $("#letterBody");
    const paper = $("#letterPaper");
    if (!body || !paper) return;

    if (body.children.length !== CONFIG.letter.length) buildLetter();
    $$("p > span", body).forEach((span, i) => {
      span.textContent = CONFIG.letter[i] || "";
    });
    const cursor = $(".type-cursor", body);
    if (cursor) cursor.remove();

    letterDone = true;
    letterStarted = true;
    paper.classList.remove("is-typing");
    paper.classList.add("is-done");

    if (!reduce && window.FX) {
      window.setTimeout(() => {
        const seal = $(".wax-seal");
        if (!seal) return;
        const r = seal.getBoundingClientRect();
        FX.sparkleBurst(r.left + r.width / 2, r.top + r.height / 2, 14);
      }, 850);
    }
  }

  async function typeLetter() {
    if (letterStarted) return;
    letterStarted = true;
    const body = $("#letterBody");
    const paper = $("#letterPaper");
    if (!body || !paper) return;

    paper.classList.add("is-typing");
    buildLetter();

    if (reduce || skipTyping) {
      completeLetter();
      return;
    }

    const paragraphs = Array.from(body.children);
    const cursor = document.createElement("span");
    cursor.className = "type-cursor";
    cursor.setAttribute("aria-hidden", "true");

    for (let pi = 0; pi < paragraphs.length; pi++) {
      const p = paragraphs[pi];
      const span = p.querySelector("span");
      p.appendChild(cursor);
      const text = CONFIG.letter[pi];

      for (let ci = 0; ci < text.length; ci++) {
        if (skipTyping) break;
        span.textContent += text[ci];
        const ch = text[ci];
        let delay = 9 + Math.random() * 8;
        if (ch === "." || ch === "!" || ch === "?") delay = 210;
        else if (ch === "," || ch === ";" || ch === ":") delay = 85;
        await sleep(delay);
      }
      if (skipTyping) break;
    }

    cursor.remove();

    if (skipTyping) {
      completeLetter();
      return;
    }

    letterDone = true;
    paper.classList.remove("is-typing");
    paper.classList.add("is-done");

    if (window.AudioEngine && AudioEngine.isStarted() && !AudioEngine.isMuted()) {
      AudioEngine.sparkle();
    }
    if (!reduce && window.FX) {
      const seal = $(".wax-seal");
      if (seal) {
        const r = seal.getBoundingClientRect();
        window.setTimeout(() => FX.sparkleBurst(r.left + r.width / 2, r.top + r.height / 2, 14), 750);
      }
    }
  }

  /* ==========================================================================
     NIGHT SKIES
     ========================================================================== */
  function initNightCanvas() {
    if (!window.FX) return;
    const finalCanvas = $("#nightCanvas");
    if (!finalCanvas) return;

    nights.final = FX.createNight(finalCanvas, { shooting: true, warm: true });

    const finalSection = $("#wish");
    if (finalSection && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) nights.final.start();
            else nights.final.stop();
          });
        },
        { threshold: 0.05 }
      );
      io.observe(finalSection);
    } else {
      nights.final.start();
    }

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (nights.final) nights.final.resize();
        if (nights.wish) nights.wish.resize();
        if (nights.fireworks) nights.fireworks.resize();
      }, 280);
    });
  }

  /* ==========================================================================
     FIREWORKS — Anu ♥ Sujit
     ========================================================================== */
  function initFireworks() {
    const section = $("#fireworks");
    if (!section) return;

    const btn = $("#fireworksBtn");
    const btnLabel = $("#fireworksBtnLabel");
    const note = $("#fireworksNote");
    const names = $$(".fireworks-name", section);
    const canvas = $("#fireworksCanvas");

    let timer = null;
    let visible = false;
    let cooldown = false;
    let shows = 0;

    if (canvas && window.FX) {
      nights.fireworks = FX.createNight(canvas, { shooting: true, warm: true });
    }

    function startAuto() {
      if (timer || reduce) return;
      timer = window.setInterval(() => {
        if (document.hidden || !visible) return;
        if (document.querySelector(".wish-modal.is-open, .lightbox.is-open")) return;
        FX.launchRocket();
      }, 7000);
    }

    function stopAuto() {
      if (!timer) return;
      window.clearInterval(timer);
      timer = null;
    }

    function observe() {
      if (!("IntersectionObserver" in window)) {
        if (nights.fireworks) nights.fireworks.start();
        startAuto();
        return;
      }
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            visible = entry.isIntersecting;
            if (entry.isIntersecting) {
              if (nights.fireworks) nights.fireworks.start();
              startAuto();
            } else {
              if (nights.fireworks) nights.fireworks.stop();
              stopAuto();
            }
          });
        },
        { threshold: 0.2 }
      );
      io.observe(section);
    }

    function flashNames() {
      names.forEach((el) => {
        el.classList.remove("is-lit");
        void el.offsetWidth; // restart the little glow keyframe
        el.classList.add("is-lit");
        window.setTimeout(() => el.classList.remove("is-lit"), 1000);
      });
      if (!gsapReady || !names.length) return;
      window.gsap.fromTo(
        names,
        { scale: 1 },
        {
          scale: 1.06,
          duration: 0.45,
          yoyo: true,
          repeat: 1,
          ease: "sine.inOut",
          stagger: 0.08,
          overwrite: true,
        }
      );
    }

    function lightSky(x) {
      if (cooldown) return;
      cooldown = true;
      window.setTimeout(() => {
        cooldown = false;
      }, 900);

      flashNames();

      if (reduce) {
        toast("The sky is already glowing for you two.");
        return;
      }
      if (!window.FX) return;

      if (typeof x === "number") {
        FX.launchRocket(x);
        FX.sparkleBurst(x, window.innerHeight * 0.32, 10);
      } else {
        FX.fireworks(6);
        const r = section.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = Math.max(110, r.top + r.height * 0.3);
        FX.heartBurst(cx, cy, 7);
        FX.confettiBurst(cx, cy, { count: 54, speed: 470, spread: 100 });
      }

      if (window.AudioEngine) {
        AudioEngine.whoosh();
        if (AudioEngine.isStarted() && !AudioEngine.isMuted()) AudioEngine.chime();
      }

      shows++;
      if (note) {
        note.textContent =
          shows === 1
            ? "the sky just wrote your names in light"
            : "again — because you two deserve all of it";
        note.classList.add("is-lit");
      }
      if (btnLabel && shows === 1) btnLabel.textContent = "One more time";
    }

    if (btn) {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        lightSky();
      });
    }

    section.addEventListener("click", (event) => {
      if (event.target.closest("button, a, input, textarea, label")) return;
      lightSky(event.clientX);
    });

    observe();
  }

  /* ==========================================================================
     FLOATING HEARTS & PETALS
     ========================================================================== */
  function startFloaties() {
    if (floatiesStarted || reduce) return;
    floatiesStarted = true;
    const layer = $("#floaties");
    if (!layer) return;

    const heartSvg =
      '<svg viewBox="0 0 32 30" aria-hidden="true"><path d="M16 28S2 19.6 2 10.2C2 5.7 5.6 2 10 2c3.1 0 5.1 1.7 6 3.3C17 3.7 19 2 22 2c4.4 0 8 3.7 8 8.2C30 19.6 16 28 16 28Z" fill="currentColor"/></svg>';

    const spawn = () => {
      if (document.hidden || layer.children.length > 12) return;
      const el = document.createElement("span");
      el.className = "floaty";
      el.setAttribute("aria-hidden", "true");

      const isHeart = Math.random() < 0.48;
      const size = 10 + Math.random() * 15;

      if (isHeart) {
        el.innerHTML = heartSvg;
        el.style.width = size + "px";
        el.style.height = size * 0.94 + "px";
        el.style.color = ["#f3a6c0", "#e889a9", "#d9c9f3", "#c9a24b"][(Math.random() * 4) | 0];
        el.style.filter = "drop-shadow(0 2px 4px rgba(180,100,130,.2))";
      } else {
        el.classList.add("floaty--petal");
        el.style.width = size * 0.8 + "px";
        el.style.height = size * 1.15 + "px";
      }

      el.style.left = 2 + Math.random() * 94 + "vw";
      el.style.setProperty("--dur", 13 + Math.random() * 10 + "s");
      el.style.setProperty("--drift", -130 + Math.random() * 260 + "px");
      el.style.setProperty("--rot", -140 + Math.random() * 280 + "deg");
      el.style.setProperty("--op", 0.3 + Math.random() * 0.4);

      el.addEventListener("animationend", () => el.remove(), { once: true });
      window.setTimeout(() => el.remove(), 26000);
      layer.appendChild(el);
    };

    for (let i = 0; i < 4; i++) window.setTimeout(spawn, i * 650);
    window.setInterval(spawn, 2800);
  }

  /* ==========================================================================
     CURSOR GLOW
     ========================================================================== */
  function initCursor() {
    if (reduce || isTouchDevice || !gsapReady) return;
    const glow = $("#cursorGlow");
    if (!glow || !window.matchMedia("(pointer: fine)").matches) return;

    const gsap = window.gsap;
    const xTo = gsap.quickTo(glow, "x", { duration: 0.85, ease: "power3" });
    const yTo = gsap.quickTo(glow, "y", { duration: 0.85, ease: "power3" });
    let shown = false;

    window.addEventListener(
      "pointermove",
      (event) => {
        if (!shown) {
          shown = true;
          glow.style.opacity = "0.8";
        }
        xTo(event.clientX);
        yTo(event.clientY);
      },
      { passive: true }
    );

    document.addEventListener("mouseleave", () => {
      glow.style.opacity = "0";
      shown = false;
    });
  }

  /* ==========================================================================
     OPENING TRANSITION
     ========================================================================== */
  function initOpenButton() {
    const btn = $("#openBtn");
    if (!btn) return;
    btn.addEventListener("click", openSurprise);
  }

  function openSurprise() {
    if (opened) {
      scrollToSection("#cake");
      return;
    }
    opened = true;

    const btn = $("#openBtn");
    if (btn) btn.disabled = true;
    const ring = $(".bloom-ring");
    if (ring) ring.classList.add("is-active");

    const rect = btn
      ? btn.getBoundingClientRect()
      : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    if (window.FX && !reduce) {
      FX.petalBurst(cx, cy, 34);
      FX.confettiBurst(cx, cy, { count: 95, speed: 580, spread: 105 });
    }

    if (window.AudioEngine) {
      AudioEngine.start()
        .then(() => updateSoundUI())
        .catch(() => {});
      if (AudioEngine.isStarted() && !AudioEngine.isMuted()) AudioEngine.chime();
    }

    startFloaties();

    if (!gsapReady || reduce) {
      setLock(false);
      window.setTimeout(() => {
        scrollToSection("#cake");
        showNav();
        updateSoundUI();
      }, 250);
      return;
    }

    const gsap = window.gsap;
    const veil = $("#veil");
    const content = $(".veil__content");
    if (!veil) {
      setLock(false);
      showNav();
      scrollToSection("#cake");
      return;
    }

    gsap.set(veil, { visibility: "visible", scaleY: 0, opacity: 1 });
    gsap.set(content, { opacity: 0, y: 16 });

    const tl = gsap.timeline();
    tl.to(".hero-inner", { opacity: 0, y: -34, filter: "blur(8px)", duration: 0.75, ease: "power2.in" }, 0)
      .to(".hero-ornaments", { opacity: 0, duration: 0.7 }, 0)
      .to(veil, { scaleY: 1, duration: 1, ease: "power4.inOut" }, 0.42)
      .to(content, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 1.0)
      .add(() => {
        setLock(false);
        const cake = $("#cake");
        if (cake) {
          const top = cake.getBoundingClientRect().top + window.scrollY - 20;
          window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
        }
        showNav();
      }, 1.45)
      .to(veil, { opacity: 0, duration: 0.9, ease: "power2.inOut" }, 1.7)
      .to(content, { opacity: 0, duration: 0.5 }, 1.7)
      .add(() => {
        gsap.set(veil, { visibility: "hidden", scaleY: 0, opacity: 1 });
        gsap.set(".hero-inner", { opacity: 1, y: 0, filter: "none" });
        gsap.set(".hero-ornaments", { opacity: 1 });
        if (btn) btn.disabled = false;
        window.ScrollTrigger.refresh();
        celebrationIntro();
        updateSoundUI();
        if (window.AudioEngine && AudioEngine.audible && !soundToastShown) {
          soundToastShown = true;
          window.setTimeout(
            () => toast("Sound on — tap the music note anytime to mute."),
            1500
          );
        }
      }, 2.6);
  }

  function celebrationIntro() {
    if (!gsapReady) return;
    const gsap = window.gsap;
    gsap.fromTo(
      ".birthday-title__name",
      { scale: 0.94, opacity: 0, y: 20 },
      { scale: 1, opacity: 1, y: 0, duration: 1.3, ease: "power4.out" }
    );
    if (!reduce && window.FX) {
      FX.fireworks(2);
      window.setTimeout(() => FX.fireworks(1), 1100);
    }
  }

  /* ==========================================================================
     SHARED HELPERS
     ========================================================================== */
  function setLock(lock) {
    document.documentElement.classList.toggle("is-locked", !!lock);
  }

  function toast(message, ms = 3600) {
    const el = $("#toast");
    const text = $("#toastText");
    if (!el || !text) return;
    text.textContent = message;
    el.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.classList.remove("is-visible"), ms);
  }

  /* ==========================================================================
     BOOT
     ========================================================================== */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
