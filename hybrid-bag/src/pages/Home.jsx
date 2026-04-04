import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Scene3D from "../components/Scene3D";

const FADE_IN_START = 1.5;
const FADE_IN_END = 2.5;
const FADE_OUT_START = 6.5;
const FADE_OUT_END = 7.5;
const PRODUCT_VH = 9.0;

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

export default function Home() {
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const [textProgress, setTextProgress] = useState(0);
  const [productVisible, setProductVisible] = useState(false);
  const textTrackRef = useRef(null);

  useEffect(() => {
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
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="app">
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
