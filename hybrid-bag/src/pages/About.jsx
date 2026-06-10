import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import MenuOverlay from "../components/MenuOverlay";
import SoundButton from "../components/SoundButton";
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

const HYBRID_TIKTOK = "https://www.tiktok.com/@hybridspace";
const HYBRID_INSTAGRAM = "https://www.instagram.com/mnl.blh";

const SOCIAL_LINKS = [
  {
    id: "instagram",
    label: "Instagram",
    href: HYBRID_INSTAGRAM,
  },
  {
    id: "tiktok",
    label: "TikTok",
    href: HYBRID_TIKTOK,
  },
];

/** Clips behind-the-scenes — vidéos Cloudinary, clic → TikTok */
const BEHIND_THE_SCENES_CLIPS = [
  {
    caption: "Bioplastic demolding",
    videoUrl:
      "https://res.cloudinary.com/deq5iutqv/video/upload/v1780955255/e4bb52f117194f798b08342a9a584aec_vg0uqg.mov",
    tiktokUrl:
      "https://www.tiktok.com/@hybridspace/video/7634110651274743073",
  },
  {
    caption: "Hybrid lab",
    videoUrl:
      "https://res.cloudinary.com/deq5iutqv/video/upload/v1780955283/63b56c1b7a2c4688bacad1a8803f83f3_al1pmj.mov",
    tiktokUrl:
      "https://www.tiktok.com/@hybridspace/photo/7633799617225690400",
  },
];

function SocialIcon({ id }) {
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
        <circle
          cx="12"
          cy="12"
          r="3.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
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

function revealCls(id, revealed, ...extra) {
  return [
    "about-reveal",
    revealed.has(id) && "is-visible",
    ...extra.filter(Boolean),
  ]
    .filter(Boolean)
    .join(" ");
}

function AboutClipsCarousel({ clips, revealed }) {
  const slides = clips.filter((c) => c.videoUrl);
  const [index, setIndex] = useState(0);
  const videoRefs = useRef([]);

  const go = useCallback(
    (dir) => {
      if (!slides.length) return;
      setIndex((i) => (i + dir + slides.length) % slides.length);
    },
    [slides.length],
  );

  const selectSlide = useCallback((i) => {
    setIndex(i);
  }, []);

  useEffect(() => {
    if (!slides.length) return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, slides.length]);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;

    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === index) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [index, slides.length]);

  const slide = slides[index];
  const hasVideos = slides.length > 0;

  return (
    <section
      data-reveal="gallery"
      className={revealCls("gallery", revealed, "about-gallery")}
      aria-label="TikTok videos"
    >
      <header className="about-gallery__head">
        <p className="about-gallery__eyebrow">Making-of</p>
        <h2 className="about-block__title">Behind the scenes</h2>
        <p className="about-gallery__lead">
          Short clips from the lab: biomaterials, 3D printing and tests along
          the way.
        </p>
      </header>

      <div
        className={`about-gallery__frame${hasVideos ? " about-gallery__frame--video" : ""}`}
      >
        {hasVideos && (
          <button
            type="button"
            className="about-gallery__nav about-gallery__nav--prev"
            aria-label="Previous video"
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
        )}

        <div
          className="about-gallery__viewport"
          aria-live="polite"
          aria-atomic="true"
        >
          {hasVideos ? (
            <div
              className="about-gallery__track"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {slides.map((item, i) => (
                <figure
                  key={item.tiktokUrl + item.caption}
                  className="about-gallery__slide about-gallery__slide--video"
                >
                  <a
                    href={item.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="about-gallery__clip-link"
                    aria-label={`${item.caption} — view on TikTok`}
                  >
                    <video
                      ref={(el) => {
                        videoRefs.current[i] = el;
                      }}
                      className="about-gallery__clip-video"
                      src={item.videoUrl}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                    />
                    <span className="about-gallery__clip-badge">
                      View on TikTok
                    </span>
                  </a>
                </figure>
              ))}
            </div>
          ) : (
            <div className="about-gallery__empty">
              <p className="about-gallery__empty-text">
                Clips from the lab will appear here soon.
              </p>
              <div className="about-gallery__profile-links">
                <a
                  href={HYBRID_TIKTOK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-gallery__profile-btn"
                >
                  @hybridspace on TikTok
                </a>
                <a
                  href={HYBRID_INSTAGRAM}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-gallery__profile-btn about-gallery__profile-btn--ig"
                >
                  @mnl.blh on Instagram
                </a>
              </div>
            </div>
          )}
        </div>

        {hasVideos && (
          <button
            type="button"
            className="about-gallery__nav about-gallery__nav--next"
            aria-label="Next video"
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
        )}
      </div>

      {hasVideos && (
        <>
          <p className="about-gallery__caption">
            {slide.caption || `Video ${index + 1} of ${slides.length}`}
          </p>
          <div
            className="about-gallery__dots"
            role="tablist"
            aria-label="TikTok slides"
          >
            {slides.map((item, i) => (
              <button
                key={item.url}
                type="button"
                role="tab"
                className={`about-gallery__dot${i === index ? " is-active" : ""}`}
                aria-selected={i === index}
                aria-label={`Video ${i + 1}`}
                onClick={() => selectSlide(i)}
              />
            ))}
          </div>
        </>
      )}
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
            className={revealCls(
              `faq-${i}`,
              revealed,
              "about-faq__item",
              isOpen && "is-open",
            )}
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

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
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
            className={revealCls(
              "intro-eyebrow",
              revealed,
              "about-intro__eyebrow",
            )}
          >
            Hybrid
          </p>
          <h1
            data-reveal="intro-title"
            className={revealCls(
              "intro-title",
              revealed,
              "about-intro__title",
              "about-reveal--d1",
            )}
          >
            About the project
          </h1>
          <p
            data-reveal="intro-lead"
            className={revealCls(
              "intro-lead",
              revealed,
              "about-intro__lead",
              "about-reveal--d2",
            )}
          >
            Hybrid is a fashion accessory engineered differently, where
            reclaimed matter, biomaterials and 3D printing meet in a single
            everyday object.
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
            className={revealCls(
              "about-me-p1",
              revealed,
              "about-block__text",
              "about-reveal--d1",
            )}
          >
            I&apos;m <strong>Manal Boulahya</strong>, a student in{" "}
            <strong>Multimedia &amp; Creative Technology</strong> at Erasmus
            Hogeschool Brussel. I&apos;m passionate about aesthetics in every
            form, and I love mixing different techniques: 3D, craft, code,
            material research, visual storytelling.
          </p>
          <p
            data-reveal="about-me-p2"
            className={revealCls(
              "about-me-p2",
              revealed,
              "about-block__text",
              "about-reveal--d2",
            )}
          >
            Hybrid is where that curiosity comes together: a real object, built
            by hand and machine, and this site to tell its story.
          </p>
        </section>

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
            className={revealCls(
              "mission-p1",
              revealed,
              "about-block__text",
              "about-reveal--d1",
            )}
          >
            We believe waste is not an endpoint. Oyster shells, cabbage
            bioplastics, recycled fabrics. Each material tells a story of second
            chances. Hybrid proves that a contemporary bag can be beautiful,
            functional and circular by design.
          </p>
          <p
            data-reveal="mission-p2"
            className={revealCls(
              "mission-p2",
              revealed,
              "about-block__text",
              "about-reveal--d2",
            )}
          >
            The project sits at the crossroads of fashion, material research and
            digital fabrication, a small lab experiment turned into something
            you can carry every day.
          </p>
        </section>

        <AboutClipsCarousel clips={BEHIND_THE_SCENES_CLIPS} revealed={revealed} />

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
            className={revealCls(
              "contact-text",
              revealed,
              "about-block__text",
              "about-reveal--d1",
            )}
          >
            For collaborations, press or questions about the project:
          </p>
          <a
            data-reveal="contact-email"
            href="mailto:manal.boulahya@student.ehb.be"
            className={revealCls(
              "contact-email",
              revealed,
              "about-contact__link",
              "about-reveal--d2",
            )}
          >
            manal.boulahya@student.ehb.be
          </a>

          <p
            data-reveal="contact-social-lead"
            className={revealCls(
              "contact-social-lead",
              revealed,
              "about-contact__social-lead",
              "about-reveal--d2",
            )}
          >
            More on social
          </p>
          <ul
            data-reveal="contact-social"
            className={revealCls(
              "contact-social",
              revealed,
              "about-contact__social",
              "about-reveal--d3",
            )}
            aria-label="Social media: TikTok and Instagram"
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
