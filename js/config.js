/* ============================================================================
   ♥ BIRTHDAY CONFIG
   ----------------------------------------------------------------------------
   Everything personal lives here. Change the name, the date, the letter,
   the captions — the whole experience updates itself.
   ========================================================================== */

const CONFIG = {
  /* Her name, exactly as it should appear. */
  name: "My Love",

  /* The two names written in the fireworks sky. */
  herName: "Anu",
  hisName: "Sujit",

  /* The birthday moment (local time). Countdown + date displays use this. */
  birthdayISO: "2026-11-27T00:00:00",
  dateLabel: "27 November 2026",

  /* How the letter is signed. */
  signature: "With all my heart,",

  /* The letter — one string per paragraph. */
  letter: [
    "Today is not just another day. It is the day someone wonderful came into this world.",
    "May your life always be filled with happiness, love, laughter, beautiful memories, and countless reasons to smile. You deserve all the wonderful things this world has to offer.",
    "If I could give you one thing, it would be the chance to see yourself the way I do — the softest heart, the brightest smile, and a kind of beautiful that has nothing to do with mirrors.",
    "Thank you for being my favourite person, my calmest place, and my happiest thought. Here's to more sunsets, more silly songs, more late-night talks, and a lifetime of birthdays spent together.",
  ],

  /* Gallery — photos live in the project root. Add or remove freely. */
  memories: [
    {
      src: "1.jpg",
      alt: "Her in a red silk saree, glowing in warm festive light",
      caption: "You in red, and my heart forgetting how to behave.",
      note: "Some evenings are ordinary. And then you walk in, and the whole room becomes a memory.",
    },
    {
      src: "2.jpg",
      alt: "Sunlight in her hair as she stands beside an old wooden door",
      caption: "The sun took one look at you and decided to stay.",
      note: "That afternoon light had one job, and it did it beautifully.",
    },
    {
      src: "3.jpg",
      alt: "Her in a teal floral saree, hand resting in her hair",
      caption: "Every colour looks like it was made for you.",
      note: "You don't just wear a saree. You give it a story.",
    },
    {
      src: "5.jpg",
      alt: "A warm vintage portrait from 1985 of a smiling woman",
      caption: "Proof that grace runs in the family.",
      note: "Some smiles never really age. This one feels like home.",
      badge: "1985",
    },
  ],
};

/* Handy shortcuts used across the app. */
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;

/* Top-level consts are not properties of window, so expose what other
   scripts look for (window.CONFIG, window.FX, window.AudioEngine). */
window.CONFIG = CONFIG;
