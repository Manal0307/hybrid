import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Scene3D, {
  BAG_START_VH,
  TEXT_TRACK_BEFORE_BAG_VH,
} from "../components/Scene3D";
import CoralLoader from "../components/CoralLoader";
import MenuOverlay from "../components/MenuOverlay";

const TEXT_TRACK_VH = TEXT_TRACK_BEFORE_BAG_VH;

/** L’overlay mauve commence à se lever juste avant la fin du dernier texte. */
const FADE_OUT_START = TEXT_TRACK_VH - 0.6;
const FADE_OUT_END = BAG_START_VH + 0.4;

const SPACER2_VH = 5.5;
const PRODUCT_VH = BAG_START_VH + 2.5;

const TEXTS = [
  {
    title: "Where technology meets ecology",
    body: "Hybrid is a bag designed to prove that tech and nature can shape the same object.",
  },
  {
    title: "Giving life back to what we called finished",
    body: "Reclaimed matter, second chances — turned into something to carry every day.",
  },
  {
    title: "A fashion accessory, engineered differently",
    body: "Built with 3D printing, biomaterials and recycled parts. Contemporary, and circular by design.",
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
  const fade = size * 0.3;

  if (index === 0) {
    if (progress >= end) return 0;
    if (progress > end - fade) return 1 - smoothstep(end - fade, end, progress);
    return 1;
  }

  if (progress < start || progress >= end) return 0;
  if (progress < start + fade) return smoothstep(start, start + fade, progress);
  if (progress > end - fade) return 1 - smoothstep(end - fade, end, progress);
  return 1;
}

export default function Home() {
  const [phase, setPhase] = useState("loading");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scenePrimed, setScenePrimed] = useState(false);
  const [loadPercent, setLoadPercent] = useState(0);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const [textProgress, setTextProgress] = useState(0);
  const [productVisible, setProductVisible] = useState(false);
  const [scrollHintVisible, setScrollHintVisible] = useState(false);
  const [bagSceneVisible, setBagSceneVisible] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
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

  useEffect(() => {
    if (phase !== "loading") return;
    if (loadPercent < 100 || !scenePrimed) return;
    setPhase("loadingExit");
  }, [phase, loadPercent, scenePrimed]);

  useEffect(() => {
    if (phase !== "loadingExit") return;
    const t = setTimeout(() => {
      setPhase("scene");
      window.scrollTo(0, 0);
    }, 950);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "scene") {
      setScrollHintVisible(false);
      return;
    }
    document.body.style.overflow = "";
    window.scrollTo(0, 0);
    setScrollHintVisible(true);
  }, [phase]);

  useEffect(() => {
    if (phase !== "scene") return;
    function onScroll() {
      const vh = window.innerHeight;
      const y = window.scrollY;
      const yVh = y / vh;

      let nextFade;
      if (yVh <= FADE_OUT_START) {
        nextFade = 1;
      } else if (yVh < FADE_OUT_END) {
        nextFade = 1 - smoothstep(FADE_OUT_START, FADE_OUT_END, yVh);
      } else {
        nextFade = 0;
      }
      setFadeOpacity(nextFade);

      const track = textTrackRef.current;
      if (track) {
        const rect = track.getBoundingClientRect();
        const stickyRange = track.clientHeight - vh;
        if (stickyRange > 0) {
          setTextProgress(Math.min(1, Math.max(0, -rect.top / stickyRange)));
        }
      }

      setProductVisible(y >= PRODUCT_VH * vh);
      setBagSceneVisible(yVh >= FADE_OUT_START);
      // Visible pendant les textes (mauve) et jusqu’à l’arrivée de la bag scene.
      setScrollHintVisible(yVh < BAG_START_VH + 0.5);
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

      {phase === "scene" && (
        <header
          className={`top-nav${bagSceneVisible ? " top-nav--bag-scene" : ""}${menuOpen ? " top-nav--menu-open" : ""}`}
        >
          <Link to="/" className="brand-mark" aria-label="Hybrid home">
            Hybrid
          </Link>
          <div className="nav-actions">
            <button
              type="button"
              className={`sound-button${soundMuted ? " sound-button--muted" : ""}`}
              aria-label={soundMuted ? "Unmute ambient sound" : "Mute ambient sound"}
              aria-pressed={soundMuted}
              onClick={() => setSoundMuted((muted) => !muted)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 14.5V9.5H8.1L12 6.2V17.8L8.1 14.5H5Z" />
                {!soundMuted && (
                  <>
                    <path d="M15.2 9.2C16.3 10.1 16.9 11 16.9 12C16.9 13 16.3 13.9 15.2 14.8" />
                    <path d="M17.6 6.9C19.5 8.3 20.5 10 20.5 12C20.5 14 19.5 15.7 17.6 17.1" />
                  </>
                )}
                {soundMuted && (
                  <line className="sound-button__mute-line" x1="5" y1="5" x2="19" y2="19" />
                )}
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

      <Scene3D phase={phase} onBagReady={() => setScenePrimed(true)} />

      {/* Overlay mauve : présent dès le départ pour masquer la 3D pendant la transition
          loading → texte (sinon flash de la bag scene derrière le fondu du loading). */}
      <div
        className="fade-overlay"
        style={{ opacity: phase === "scene" ? fadeOpacity : 1 }}
      />

      {phase === "scene" && (
        <button
          type="button"
          className={`scroll-down-cta ${scrollHintVisible ? "scroll-down-cta--visible" : ""}`}
          onClick={handleScrollDownClick}
          aria-label="Scroll down to continue"
        >
          <span className="scroll-down-cta__label">Scroll down</span>
        </button>
      )}

      <div
        ref={textTrackRef}
        className={`text-track${phase !== "loading" ? " text-track--primed" : ""}`}
        style={{ height: `${TEXT_TRACK_VH * 100}vh` }}
        aria-hidden={phase === "loading"}
      >
        <div className="text-sticky">
          {TEXTS.map((t, i) => (
            <div
              key={i}
              className="text-slide"
              style={{
                opacity:
                  phase === "loading"
                    ? i === 0
                      ? 1
                      : 0
                    : getSlideOpacity(i, TEXTS.length, textProgress),
              }}
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
