import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Scene3D, { AUTO_DESCENT_SCROLL_END } from "../components/Scene3D";

const FADE_IN_START = 1.5;
const FADE_IN_END = 2.5;
const FADE_OUT_START = 6.5;
const FADE_OUT_END = 7.5;
const PRODUCT_VH = 9.0;
const AUTO_DESCENT_MS = 4500;

const SPACER1_VH = 3;
const TEXT_TRACK_VH = 4;
const SPACER2_VH = 3.5;

const TEXTS = [
  {
    title: "Hybrid Programmable Bag",
    body: "Where craftsmanship meets technology.\nA new category of object.",
  },
  {
    title: "Modular by Design",
    body: "Configure, adapt, transform.\nEvery component is programmable to your lifestyle.",
  },
  {
    title: "Crafted with Purpose",
    body: "Premium materials, innovative structure.\nMade to evolve with you.",
  },
];

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getSlideOpacity(index, total, progress) {
  const size = 1 / total;
  const start = index * size;
  const end = start + size;
  const fade = size * 0.3;

  if (progress < start || progress >= end) return 0;
  if (progress < start + fade) return (progress - start) / fade;
  if (progress > end - fade) return (end - progress) / fade;
  return 1;
}

const LOGO_LETTERS = "HYBRID".split("");
const INTRO_LINES = [
  "Where the ocean meets design",
  "Born from nature, shaped by craft",
  "A new category of object",
];

export default function Home() {
  const [phase, setPhase] = useState("loading");
  const [loadPercent, setLoadPercent] = useState(0);
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const [textProgress, setTextProgress] = useState(0);
  const [productVisible, setProductVisible] = useState(false);
  const [scrollHintVisible, setScrollHintVisible] = useState(false);
  const textTrackRef = useRef(null);
  const autoDescentCompleteRef = useRef(false);
  const autoDescentRafRef = useRef(null);

  /** Après la descente auto : bande de scroll où le CTA reste visible (px) */
  const SCROLL_HINT_AFTER_DESCENT_PX = 420;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const interval = setInterval(() => {
      setLoadPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 28);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (loadPercent < 100) return;
    const t = setTimeout(() => setPhase("intro"), 800);
    return () => clearTimeout(t);
  }, [loadPercent]);

  useEffect(() => {
    if (phase !== "intro") return;
    const toExit = setTimeout(() => setPhase("introExit"), 9000);
    return () => clearTimeout(toExit);
  }, [phase]);

  useEffect(() => {
    if (phase !== "introExit") return;
    const toScene = setTimeout(() => {
      setPhase("scene");
      window.scrollTo(0, 0);
    }, 2200);
    return () => clearTimeout(toScene);
  }, [phase]);

  useEffect(() => {
    if (phase !== "scene") {
      autoDescentCompleteRef.current = false;
      setScrollHintVisible(false);
      return;
    }

    let cancelled = false;
    window.scrollTo(0, 0);
    document.body.style.overflow = "hidden";
    autoDescentCompleteRef.current = false;

    const targetY = AUTO_DESCENT_SCROLL_END * window.innerHeight;
    const t0 = performance.now();

    function tick(now) {
      if (cancelled) return;
      const u = Math.min(1, (now - t0) / AUTO_DESCENT_MS);
      const eased = easeInOutCubic(u);
      window.scrollTo(0, targetY * eased);
      if (u < 1) {
        autoDescentRafRef.current = requestAnimationFrame(tick);
      } else {
        autoDescentCompleteRef.current = true;
        document.body.style.overflow = "";
        const descentEnd = AUTO_DESCENT_SCROLL_END * window.innerHeight;
        const y = window.scrollY;
        setScrollHintVisible(
          y >= descentEnd - 48 && y < descentEnd + SCROLL_HINT_AFTER_DESCENT_PX,
        );
      }
    }

    autoDescentRafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (autoDescentRafRef.current != null) {
        cancelAnimationFrame(autoDescentRafRef.current);
      }
      document.body.style.overflow = "";
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "scene") return;
    function onScroll() {
      const vh = window.innerHeight;
      const y = window.scrollY;

      if (y <= FADE_IN_START * vh) {
        setFadeOpacity(0);
      } else if (y <= FADE_IN_END * vh) {
        setFadeOpacity(
          (y - FADE_IN_START * vh) / ((FADE_IN_END - FADE_IN_START) * vh),
        );
      } else if (y <= FADE_OUT_START * vh) {
        setFadeOpacity(1);
      } else if (y <= FADE_OUT_END * vh) {
        setFadeOpacity(
          1 -
            (y - FADE_OUT_START * vh) /
              ((FADE_OUT_END - FADE_OUT_START) * vh),
        );
      } else {
        setFadeOpacity(0);
      }

      const track = textTrackRef.current;
      if (track) {
        const rect = track.getBoundingClientRect();
        const stickyRange = track.clientHeight - vh;
        if (stickyRange > 0) {
          setTextProgress(Math.min(1, Math.max(0, -rect.top / stickyRange)));
        }
      }

      setProductVisible(y >= PRODUCT_VH * vh);

      const descentEnd = AUTO_DESCENT_SCROLL_END * vh;
      if (!autoDescentCompleteRef.current) {
        setScrollHintVisible(false);
      } else {
        setScrollHintVisible(
          y >= descentEnd - 48 &&
            y < descentEnd + SCROLL_HINT_AFTER_DESCENT_PX,
        );
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [phase]);

  function handleScrollDownClick() {
    const step = Math.min(window.innerHeight * 0.45, 520);
    window.scrollTo({
      top: window.scrollY + step,
      behavior: "smooth",
    });
  }

  function handleSkipIntro() {
    if (phase !== "intro") return;
    setPhase("introExit");
  }

  return (
    <div className="app">
      {/* ─── Loading screen ─────────────────────────────────────────────── */}
      {(phase === "loading" || phase === "intro") && (
        <div
          className={`loading-screen ${phase === "intro" ? "fade-out" : ""}`}
        >
          <div className="loading-logo">
            {LOGO_LETTERS.map((letter, i) => (
              <span
                key={i}
                className="loading-letter"
                style={{ animationDelay: `${0.15 + i * 0.12}s` }}
              >
                {letter}
              </span>
            ))}
          </div>
          <span className="loading-percent">{loadPercent}%</span>
        </div>
      )}

      {/* ─── Cinematic intro ────────────────────────────────────────────── */}
      {(phase === "intro" || phase === "introExit") && (
        <div
          className={`intro-screen ${phase === "introExit" ? "intro-screen--fade-out" : ""}`}
        >
          {INTRO_LINES.map((line, i) => (
            <p
              key={i}
              className="intro-text"
              style={{ animationDelay: `${i * 3}s` }}
            >
              {line}
            </p>
          ))}
          {phase === "intro" && (
            <button
              type="button"
              className="intro-skip"
              onClick={handleSkipIntro}
              aria-label="Passer l'introduction"
            >
              Passer
            </button>
          )}
        </div>
      )}

      <header className="top-nav">
        <Link to="/" className="brand-mark" aria-label="Hybrid home">
          Hybrid
        </Link>
        <div className="nav-actions">
          <button
            type="button"
            className="sound-button"
            aria-label="Sound control"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 14.5V9.5H8.1L12 6.2V17.8L8.1 14.5H5Z" />
              <path d="M15.2 9.2C16.3 10.1 16.9 11 16.9 12C16.9 13 16.3 13.9 15.2 14.8" />
              <path d="M17.6 6.9C19.5 8.3 20.5 10 20.5 12C20.5 14 19.5 15.7 17.6 17.1" />
            </svg>
          </button>

          <button type="button" className="menu-button" aria-label="Open menu">
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <Scene3D />
      <div className="fade-overlay" style={{ opacity: fadeOpacity }} />

      {phase === "scene" && (
        <button
          type="button"
          className={`scroll-down-cta ${scrollHintVisible ? "scroll-down-cta--visible" : ""}`}
          onClick={handleScrollDownClick}
          aria-label="Scroll down to continue"
        >
          <span className="scroll-down-cta__label">Scroll</span>
          <span className="scroll-down-cta__chevrons" aria-hidden>
            <span className="scroll-down-cta__chevron" />
            <span className="scroll-down-cta__chevron" />
          </span>
        </button>
      )}

      <div
        className="scroll-spacer"
        style={{ height: `${SPACER1_VH * 100}vh` }}
        aria-hidden
      />

      <div
        ref={textTrackRef}
        className="text-track"
        style={{ height: `${TEXT_TRACK_VH * 100}vh` }}
      >
        <div className="text-sticky">
          {TEXTS.map((t, i) => (
            <div
              key={i}
              className="text-slide"
              style={{ opacity: getSlideOpacity(i, TEXTS.length, textProgress) }}
            >
              <h2>{t.title}</h2>
              <p>
                {t.body.split("\n").map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < t.body.split("\n").length - 1 && <br />}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div
        className="scroll-spacer"
        style={{ height: `${SPACER2_VH * 100}vh` }}
        aria-hidden
      />

      <section className="product-section" />

      <Link
        to="/materials"
        className={`cta-button ${productVisible ? "visible" : ""}`}
      >
        Discover Materials
      </Link>
    </div>
  );
}
