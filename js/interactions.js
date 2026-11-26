/* ============================================================================
   ♥ INTERACTIONS — cake, gallery, gift, wish
   ========================================================================== */

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pad = (n) => String(n).padStart(2, "0");
  const reduce = prefersReducedMotion;
  const Bday = window.Bday;

  let gsapReady = false;

  function boot() {
    if (!window.Bday) {
      window.setTimeout(boot, 60);
      return;
    }
    gsapReady = !!(window.gsap && window.ScrollTrigger);
    initCake();
    initGallery();
    initGift();
    initWish();
    initKeyboard();
  }

  /* ==========================================================================
     THE CAKE — blow out the candles (tap or microphone)
     ========================================================================== */
  function initCake() {
    const cake = $("#cakeBox");
    const blowBtn = $("#blowBtn");
    const relightBtn = $("#relightBtn");
    const hint = $("#cakeHint");
    const listening = $("#listening");
    const cancel = $("#listeningCancel");
    const wishCard = $("#wishCard");
    const wishClose = $("#wishCardClose");
    if (!cake) return;

    let blown = false;
    const mic = {
      active: false,
      stream: null,
      ctx: null,
      analyser: null,
      raf: null,
      timer: null,
    };

    /* ---- wish card ---- */
    function showWishCard() {
      if (!wishCard) return;
      wishCard.hidden = false;
      if (gsapReady) {
        window.gsap.set(wishCard, { xPercent: -50, yPercent: -50 });
        window.gsap.fromTo(
          wishCard,
          { opacity: 0, scale: 0.82, y: 28 },
          { opacity: 1, scale: 1, y: 0, duration: 0.9, ease: "back.out(1.4)" }
        );
      }
    }

    function hideWishCard(instant) {
      if (!wishCard) return;
      if (instant || !gsapReady) {
        wishCard.hidden = true;
        if (window.gsap) window.gsap.set(wishCard, { clearProps: "opacity,transform" });
        return;
      }
      window.gsap.to(wishCard, {
        opacity: 0,
        scale: 0.9,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          wishCard.hidden = true;
          window.gsap.set(wishCard, { clearProps: "opacity,transform" });
        },
      });
    }

    /* ---- the big moment ---- */
    function blowOut() {
      if (blown) return;
      blown = true;
      stopListening();

      if (window.AudioEngine) {
        AudioEngine.whoosh();
        if (AudioEngine.isStarted()) AudioEngine.chime();
      }

      cake.classList.add("is-blown");
      if (blowBtn) blowBtn.hidden = true;
      if (relightBtn) relightBtn.hidden = false;
      if (hint) hint.textContent = "Wish made. Keep it close.";

      showWishCard();

      if (!reduce && window.FX) {
        const r = cake.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height * 0.3;
        FX.confettiBurst(cx, cy, { count: 90, speed: 560, spread: 100 });
        FX.confettiRain(70);
        FX.sparkleBurst(cx, cy, 24);
        FX.fireworks(4);
        window.setTimeout(() => FX.heartBurst(window.innerWidth / 2, window.innerHeight * 0.36, 10), 750);
        window.setTimeout(() => FX.fireworks(3), 1900);
        window.setTimeout(() => FX.fireworks(2), 3400);
      }
    }

    function relight() {
      if (!blown) return;
      blown = false;
      cake.classList.remove("is-blown");
      if (relightBtn) relightBtn.hidden = true;
      if (blowBtn) blowBtn.hidden = false;
      if (hint) hint.textContent = "Tap the cake to blow out the candles";
      hideWishCard(true);
      if (window.AudioEngine && AudioEngine.isStarted()) AudioEngine.pop();
      if (!reduce && window.FX) {
        const r = cake.getBoundingClientRect();
        FX.sparkleBurst(r.left + r.width / 2, r.top + 40, 16);
      }
    }

    cake.addEventListener("click", () => {
      if (!blown) blowOut();
    });
    cake.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && !blown) {
        event.preventDefault();
        blowOut();
      }
    });

    if (blowBtn) {
      blowBtn.addEventListener("click", () => {
        if (!blown) startListening();
      });
    }
    if (relightBtn) relightBtn.addEventListener("click", relight);
    if (wishClose) wishClose.addEventListener("click", () => hideWishCard(false));
    if (cancel) cancel.addEventListener("click", stopListening);

    /* ---- optional microphone blow detection ---- */
    async function startListening() {
      if (mic.active || blown) return;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        Bday.toast("This browser can't listen in — just tap the cake instead.");
        return;
      }

      try {
        if (window.AudioEngine) AudioEngine.duck(true);
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
        });

        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) throw new Error("No audio context");
        const ctx = new AC();
        if (ctx.state === "suspended") await ctx.resume();

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.72;
        source.connect(analyser);

        mic.active = true;
        mic.stream = stream;
        mic.ctx = ctx;
        mic.analyser = analyser;

        if (listening) listening.hidden = false;
        if (blowBtn) blowBtn.disabled = true;

        const bars = listening ? $$(".listening__meter i", listening) : [];
        const data = new Uint8Array(analyser.fftSize);
        let loudFrames = 0;

        const loop = () => {
          if (!mic.active) return;
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          const level = Math.min(1, rms * 7);
          bars.forEach((bar, i) => {
            bar.style.height = 3 + level * (8 + i * 2) + "px";
          });

          if (rms > 0.12) loudFrames++;
          else loudFrames = Math.max(0, loudFrames - 1);

          if (loudFrames >= 5) {
            stopListening();
            blowOut();
            return;
          }
          mic.raf = requestAnimationFrame(loop);
        };
        loop();

        mic.timer = window.setTimeout(() => {
          stopListening();
          Bday.toast("Take your time — tap the cake whenever you're ready.");
        }, 20000);
      } catch (err) {
        stopListening();
        Bday.toast("The microphone stayed shy — just tap the cake instead.");
      }
    }

    function stopListening() {
      if (mic.raf) cancelAnimationFrame(mic.raf);
      if (mic.timer) window.clearTimeout(mic.timer);
      if (mic.stream) mic.stream.getTracks().forEach((track) => track.stop());
      if (mic.ctx) {
        try {
          mic.ctx.close();
        } catch (err) {
          /* ignore */
        }
      }
      mic.active = false;
      mic.stream = null;
      mic.ctx = null;
      mic.analyser = null;
      mic.raf = null;
      mic.timer = null;
      if (listening) listening.hidden = true;
      if (blowBtn) blowBtn.disabled = false;
      if (window.AudioEngine) AudioEngine.duck(false);
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopListening();
    });
  }

  /* ==========================================================================
     MEMORY GALLERY + LIGHTBOX
     ========================================================================== */
  function initGallery() {
    const gallery = $("#gallery");
    const prevBtn = $("#galleryPrev");
    const nextBtn = $("#galleryNext");
    const progress = $("#galleryProgress");
    const count = $("#galleryCount");
    if (!gallery) return;

    const cards = $$(".memory-card", gallery);
    const photoCards = cards.filter((card) => card.dataset.index !== undefined);
    let activeIndex = 0;
    let suppressClick = false;

    /* ---- accessibility for each photo ---- */
    photoCards.forEach((card) => {
      const frame = $(".memory-card__frame", card);
      if (!frame) return;
      frame.tabIndex = 0;
      frame.setAttribute("role", "button");
      frame.setAttribute("aria-label", "Open memory: " + (card.dataset.caption || "photo"));
      frame.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openLightbox(Number(card.dataset.index));
        }
      });
    });

    /* ---- UI sync ---- */
    function updateUI() {
      const gr = gallery.getBoundingClientRect();
      const center = gr.left + gr.width / 2;
      let best = 0;
      let bestDist = Infinity;

      cards.forEach((card, i) => {
        const r = card.getBoundingClientRect();
        const c = r.left + r.width / 2;
        const d = Math.abs(c - center);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      activeIndex = best;

      if (count) count.innerHTML = `${pad(activeIndex + 1)} <em>/ ${pad(cards.length)}</em>`;

      const max = gallery.scrollWidth - gallery.clientWidth;
      const p = max > 0 ? gallery.scrollLeft / max : 0;
      if (progress) progress.style.transform = `scaleX(${0.08 + p * 0.92})`;
      if (prevBtn) prevBtn.disabled = gallery.scrollLeft <= 4;
      if (nextBtn) nextBtn.disabled = gallery.scrollLeft >= max - 4;
    }

    let uiFrame = null;
    gallery.addEventListener(
      "scroll",
      () => {
        if (uiFrame) return;
        uiFrame = requestAnimationFrame(() => {
          uiFrame = null;
          updateUI();
        });
      },
      { passive: true }
    );

    function scrollCardIntoView(index) {
      const card = cards[clamp(index, 0, cards.length - 1)];
      if (!card) return;
      const gr = gallery.getBoundingClientRect();
      const cr = card.getBoundingClientRect();
      const target = gallery.scrollLeft + (cr.left - gr.left) - (gr.width - cr.width) / 2;
      gallery.scrollTo({ left: Math.max(0, target), behavior: reduce ? "auto" : "smooth" });
    }

    function step(dir) {
      const target = clamp(activeIndex + dir, 0, cards.length - 1);
      scrollCardIntoView(target);
    }

    if (prevBtn) prevBtn.addEventListener("click", () => step(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => step(1));

    gallery.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      }
    });

    /* ---- drag to wander (desktop / trackpads) ---- */
    let dragging = false;
    let dragStartX = 0;
    let dragStartScroll = 0;
    let moved = false;

    gallery.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch" || event.button !== 0) return;
      dragging = true;
      moved = false;
      dragStartX = event.clientX;
      dragStartScroll = gallery.scrollLeft;
      gallery.classList.add("is-dragging");
      try {
        gallery.setPointerCapture(event.pointerId);
      } catch (err) {
        /* ignore */
      }
    });

    gallery.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const dx = event.clientX - dragStartX;
      if (Math.abs(dx) > 5) moved = true;
      gallery.scrollLeft = dragStartScroll - dx;
    });

    function endDrag(event) {
      if (!dragging) return;
      dragging = false;
      gallery.classList.remove("is-dragging");
      try {
        gallery.releasePointerCapture(event.pointerId);
      } catch (err) {
        /* ignore */
      }
      if (moved) {
        suppressClick = true;
        window.setTimeout(() => {
          suppressClick = false;
        }, 120);
      }
    }
    gallery.addEventListener("pointerup", endDrag);
    gallery.addEventListener("pointercancel", endDrag);

    gallery.addEventListener("click", (event) => {
      if (suppressClick) return;
      const card = event.target.closest(".memory-card[data-index]");
      if (card) openLightbox(Number(card.dataset.index));
    });

    window.addEventListener("resize", () => window.setTimeout(updateUI, 150));
    window.addEventListener("load", () => window.setTimeout(updateUI, 250));
    updateUI();

    /* ---- lightbox ---- */
    const lightbox = $("#lightbox");
    const lbImage = $("#lbImage");
    const lbCaption = $("#lbCaption");
    const lbNote = $("#lbNote");
    const lbCount = $("#lbCount");
    const lbPrev = $("#lbPrev");
    const lbNext = $("#lbNext");
    let lbIndex = 0;
    let lastFocus = null;

    function updateLightbox() {
      const card = photoCards[lbIndex];
      if (!card) return;
      const img = $("img", card);
      if (lbImage && img) {
        lbImage.src = img.currentSrc || img.src;
        lbImage.alt = img.alt;
      }
      if (lbCaption) lbCaption.textContent = card.dataset.caption || "";
      if (lbNote) lbNote.textContent = card.dataset.note || "";
      if (lbCount) lbCount.textContent = `${pad(lbIndex + 1)} / ${pad(photoCards.length)}`;
      if (lbPrev) lbPrev.disabled = lbIndex === 0;
      if (lbNext) lbNext.disabled = lbIndex === photoCards.length - 1;
    }

    function openLightbox(index) {
      if (!lightbox || !photoCards.length) return;
      lbIndex = clamp(index, 0, photoCards.length - 1);
      lastFocus = document.activeElement;
      updateLightbox();
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      Bday.setLock(true);
      if (window.AudioEngine && AudioEngine.isStarted()) AudioEngine.pop();
      window.setTimeout(() => {
        const closeBtn = $(".lightbox__close", lightbox);
        if (closeBtn) closeBtn.focus({ preventScroll: true });
      }, 80);
    }

    function closeLightbox() {
      if (!lightbox || !lightbox.classList.contains("is-open")) return;
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      Bday.setLock(false);
      if (lastFocus) {
        window.setTimeout(() => lastFocus.focus({ preventScroll: true }), 120);
      }
    }

    function showPrev() {
      if (lbIndex > 0) {
        lbIndex--;
        updateLightbox();
      }
    }
    function showNext() {
      if (lbIndex < photoCards.length - 1) {
        lbIndex++;
        updateLightbox();
      }
    }

    if (lbPrev) lbPrev.addEventListener("click", showPrev);
    if (lbNext) lbNext.addEventListener("click", showNext);

    $$("[data-lightbox-close]").forEach((el) => {
      el.addEventListener("click", closeLightbox);
    });

    // expose for the global keyboard handler
    window.__closeLightbox = closeLightbox;
    window.__lightboxOpen = () => !!lightbox && lightbox.classList.contains("is-open");
    window.__lightboxNav = (dir) => {
      if (dir > 0) showNext();
      else showPrev();
    };
  }

  /* ==========================================================================
     THE GIFT
     ========================================================================== */
  function initGift() {
    const giftBox = $("#giftBox");
    const giftNote = $("#giftNote");
    const giftHint = $("#giftHint");
    const closeBtn = $("#giftNoteClose");
    if (!giftBox || !giftNote) return;

    let giftOpen = false;
    let closing = false;

    function openGift() {
      if (giftOpen || closing) return;
      giftOpen = true;

      giftBox.classList.add("is-open");
      giftBox.setAttribute("aria-expanded", "true");
      giftNote.classList.add("is-visible");
      giftNote.setAttribute("aria-hidden", "false");
      if (giftHint) giftHint.textContent = "…and a whole lifetime inside.";

      const r = giftBox.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.35;

      if (window.AudioEngine && AudioEngine.isStarted()) AudioEngine.chime();
      if (!reduce && window.FX) {
        FX.confettiBurst(cx, cy, { count: 72, speed: 470, spread: 100 });
        FX.sparkleBurst(cx, cy, 18);
        window.setTimeout(() => FX.heartBurst(cx, cy - 80, 7), 900);
      }

      if (gsapReady) {
        const gsap = window.gsap;
        gsap.set(giftNote, { xPercent: -50, yPercent: -50 });
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.to(giftBox, { y: 8, duration: 0.14, ease: "power2.inOut" }, 0)
          .to(giftBox, { y: 0, duration: 0.3 }, 0.14)
          .to(".gift-lid", { y: -155, x: 34, rotation: -22, opacity: 0, duration: 1.05 }, 0.18)
          .to(".gift-beam", { scaleY: 1, opacity: 1, duration: 0.85 }, 0.4)
          .fromTo(
            giftNote,
            { opacity: 0, scale: 0.35 },
            { opacity: 1, scale: 1, duration: 0.9, ease: "back.out(1.4)" },
            0.55
          )
          .fromTo(
            giftNote.querySelectorAll("p, h3, .gift-note__coupon"),
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.55, stagger: 0.07 },
            0.85
          )
          .to(giftBox, { y: 22, scale: 0.95, duration: 0.7, ease: "power2.out" }, 0.6);
      } else {
        giftNote.style.opacity = "1";
        giftNote.style.transform = "translate(-50%, -50%) scale(1)";
      }

      if (!reduce && window.FX) window.setTimeout(() => FX.fireworks(2), 500);
    }

    function closeGift() {
      if (!giftOpen || closing) return;
      closing = true;

      const finish = () => {
        giftOpen = false;
        closing = false;
        giftBox.classList.remove("is-open");
        giftBox.setAttribute("aria-expanded", "false");
        giftNote.classList.remove("is-visible");
        giftNote.setAttribute("aria-hidden", "true");
        if (giftHint) giftHint.textContent = "Tap the gift to open it";

        if (window.gsap) {
          window.gsap.set(giftNote, { clearProps: "opacity,transform" });
          window.gsap.set(giftBox, { clearProps: "transform" });
          window.gsap.set(".gift-lid", { clearProps: "transform,opacity" });
          window.gsap.set(".gift-beam", { clearProps: "transform,opacity" });
        }
        giftBox.focus({ preventScroll: true });
      };

      if (gsapReady) {
        const gsap = window.gsap;
        gsap
          .timeline({ onComplete: finish })
          .to(giftNote, { opacity: 0, scale: 0.55, y: 24, duration: 0.35, ease: "power2.in" })
          .to(".gift-beam", { opacity: 0, scaleY: 0, duration: 0.45 }, 0)
          .to(".gift-lid", { y: 0, x: 0, rotation: 0, opacity: 1, duration: 0.7, ease: "back.out(1.3)" }, 0.1)
          .to(giftBox, { y: 0, scale: 1, duration: 0.5 }, 0.15);
      } else {
        finish();
      }
    }

    giftBox.addEventListener("click", openGift);
    if (closeBtn) closeBtn.addEventListener("click", closeGift);
    window.__closeGift = closeGift;
  }

  /* ==========================================================================
     THE WISH
     ========================================================================== */
  function initWish() {
    const modal = $("#wishModal");
    const openBtn = $("#wishBtn");
    const closeBtn = $("#wishClose");
    const form = $("#wishForm");
    const input = $("#wishInput");
    const formWrap = $("#wishFormWrap");
    const success = $("#wishSuccess");
    const echo = $("#wishEcho");
    const secret = $("#wishSecret");
    const done = $("#wishDone");
    const canvas = $("#wishCanvas");
    if (!modal || !openBtn) return;

    let wishOpen = false;
    let lastFocus = null;

    function resetWish() {
      if (formWrap) formWrap.hidden = false;
      if (success) success.hidden = true;
      if (echo) {
        echo.hidden = true;
        echo.textContent = "";
      }
      if (input) {
        input.value = "";
        input.placeholder = "I wish for…";
        input.classList.remove("is-shaking");
      }
      if (form) {
        const submit = form.querySelector('button[type="submit"]');
        if (submit) submit.disabled = false;
      }
      if (window.gsap) window.gsap.set(success, { clearProps: "opacity,transform" });
    }

    function openWish() {
      if (wishOpen) return;
      wishOpen = true;
      resetWish();
      lastFocus = document.activeElement;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      Bday.setLock(true);

      if (!Bday.nights.wish && window.FX) {
        Bday.nights.wish = FX.createNight(canvas);
      }
      if (Bday.nights.wish) {
        Bday.nights.wish.start();
        window.setTimeout(() => Bday.nights.wish.shoot(), 900);
      }
      if (window.AudioEngine && AudioEngine.isStarted()) AudioEngine.chime();
      window.setTimeout(() => {
        if (input) input.focus({ preventScroll: true });
      }, 650);
    }

    function closeWish() {
      if (!wishOpen) return;
      wishOpen = false;
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      Bday.setLock(false);

      const night = Bday.nights.wish;
      if (night) window.setTimeout(() => night.stop(), 500);
      if (lastFocus) {
        window.setTimeout(() => lastFocus.focus({ preventScroll: true }), 220);
      }
    }

    function submitWish(raw, silent) {
      const value = String(raw || "").trim();

      if (!silent && !value) {
        if (input) {
          input.classList.add("is-shaking");
          input.placeholder = "Even one word is enough, my love…";
          input.focus();
          window.setTimeout(() => input.classList.remove("is-shaking"), 500);
        }
        return;
      }

      const rect = input ? input.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      if (window.AudioEngine && AudioEngine.isStarted()) AudioEngine.sparkle();
      if (!reduce && window.FX) {
        FX.sparkleBurst(cx, cy, 26);
        window.setTimeout(() => FX.sparkleBurst(window.innerWidth / 2, window.innerHeight * 0.2, 34), 900);
      }

      // a little wish-orb floating up to the stars
      const orb = document.createElement("div");
      orb.className = "wish-flying-orb";
      orb.style.left = cx + "px";
      orb.style.top = cy + "px";
      document.body.appendChild(orb);

      if (gsapReady) {
        const gsap = window.gsap;
        gsap.fromTo(orb, { scale: 0.3, opacity: 0 }, { scale: 1.3, opacity: 1, duration: 0.4 });
        gsap.to(orb, {
          y: -(cy - window.innerHeight * 0.16),
          x: window.innerWidth / 2 - cx,
          scale: 0.25,
          opacity: 0,
          duration: 1.5,
          delay: 0.35,
          ease: "power2.in",
          onComplete: () => orb.remove(),
        });
      } else {
        window.setTimeout(() => orb.remove(), 1200);
      }

      const night = Bday.nights.wish;
      if (night) {
        window.setTimeout(() => night.shoot(), 300);
        window.setTimeout(() => night.shoot(), 1200);
      }

      if (formWrap) formWrap.hidden = true;
      if (success) success.hidden = false;
      if (echo) {
        echo.textContent = value;
        echo.hidden = !value;
      }
      if (gsapReady) {
        window.gsap.fromTo(success, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" });
      }
      window.setTimeout(() => {
        if (done) done.focus({ preventScroll: true });
      }, 650);
    }

    openBtn.addEventListener("click", openWish);
    if (closeBtn) closeBtn.addEventListener("click", closeWish);
    if (done) {
      done.addEventListener("click", () => {
        closeWish();
        window.setTimeout(() => Bday.scrollToSection("#cake"), 420);
      });
    }
    if (secret) secret.addEventListener("click", () => submitWish("", true));

    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        submitWish(input ? input.value : "", false);
      });
    }

    modal.addEventListener("click", (event) => {
      if (
        event.target === modal ||
        event.target === canvas ||
        event.target.classList.contains("wish-modal__glow")
      ) {
        closeWish();
      }
    });

    window.__closeWish = closeWish;
    window.__wishOpen = () => wishOpen;
  }

  /* ==========================================================================
     GLOBAL KEYBOARD
     ========================================================================== */
  function initKeyboard() {
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (window.__lightboxOpen && window.__lightboxOpen()) {
          window.__closeLightbox();
        } else if (window.__wishOpen && window.__wishOpen()) {
          window.__closeWish();
        }
        return;
      }

      if (window.__lightboxOpen && window.__lightboxOpen()) {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          window.__lightboxNav(1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          window.__lightboxNav(-1);
        }
      }
    });
  }

  /* ==========================================================================
     BOOT
     ========================================================================== */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
