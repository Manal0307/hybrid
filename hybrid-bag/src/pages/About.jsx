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
    a: "It combines 3D-printed structure, cabbage bioplastic lining, recycled fabric trims and forms inspired by marine life, all in one circular design.",
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

function revealCls(id, revealed, ...extra) {
  return [
    "about-reveal",
    revealed.has(id) && "is-visible",
    ...extra.filter(Boolean),
  ]
    .filter(Boolean)
    .join(" ");
}

function AboutCarousel({ slides, revealed }) {
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
    <section
      data-reveal="gallery"
      className={revealCls("gallery", revealed, "about-gallery")}
      aria-label="Project gallery"
    >
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

function AboutFaqAccordion({ items, revealed }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="about-faq__list">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        const panelId = `about-faq-panel-${i}`;
        const btnId = `about-faq-btn-${i}`;

        return (
          <div
            key={item.q}
            data-reveal={`faq-${i}`}
            className={revealCls(`faq-${i}`, revealed, "about-faq__item", isOpen && "is-open")}
          >
            <button
              type="button"
              id={btnId}
              className="about-faq__trigger"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenIndex(isOpen ? null : i)}
            >
              <span className="about-faq__question">{item.q}</span>
              <span className="about-faq__icon" aria-hidden="true">
                <svg viewBox="0 0 16 16" width="14" height="14">
                  <path
                    d="M8 3v10M3 8h10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </button>
            <div
              id={panelId}
              className="about-faq__panel"
              role="region"
              aria-labelledby={btnId}
            >
              <div className="about-faq__panel-inner">
                <p>{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function useScrollReveal(containerRef) {
  const [revealed, setRevealed] = useState(() => new Set());

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const items = root.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    const revealAll = () => {
      const keys = new Set();
      items.forEach((el) => {
        if (el.dataset.reveal) keys.add(el.dataset.reveal);
      });
      setRevealed(keys);
    };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      revealAll();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const key = entry.target.dataset.reveal;
          if (key) {
            setRevealed((prev) => {
              if (prev.has(key)) return prev;
              const next = new Set(prev);
              next.add(key);
              return next;
            });
          }
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
    );

    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return revealed;
}

export default function About() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const menuOverlayRef = useRef(null);
  const mainRef = useRef(null);

  const revealed = useScrollReveal(mainRef);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="about-page">
      <header
        className={`top-nav top-nav--visible${menuOpen ? " top-nav--menu-open" : ""}`}
      >
        <Link to={homeBagLink.pathname} state={homeBagLink.state} className="brand-mark" aria-label="Hybrid home">
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

      <main className="about-main" ref={mainRef}>
        <header className="about-intro">
          <p
            data-reveal="intro-eyebrow"
            className={revealCls("intro-eyebrow", revealed, "about-intro__eyebrow")}
          >
            Hybrid
          </p>
          <h1
            data-reveal="intro-title"
            className={revealCls("intro-title", revealed, "about-intro__title", "about-reveal--d1")}
          >
            About the project
          </h1>
          <p
            data-reveal="intro-lead"
            className={revealCls("intro-lead", revealed, "about-intro__lead", "about-reveal--d2")}
          >
            Hybrid is a fashion accessory engineered differently, where reclaimed
            matter, biomaterials and 3D printing meet in a single everyday object.
          </p>
        </header>

        <section
          data-reveal="about-me"
          className={revealCls("about-me", revealed, "about-block", "about-me")}
          aria-labelledby="about-me-head"
        >
          <h2 id="about-me-head" className="about-block__title">
            About me
          </h2>
          <p
            data-reveal="about-me-p1"
            className={revealCls("about-me-p1", revealed, "about-block__text", "about-reveal--d1")}
          >
            I&apos;m <strong>Manal Boulahya</strong>, a student in{" "}
            <strong>Multimedia &amp; Creative Technology</strong> at Erasmus
            Hogeschool Brussel. I&apos;m passionate about aesthetics in every
            form, and I love mixing different techniques: 3D, craft, code,
            material research, visual storytelling.
          </p>
          <p
            data-reveal="about-me-p2"
            className={revealCls("about-me-p2", revealed, "about-block__text", "about-reveal--d2")}
          >
            Hybrid is where that curiosity comes together: a real object, built
            by hand and machine, and this site to tell its story.
          </p>
        </section>

        <AboutCarousel slides={GALLERY} revealed={revealed} />

        <section
          data-reveal="mission"
          className={revealCls("mission", revealed, "about-block")}
          aria-labelledby="about-mission"
        >
          <h2 id="about-mission" className="about-block__title">
            Our mission
          </h2>
          <p
            data-reveal="mission-p1"
            className={revealCls("mission-p1", revealed, "about-block__text", "about-reveal--d1")}
          >
            We believe waste is not an endpoint. Oyster shells, cabbage bioplastics,
            recycled fabrics. Each material tells a story of second chances. Hybrid
            proves that a contemporary bag can be beautiful, functional and circular
            by design.
          </p>
          <p
            data-reveal="mission-p2"
            className={revealCls("mission-p2", revealed, "about-block__text", "about-reveal--d2")}
          >
            Born in Brussels, the project sits at the crossroads of fashion, material
            research and digital fabrication, a small lab experiment turned into
            something you can carry every day.
          </p>
        </section>

        <section
          data-reveal="faq"
          className={revealCls("faq", revealed, "about-faq")}
          aria-labelledby="about-faq-head"
        >
          <h2 id="about-faq-head" className="about-block__title">
            Questions
          </h2>
          <AboutFaqAccordion items={FAQ} revealed={revealed} />
        </section>

        <section
          data-reveal="contact"
          className={revealCls("contact", revealed, "about-contact")}
          aria-labelledby="about-contact-head"
        >
          <h2 id="about-contact-head" className="about-block__title">
            Contact
          </h2>
          <p
            data-reveal="contact-text"
            className={revealCls("contact-text", revealed, "about-block__text", "about-reveal--d1")}
          >
            For collaborations, press or questions about the project, reach out at
          </p>
          <a
            data-reveal="contact-email"
            href="mailto:manal.boulahya@student.ehb.be"
            className={revealCls("contact-email", revealed, "about-contact__link", "about-reveal--d2")}
          >
            manal.boulahya@student.ehb.be
          </a>

          <ul
            data-reveal="contact-social"
            className={revealCls("contact-social", revealed, "about-contact__social", "about-reveal--d3")}
            aria-label="Social media"
          >
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

        <footer
          data-reveal="footer"
          className={revealCls("footer", revealed, "about-footer")}
        >
          <p className="about-footer__legal">© 2026 Hybrid</p>
        </footer>
      </main>

      {menuOpen && (
        <MenuOverlay ref={menuOverlayRef} onClose={() => setMenuOpen(false)} />
      )}
    </div>
  );
}
