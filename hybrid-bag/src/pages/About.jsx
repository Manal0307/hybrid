import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import MenuOverlay from "../components/MenuOverlay";
import { homeBagLink } from "../utils/homeNav";
import "./About.css";

const FAQ = [
  {
    q: "Is the Hybrid bag available to buy?",
    a: "Hybrid is a concept piece, a proof that tech and ecology can share the same object. It is not commercially available yet.",
  },
  {
    q: "What makes it different from a regular bag?",
    a: "It combines 3D-printed structure, floral bioplastic lining, recycled fabric trims and forms inspired by marine life, all in one circular design.",
  },
  {
    q: "Can I get in touch about the project?",
    a: "Yes, reach out via email for collaborations, press or questions about the materials and process.",
  },
];

const SOCIAL_LINKS = [
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/manalboulahya",
  },
  {
    id: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/manalboulahya",
  },
  {
    id: "tiktok",
    label: "TikTok",
    href: "https://www.tiktok.com/@manalboulahya",
  },
];

function SocialIcon({ id }) {
  if (id === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          d="M6.5 8.5h3v8h-3v-8Zm1.5-4.5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5ZM10.5 8.5h2.9v1.1h.04c.4-.75 1.38-1.55 2.84-1.55 3.04 0 3.6 2 3.6 4.6v3.85h-3v-3.42c0-.82-.02-1.88-1.15-1.88-1.18 0-1.36.92-1.36 1.87v3.43h-3v-8Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (id === "instagram") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <rect
          x="4.5"
          y="4.5"
          width="15"
          height="15"
          rx="4"
          ry="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M16.5 5.5c-.6 1.2-1.7 2.1-3 2.4v7.4a4.6 4.6 0 1 1-4-4.5v2.2a2.4 2.4 0 1 0 1.7 2.3V5.5h2.8l.5 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

const GALLERY = [
  { src: "/about/01.jpg", caption: "Hybrid bag, front view" },
  { src: "/about/02.jpg", caption: "Material & texture detail" },
  { src: "/about/03.jpg", caption: "3D printing & structure" },
  { src: "/about/04.jpg", caption: "Studio & process" },
];

function AboutCarousel({ slides }) {
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState(() => new Set());

  const go = useCallback(
    (dir) => {
      setIndex((i) => (i + dir + slides.length) % slides.length);
    },
    [slides.length],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const markBroken = (src) => {
    setBroken((prev) => new Set(prev).add(src));
  };

  const slide = slides[index];

  return (
    <section className="about-gallery" aria-label="Project gallery">
      <header className="about-gallery__head">
        <p className="about-gallery__eyebrow">Gallery</p>
        <h2 className="about-block__title">The bag in pictures</h2>
      </header>

      <div className="about-gallery__frame">
        <button
          type="button"
          className="about-gallery__nav about-gallery__nav--prev"
          aria-label="Previous photo"
          onClick={() => go(-1)}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path
              d="M10 3L5 8l5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div
          className="about-gallery__viewport"
          aria-live="polite"
          aria-atomic="true"
        >
          <div
            className="about-gallery__track"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {slides.map((item) => (
              <figure key={item.src} className="about-gallery__slide">
                {broken.has(item.src) ? (
                  <div className="about-gallery__placeholder" aria-hidden="true" />
                ) : (
                  <img
                    src={item.src}
                    alt={item.caption}
                    loading="lazy"
                    onError={() => markBroken(item.src)}
                  />
                )}
              </figure>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="about-gallery__nav about-gallery__nav--next"
          aria-label="Next photo"
          onClick={() => go(1)}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path
              d="M6 3l5 5-5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <p className="about-gallery__caption">{slide.caption}</p>

      <div className="about-gallery__dots" role="tablist" aria-label="Gallery slides">
        {slides.map((item, i) => (
          <button
            key={item.src}
            type="button"
            role="tab"
            className={`about-gallery__dot${i === index ? " is-active" : ""}`}
            aria-selected={i === index}
            aria-label={`Slide ${i + 1}: ${item.caption}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  );
}

export default function About() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const menuOverlayRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="about-page">
      <header
        className={`top-nav top-nav--visible${menuOpen ? " top-nav--menu-open" : ""}`}
      >
        <Link to={homeBagLink.pathname} className="brand-mark" aria-label="Hybrid home">
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
            aria-label={menuOpen ? "Close menu" : "Open menu"}
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

      <main className="about-main">
        <header className="about-intro">
          <p className="about-intro__eyebrow">Hybrid</p>
          <h1 className="about-intro__title">About the project</h1>
          <p className="about-intro__lead">
            Hybrid is a fashion accessory engineered differently, where reclaimed
            matter, biomaterials and 3D printing meet in a single everyday object.
          </p>
        </header>

        <section className="about-block about-me" aria-labelledby="about-me-head">
          <h2 id="about-me-head" className="about-block__title">
            About me
          </h2>
          <p className="about-block__text">
            I&apos;m <strong>Manal Boulahya</strong>, a student in{" "}
            <strong>Multimedia &amp; Creative Technology</strong> at Erasmus
            Hogeschool Brussel. I&apos;m passionate about aesthetics in every
            form, and I love mixing different techniques: 3D, craft, code,
            material research, visual storytelling.
          </p>
          <p className="about-block__text">
            Hybrid is where that curiosity comes together: a real object, built
            by hand and machine, and this site to tell its story.
          </p>
        </section>

        <AboutCarousel slides={GALLERY} />

        <section className="about-block" aria-labelledby="about-mission">
          <h2 id="about-mission" className="about-block__title">
            Our mission
          </h2>
          <p className="about-block__text">
            We believe waste is not an endpoint. Oyster shells, floral bioplastics,
            recycled fabrics. Each material tells a story of second chances. Hybrid
            proves that a contemporary bag can be beautiful, functional and circular
            by design.
          </p>
          <p className="about-block__text">
            Born in Brussels, the project sits at the crossroads of fashion, material
            research and digital fabrication, a small lab experiment turned into
            something you can carry every day.
          </p>
        </section>

        <section className="about-faq" aria-labelledby="about-faq-head">
          <h2 id="about-faq-head" className="about-block__title">
            Questions
          </h2>
          <dl className="about-faq__list">
            {FAQ.map((item) => (
              <div key={item.q} className="about-faq__item">
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="about-contact" aria-labelledby="about-contact-head">
          <h2 id="about-contact-head" className="about-block__title">
            Contact
          </h2>
          <p className="about-block__text">
            For collaborations, press or questions about the project, reach out at
          </p>
          <a href="mailto:hello@hybrid-bag.be" className="about-contact__link">
            hello@hybrid-bag.be
          </a>

          <ul className="about-contact__social" aria-label="Social media">
            {SOCIAL_LINKS.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href}
                  className="about-contact__social-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.label}
                >
                  <SocialIcon id={item.id} />
                </a>
              </li>
            ))}
          </ul>

        </section>

        <footer className="about-footer">
          <p className="about-footer__legal">© 2026 Hybrid</p>
        </footer>
      </main>

      {menuOpen && (
        <MenuOverlay ref={menuOverlayRef} onClose={() => setMenuOpen(false)} />
      )}
    </div>
  );
}
