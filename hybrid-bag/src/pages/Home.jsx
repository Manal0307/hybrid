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
