import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Scene3D, { BOTTLE_SCROLL_VH, BAG_START_VH } from "../components/Scene3D";
import CoralLoader from "../components/CoralLoader";
import MenuOverlay from "../components/MenuOverlay";

const B = BOTTLE_SCROLL_VH;

const TEXT_TRACK_VH = 4;
// Phase texte : B → B+4 (4vh→8vh). Phase bag : B+4 → fin.
/** Voile noir s'active juste avant la fin de la bouteille */
const FADE_BOTTLE_START = B - 0.5;   // 3.5
/** Noir complet pendant tout le texte */
const FADE_BOTTLE_FULL = B + 0.3;    // 4.3
/** Le voile se lève sur une fenêtre plus longue — la scène sac est déjà rendue dessous */
const FADE_OUT_START = BAG_START_VH - 1.1;
const FADE_OUT_END = BAG_START_VH + 0.45;
const PRODUCT_VH = B + TEXT_TRACK_VH + 2.5;      // 10.5

/** Track des phrases d'intro : occupe toute la zone bottle (sticky sur la scène 3D). */
const INTRO_TRACK_VH = B; // 4 — couvre exactement la durée de la bottle scene
const SPACER2_VH = 5.5; // assez de scroll pour que le sac flotte à la fin

const TEXTS = [
  {
    title: "Hybrid Bag — Circular by Design",
    body: "A carry built for a circular path — recovered matter, refined processes, longer life for what already exists.",
  },
  {
    title: "Where Technology Meets Ecology",
    body: "Programmable structure and living materials side by side.\nNo trade-off between making better and doing less harm.",
  },
  {
    title: "Two Worlds, One Object",
    body: "Industry and ocean. Code and craft.\nThey meet in one bag — Hybrid.",
  },
];

function smoothstep(edge0, edge1, x) {
  if (x <= edge0) return 0;
  if (x >= edge1) return 1;
  const t = (x - edge0) / (edge1 - edge0);
  return t * t * (3 - 2 * t);
}

function getSlideOpacity(index, total, progress) {
  const size = 1 / total;
  const start = index * size;
  const end = start + size;
  const fade = size * 0.42;

  if (progress < start || progress >= end) return 0;
  if (progress < start + fade) return smoothstep(start, start + fade, progress);
  if (progress > end - fade) return 1 - smoothstep(end - fade, end, progress);
  return 1;
}

const LOGO_LETTERS = "HYBRID".split("");
const INTRO_LINES = [
  "Our waters are filling with what we throw away",
  "Pollution is the footprint of how we design and consume",
  "Another way forward has to begin somewhere",
];

export default function Home() {
  const [phase, setPhase] = useState("loading");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scenePrimed, setScenePrimed] = useState(false);
  const [loadPercent, setLoadPercent] = useState(0);
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const [textProgress, setTextProgress] = useState(0);
  const [introProgress, setIntroProgress] = useState(0);
  const [introOpacity, setIntroOpacity] = useState(1);
  const [productVisible, setProductVisible] = useState(false);
  const [scrollHintVisible, setScrollHintVisible] = useState(false);
  const [textStickyOpacity, setTextStickyOpacity] = useState(1);
  const menuOverlayRef = useRef(null);
  const textTrackRef = useRef(null);

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

  // Loading → loadingExit dès que le compteur est plein ET que la bottle scene est prête.
  useEffect(() => {
    if (phase !== "loading") return;
    if (loadPercent < 100 || !scenePrimed) return;
    setPhase("loadingExit");
  }, [phase, loadPercent, scenePrimed]);

  // loadingExit → scene après le temps du fondu (timeout dans un effet séparé
  // pour éviter qu'il soit annulé par le re-run dû au changement de phase).
  useEffect(() => {
    if (phase !== "loadingExit") return;
    const t = setTimeout(() => {
      setPhase("scene");
      window.scrollTo(0, 0);
    }, 1100);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "scene") {
      setScrollHintVisible(false);
      return;
    }
    document.body.style.overflow = ""; // relâche le lock posé pendant le loading
    window.scrollTo(0, 0);
    setScrollHintVisible(true);
  }, [phase]);

  useEffect(() => {
    if (phase !== "scene") return;
    function onScroll() {
      const vh = window.innerHeight;
      const y = window.scrollY;

      const yVh = y / vh;
      let nextFade = 0;
      if (yVh < FADE_BOTTLE_START) {
        nextFade = 0;
      } else if (yVh < FADE_BOTTLE_FULL) {
        nextFade = smoothstep(FADE_BOTTLE_START, FADE_BOTTLE_FULL, yVh);
      } else if (yVh <= FADE_OUT_START) {
        nextFade = 1;
      } else if (yVh < FADE_OUT_END) {
        nextFade = 1 - smoothstep(FADE_OUT_START, FADE_OUT_END, yVh);
      } else {
        nextFade = 0;
      }
      setFadeOpacity(nextFade);

      // Intro lines : progression et fade-out à l'approche de la fin de la bottle scene.
      setIntroProgress(Math.min(1, Math.max(0, yVh / B)));
      setIntroOpacity(1 - smoothstep(B - 0.6, B - 0.05, yVh));

      setTextStickyOpacity(
        1 - smoothstep(BAG_START_VH - 0.9, BAG_START_VH + 0.35, yVh),
      );

      const track = textTrackRef.current;
      if (track) {
        const rect = track.getBoundingClientRect();
        const stickyRange = track.clientHeight - vh;
        if (stickyRange > 0) {
          setTextProgress(Math.min(1, Math.max(0, -rect.top / stickyRange)));
        }
      }

      setProductVisible(y >= PRODUCT_VH * vh);
      setScrollHintVisible(y < B * vh);
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

  return (
    <div className="app">
      {/* ─── Loading screen ─────────────────────────────────────────────── */}
      {(phase === "loading" || phase === "loadingExit") && (
        <div
          className={`loading-screen ${phase === "loadingExit" ? "fade-out" : ""}`}
        >
          <CoralLoader />
          <p className="loading-text">
            Transforming<span className="loading-text__dots">…</span>{" "}
            <span className="loading-text__percent">{loadPercent}%</span>
          </p>
        </div>
      )}

      {phase !== "loading" && (
      <header className={`top-nav${menuOpen ? " top-nav--menu-open" : ""}`}>
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

          <button
            type="button"
            className={`menu-button ${menuOpen ? "menu-button--open" : ""}`}
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => {
              if (menuOpen) menuOverlayRef.current?.requestClose?.();
              else setMenuOpen(true);
            }}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>
      )}

      {/* Toujours monté : on précharge la bottle scene derrière le loader
          pour que `scenePrimed` puisse se déclencher avant la transition. */}
      <Scene3D onBottleReady={() => setScenePrimed(true)} />
      {phase === "scene" && (
        <div className="fade-overlay" style={{ opacity: fadeOpacity }} />
      )}

      {phase === "scene" && (
        <button
          type="button"
          className={`scroll-down-cta ${scrollHintVisible ? "scroll-down-cta--visible" : ""}`}
          onClick={handleScrollDownClick}
          aria-label="Scroll down to continue"
        >
          <span className="scroll-down-cta__label">Scroll</span>
        </button>
      )}

      {/* ─── Intro lines : sticky par-dessus la bottle/fruits scene ─────── */}
      <div
        className="intro-track"
        style={{ height: `${INTRO_TRACK_VH * 100}vh` }}
        aria-hidden={phase !== "scene"}
      >
        <div
          className="intro-track__sticky"
          style={{ opacity: phase === "scene" ? introOpacity : 0 }}
        >
          {INTRO_LINES.map((line, i) => (
            <p
              key={i}
              className="intro-line"
              style={{
                opacity: getSlideOpacity(
                  i,
                  INTRO_LINES.length,
                  introProgress,
                ),
              }}
            >
              {line}
            </p>
          ))}
        </div>
      </div>

      <div
        ref={textTrackRef}
        className="text-track"
        style={{ height: `${TEXT_TRACK_VH * 100}vh` }}
      >
        <div
          className="text-sticky"
          style={{ opacity: textStickyOpacity }}
        >
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

      {menuOpen && (
        <MenuOverlay
          ref={menuOverlayRef}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}
