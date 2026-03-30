import { useState, useEffect, useRef } from "react";
import Scene3D from "./components/Scene3D";

/* Scroll thresholds (multiples of window.innerHeight) */
const FADE_IN_START = 1.5;
const FADE_IN_END = 2.5;
const FADE_OUT_START = 6.5;
const FADE_OUT_END = 7.5;
const PRODUCT_VH = 9.0;

/* DOM spacer heights */
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

function App() {
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const [textProgress, setTextProgress] = useState(0);
  const [productVisible, setProductVisible] = useState(false);
  const textTrackRef = useRef(null);

  useEffect(() => {
    function onScroll() {
      const vh = window.innerHeight;
      const y = window.scrollY;

      /* Fade overlay : scene → noir → scene */
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

      /* Text track : progression sticky 0→1 */
      const track = textTrackRef.current;
      if (track) {
        const rect = track.getBoundingClientRect();
        const stickyRange = track.clientHeight - vh;
        if (stickyRange > 0) {
          setTextProgress(Math.min(1, Math.max(0, -rect.top / stickyRange)));
        }
      }

      /* Product */
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

      {/* Spacer 1 : sac descend + fade vers noir */}
      <div
        className="scroll-spacer"
        style={{ height: `${SPACER1_VH * 100}vh` }}
        aria-hidden
      />

      {/* Text track : section sticky avec 3 textes qui se succèdent */}
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

      {/* Spacer 2 : fade du noir vers ciel/eau + sac remonte */}
      <div
        className="scroll-spacer"
        style={{ height: `${SPACER2_VH * 100}vh` }}
        aria-hidden
      />

      {/* Section produit */}
      <section className="product-section" />

      {/* CTA fixe */}
      <a
        href="/materials"
        className={`cta-button ${productVisible ? "visible" : ""}`}
      >
        Discover Materials
      </a>
    </div>
  );
}

export default App;
