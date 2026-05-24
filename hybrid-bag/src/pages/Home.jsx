import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import Scene3D, {
  BAG_START_VH,
  TEXT_TRACK_BEFORE_BAG_VH,
  EMERGENCE_START,
  EMERGENCE_END,
  PRODUCT_REVEAL_VH,
  SCROLL_LOCK_VH,
} from "../components/Scene3D";
import CoralLoader from "../components/CoralLoader";
import MenuOverlay from "../components/MenuOverlay";
import SoundButton from "../components/SoundButton";
import { useAmbientSound } from "../context/AmbientSoundContext";
import {
  homeBagLink,
  markHomeIntroDone,
  shouldSkipHomeIntro,
} from "../utils/homeNav";

const TEXT_TRACK_VH = TEXT_TRACK_BEFORE_BAG_VH;

/** L’overlay mauve commence à se lever juste avant la fin du dernier texte. */
const FADE_OUT_START = TEXT_TRACK_VH - 0.6;
const FADE_OUT_END = BAG_START_VH + 0.4;

/** Spacer calculé pour que la page se termine pile au scroll lock — pas de clamp brutal. */
const SPACER2_VH = Math.max(0, SCROLL_LOCK_VH - TEXT_TRACK_VH);

/** Titre « Hybrid Handbag » : visible sur l’eau, disparaît quand le sac émerge. */
const BAG_EMERGENCE_START_VH = BAG_START_VH + EMERGENCE_START;
const BAG_EMERGENCE_END_VH = BAG_START_VH + EMERGENCE_END;

const INTRO_SLIDES = [
  {
    title: "They called it waste",
    body: "Oyster shells, flower waste, reclaimed parts the world had already left behind.",
  },
  {
    title: "We gave it a second life",
    body: "Hybrid is a handbag made from that discarded matter. Rebuilt to be carried, not thrown away.",
  },
  {
    title: "Technology meets ecology",
    body: "3D-printed in oyster shell filament. Lined with red cabbage bioplastics and recycled fabric.",
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

/** Opacité minimale du titre une fois le sac sorti (reste en filigrane). */
const HERO_TITLE_MIN_OPACITY = 0.1;

function getHybridHeroOpacity(yVh) {
  if (yVh < FADE_OUT_START) return 0;
  const fadeIn = smoothstep(FADE_OUT_START, FADE_OUT_END, yVh);
  const emerge = smoothstep(BAG_EMERGENCE_START_VH, BAG_EMERGENCE_END_VH, yVh);
  const fadeOut =
    HERO_TITLE_MIN_OPACITY + (1 - HERO_TITLE_MIN_OPACITY) * (1 - emerge);
  return fadeIn * fadeOut;
}

export default function Home() {
  const location = useLocation();
  const skipIntro = useMemo(
    () => shouldSkipHomeIntro(location),
    [location.state?.skipIntro, location.key],
  );

  const [phase, setPhase] = useState(() => (skipIntro ? "scene" : "loading"));
  const [menuOpen, setMenuOpen] = useState(false);
  const [scenePrimed, setScenePrimed] = useState(false);
  const [loadPercent, setLoadPercent] = useState(0);
  const [fadeOpacity, setFadeOpacity] = useState(() => (skipIntro ? 0 : 1));
  const [textProgress, setTextProgress] = useState(() => (skipIntro ? 1 : 0));
  const [productVisible, setProductVisible] = useState(() => skipIntro);
  const [scrollHintVisible, setScrollHintVisible] = useState(false);
  const [bagSceneVisible, setBagSceneVisible] = useState(() => skipIntro);
  const { unlock, setWaterActive } = useAmbientSound();
  const [textRevealing, setTextRevealing] = useState(() => skipIntro);
  const [navVisible, setNavVisible] = useState(() => skipIntro);
  const [uiIntroReady, setUiIntroReady] = useState(() => skipIntro);
  const [hybridHeroOpacity, setHybridHeroOpacity] = useState(0);
  const menuOverlayRef = useRef(null);
  const textTrackRef = useRef(null);

  useEffect(() => {
    if (skipIntro || phase === "loadingExit" || phase === "scene") {
      unlock();
    }
  }, [phase, skipIntro, unlock]);

  useEffect(() => {
    if (phase !== "scene") {
      setWaterActive(false);
      return;
    }
    setWaterActive(bagSceneVisible);
  }, [phase, bagSceneVisible, setWaterActive]);

  useEffect(() => () => setWaterActive(false), [setWaterActive]);

  useEffect(() => {
    if (!skipIntro) return;
    markHomeIntroDone();
    document.body.style.overflow = "";
    const scrollToBag = () => {
      window.scrollTo(0, SCROLL_LOCK_VH * window.innerHeight);
    };
    scrollToBag();
    requestAnimationFrame(scrollToBag);
    const retry = window.setTimeout(scrollToBag, 80);
    return () => window.clearTimeout(retry);
  }, [skipIntro]);

  useEffect(() => {
    if (phase !== "scene") return;
    markHomeIntroDone();
  }, [phase]);

  useEffect(() => {
    if (skipIntro) return;
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
  }, [skipIntro]);

  useEffect(() => {
    if (loadPercent >= 100) unlock();
  }, [loadPercent, unlock]);

  useEffect(() => {
    if (phase !== "loading") return;
    if (loadPercent < 100 || !scenePrimed) return;
    setPhase("loadingExit");
  }, [phase, loadPercent, scenePrimed]);

  useEffect(() => {
    if (phase !== "loadingExit") return;
    let revealFrame;
    const revealTimer = setTimeout(() => {
      revealFrame = requestAnimationFrame(() => setTextRevealing(true));
    }, 120);
    const sceneTimer = setTimeout(() => {
      setPhase("scene");
      window.scrollTo(0, 0);
    }, 1500);
    return () => {
      clearTimeout(revealTimer);
      clearTimeout(sceneTimer);
      if (revealFrame) cancelAnimationFrame(revealFrame);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "scene") {
      setScrollHintVisible(false);
      setNavVisible(false);
      setUiIntroReady(false);
      return;
    }
    document.body.style.overflow = "";
    if (!skipIntro) {
      window.scrollTo(0, 0);
    }
    const navTimer = setTimeout(() => setNavVisible(true), skipIntro ? 0 : 500);
    const uiTimer = setTimeout(
      () => setUiIntroReady(true),
      skipIntro ? 0 : 850,
    );
    const hintTimer = setTimeout(
      () => setScrollHintVisible(!skipIntro),
      skipIntro ? 0 : 950,
    );
    return () => {
      clearTimeout(navTimer);
      clearTimeout(uiTimer);
      clearTimeout(hintTimer);
    };
  }, [phase, skipIntro]);

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

      let progress = textProgress;
      const track = textTrackRef.current;
      if (track) {
        const rect = track.getBoundingClientRect();
        const stickyRange = track.clientHeight - vh;
        if (stickyRange > 0) {
          progress = Math.min(1, Math.max(0, -rect.top / stickyRange));
          setTextProgress(progress);
        }
      }

      setHybridHeroOpacity(skipIntro ? 0 : getHybridHeroOpacity(yVh));

      setProductVisible(y >= PRODUCT_REVEAL_VH * vh);
      setBagSceneVisible(yVh >= FADE_OUT_START);
      if (uiIntroReady) {
        setScrollHintVisible(yVh < BAG_START_VH + 0.5);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [phase, uiIntroReady, skipIntro]);

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
          onPointerDown={unlock}
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
          className={`top-nav${navVisible ? " top-nav--visible" : ""}${bagSceneVisible ? " top-nav--bag-scene" : ""}${menuOpen ? " top-nav--menu-open" : ""}`}
        >
          <Link
            to={homeBagLink.pathname}
            state={homeBagLink.state}
            className="brand-mark"
            aria-label="Hybrid home"
          >
            Hybrid
          </Link>
          <div className="nav-actions">
            <SoundButton />

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

      <Scene3D
        phase={phase}
        snapToProduct={skipIntro}
        heroTitleOpacity={hybridHeroOpacity}
        onBagReady={() => setScenePrimed(true)}
      />

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
        className={`text-track${phase !== "loading" ? " text-track--primed" : ""}${textRevealing ? " text-track--revealing" : ""}`}
        style={{ height: `${TEXT_TRACK_VH * 100}vh` }}
        aria-hidden={phase === "loading"}
      >
        <div className="text-sticky">
          {INTRO_SLIDES.map((slide, i) => (
            <div
              key={slide.title}
              className="text-slide"
              style={{
                opacity:
                  phase === "loading"
                    ? 0
                    : getSlideOpacity(i, INTRO_SLIDES.length, textProgress),
              }}
            >
              <h2>{slide.title}</h2>
              <p>{slide.body}</p>
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
        <MenuOverlay ref={menuOverlayRef} onClose={() => setMenuOpen(false)} />
      )}
    </div>
  );
}
