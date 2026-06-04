import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import MenuOverlay from "../components/MenuOverlay";
import SoundButton from "../components/SoundButton";
import { homeBagLink } from "../utils/homeNav";
import "./Process.css";

const BIOMATERIAL_VIDEO_URL =
  "https://res.cloudinary.com/deq5iutqv/video/upload/v1780610582/v26044gc0000d8aov4vog65pf2tg7rmg_chk0gq.mov";

/* ──────────────────────────────────────────────────────────────────────────
   Recycled filaments. alternatives utilisées pour l'impression 3D
   ────────────────────────────────────────────────────────────────────────── */
const FILAMENTS = [
  {
    id: "rpet-recycled",
    name: "rPET Recycled",
    short: "Post-consumer polyester",
    family: "Recycled Polyester",
    accent: "#7a98b0",
    composition: "100% recycled PET (bottles & packaging)",
    aspect: "Cool grey-blue, clean, slightly glossy",
    usage: "Functional parts, durable prototypes, everyday objects",
    description:
      "rPET filament is made from recycled polyethylene terephthalate, typically from plastic bottles and packaging waste. It turns a common waste stream into a strong, printable material with a cooler, more technical finish than standard PLA.\n\nIt offers good layer adhesion and mechanical resistance, making it suitable for functional parts and objects that need a bit more durability.",
    keyQualities: [
      "Made from recycled PET waste",
      "Strong and durable",
      "Good layer adhesion",
      "Cool technical finish",
      "Suitable for functional design",
    ],
  },
  {
    id: "fishing-net",
    name: "Fishing Net Filament",
    short: "Recycled ocean nylon",
    family: "Recycled Nylon / Ocean Waste",
    accent: "#4a7898",
    composition: "Recycled nylon from fishing nets",
    aspect: "Matte, technical, slightly irregular tones",
    usage: "Functional parts, sustainable design, durable objects",
    description:
      "This filament is made from discarded fishing nets collected through the Circular Ocean project. By transforming recovered fishing nets into a high-quality 3D printing material, it shows how ocean waste can become part of a circular design process.\n\nThe material is based on recycled nylon and offers strong mechanical and thermal properties. It is resistant to heat, UV exposure and structural wear, making it suitable for both functional parts and sustainable design applications. Its matte surface and subtle color variations reveal its recycled origin, giving the final object a raw and responsible aesthetic.",
    keyQualities: [
      "Made from recovered fishing nets",
      "Recycled nylon",
      "High heat resistance",
      "UV-resistant",
      "Strong and durable",
      "Reduced carbon footprint compared to virgin nylon",
    ],
  },
  {
    id: "smartfil-algae",
    name: "PLA Smartfil Algae",
    short: "Spirulina biocomposite",
    family: "Algae-based / Biocomposite",
    accent: "#5a8868",
    composition: "85% PLA + 15% spirulina algae",
    aspect: "Natural green tone, organic finish",
    usage: "Eco-conscious prototypes, design objects, educational projects",
    description:
      "PLA Smartfil Algae is an ecological 3D printing filament made from PLA mixed with spirulina algae. By combining a familiar printing material with algae, it creates a more sustainable alternative for users who want to reduce the environmental impact of their prints.\n\nThe algae content gives the filament a natural identity and connects the material to renewable resources. It is especially interesting for projects that explore bio-based materials, experimental design and ecological storytelling.",
    keyQualities: [
      "Contains spirulina algae",
      "85% PLA and 15% algae",
      "Bio-based visual identity",
      "Eco-oriented material",
      "Suitable for design and concept prototypes",
    ],
  },
  {
    id: "wound-up-coffee",
    name: "Wound Up, PLA Coffee",
    short: "Coffee waste composite",
    family: "Organic / Biocomposite",
    accent: "#6b4a32",
    composition: "PLA + coffee waste",
    aspect: "Dark brown, granular, slightly translucent",
    usage: "Organic design, decorative pieces, material experimentation",
    description:
      "Wound Up is a PLA-based biocomposite filament made with waste coffee by-products. Its dark brown color does not come from synthetic dyes, but from the natural coffee content inside the material. This gives the filament a warm, organic and textured appearance.\n\nThe material keeps the easy printing properties of PLA while adding a more tactile and natural finish. Its grainy surface and subtle translucency make it especially interesting for objects where texture, imperfection and material origin are part of the visual story.",
    keyQualities: [
      "Made with coffee waste",
      "Natural dark brown color",
      "Granular texture",
      "PLA-based and easy to print",
      "No heated bed required",
      "Organic visual finish",
    ],
  },
  {
    id: "aquatek-pva",
    name: "AquaTek PVA",
    short: "Water-soluble support",
    family: "Water-soluble Support Material",
    accent: "#b8c8d8",
    composition: "Biodegradable PVA",
    aspect: "Clean, translucent or pale support material",
    usage: "Soluble supports, complex prints, clean finishing",
    description:
      "AquaTek PVA is a water-soluble support filament designed for complex 3D prints. It allows support structures to be removed by dissolving them in warm water, reducing the risk of damaging the final printed object.\n\nThis material is especially useful when printing detailed shapes, overhangs or internal geometries that would be difficult to clean manually. It is compatible with common materials such as PLA, ABS and PETG, making it a practical support solution for both prototyping and small-scale production.\n\nIts biodegradable composition makes it a more responsible option for workshops looking for technical performance with a lower environmental impact.",
    keyQualities: [
      "Water-soluble support material",
      "Dissolves in warm water",
      "Compatible with PLA, ABS and PETG",
      "Useful for complex prints",
      "Biodegradable",
      "Clean support removal",
    ],
  },
  {
    id: "wood-addnorth",
    name: "PLA Wood Addnorth",
    short: "Wood fiber composite",
    family: "Recycled Plant / Wood Composite",
    accent: "#b8956a",
    composition: "60% PLA + 40% natural wood fibers",
    aspect: "Wood-like, warm, natural surface",
    usage: "Decoration, architecture models, design objects",
    description:
      "PLA Wood Addnorth is a composite filament made from PLA and natural wood fibers. With 40% wood content, it creates printed objects with a surface finish that closely resembles natural wood.\n\nBecause it is PLA-based, it remains easy to print and compatible with most FDM 3D printers. It does not require a heated bed and can be printed using standard PLA settings. The high percentage of wood fibers gives the final object a warm, tactile and organic look, making it ideal for decorative pieces, architectural models and design prototypes.",
    keyQualities: [
      "Contains natural wood fibers",
      "60% PLA and 40% wood",
      "Wood-like surface finish",
      "Easy to print",
      "No heated bed required",
      "Suitable for decorative design",
    ],
  },
  {
    id: "pla-huitre",
    name: "PLA Huître",
    short: "Oyster shell biocomposite",
    family: "Mineral / Biocomposite",
    accent: "#c4b8a0",
    composition: "PLA + oyster shell by-products",
    aspect: "Whitish tone, mineral particles, subtle shine",
    usage: "Artistic pieces, decorative objects, experimental accessories",
    description:
      "PLA Huître is a biocomposite filament made from PLA combined with oyster shell by-products. Instead of treating shell waste as useless material, it gives it a second life through 3D printing.\n\nOnce printed, it has a whitish mineral tone with small particles that create a slightly luminous and marbled effect. These particles help hide layer lines and small printing imperfections, which makes the material especially suitable for artistic and decorative objects.",
    keyQualities: [
      "Made with oyster shell waste",
      "Mineral and pearly finish",
      "Hides layer lines well",
      "Easy to print (PLA-based)",
      "Ideal for art, design and decoration",
      "Recommended nozzle: 0.5 mm or larger",
    ],
  },
  {
    id: "pla-ardoise",
    name: "PLA Ardoise, Coproduit",
    short: "Revalorized slate waste",
    family: "Mineral / Revalorized Stone Waste",
    accent: "#6a6868",
    composition: "Bio-based PLA + slate particles",
    aspect: "Natural slate grey, mineral grain",
    usage: "Design objects, architectural models, decorative pieces",
    description:
      "PLA Ardoise is a mineral composite filament made from bio-based PLA and locally revalorized slate waste. The material contains fine slate particles, creating an authentic stone-like texture and a natural grey finish.\n\nIts surface has a mineral grain that gives printed pieces a unique and raw appearance. The fine particle size allows for a cleaner finish, while the natural color variations make every print slightly different. For longer prints, a steel nozzle is recommended because mineral particles can be abrasive over time.\n\nThis filament is interesting for projects that explore local waste, mineral textures and durable material alternatives.",
    keyQualities: [
      "Made from revalorized slate waste",
      "Bio-based PLA",
      "Natural slate grey finish",
      "Fine mineral particles",
      "Unique color variations",
      "Steel nozzle recommended for long prints",
    ],
  },
];

/* ──────────────────────────────────────────────────────────────────────────
   Biomaterials. recettes maison
   ────────────────────────────────────────────────────────────────────────── */
/* Studio tests — max 8, recipes actually tried in the lab */
const BIOMATERIALS = [
  {
    id: "banana-leather",
    name: "Banana leather",
    short: "From peel waste",
    family: "Fruit-based",
    accent: "#d4b85a",
    description:
      "A leather-like sheet made from ripe banana peels. Flexible, warm yellow-brown, and one of the first materials tested in the Hybrid lab.",
    ingredients: [
      "5 banana peels (very ripe)",
      "10 g glycerin",
      "Beeswax (optional finish)",
    ],
    steps: [
      "Boil the peels for 15 min, then scrape the inner flesh.",
      "Blend the flesh with glycerin into a smooth paste.",
      "Spread onto a silicone mat, 3–4 mm thick.",
      "Dry in the sun or oven at 50 °C until firm (12–24 h).",
      "Optional: rub with beeswax for water resistance.",
    ],
  },
  {
    id: "red-cabbage-bio",
    name: "Red cabbage",
    short: "Deep violet film",
    family: "Vegetable-based",
    accent: "#7a3a8a",
    description:
      "Red cabbage leaves turned into a deep violet, slightly translucent film. pH-sensitive colour that shifts in contact with acids and bases.",
    ingredients: [
      "300 g red cabbage leaves",
      "200 ml water",
      "10 g glycerin",
      "5 g agar-agar",
    ],
    steps: [
      "Simmer chopped leaves in water for 20 minutes.",
      "Strain to keep only the violet liquid.",
      "Add agar and glycerin, heat gently until thickened.",
      "Spread thin on a silicone mat.",
      "Dry at room temperature for 48 hours.",
    ],
  },
  {
    id: "orange-peel",
    name: "Orange",
    short: "Citrus-amber film",
    family: "Citrus-based",
    accent: "#f4b48a",
    description:
      "Orange peels cooked into an amber, slightly fragrant translucent film, a separate studio test from the cucumber recipe.",
    ingredients: [
      "150 g orange peels",
      "200 ml water",
      "1 tbsp lemon juice",
      "5 g glycerin",
    ],
    steps: [
      "Simmer peels with water and lemon for 30 min.",
      "Blend smooth, then strain through a sieve.",
      "Reduce the liquid gently for 5 min.",
      "Add glycerin, stir, and pour thin.",
      "Dry for 48 hours.",
    ],
  },
  {
    id: "cucumber-film",
    name: "Cucumber",
    short: "Pale green vegetable sheet",
    family: "Vegetable-based",
    accent: "#a8d8b0",
    description:
      "Cucumber pulp set with agar into a light green, slightly grainy sheet. Tested on its own, apart from the orange peel experiments.",
    ingredients: [
      "200 g cucumber (peeled)",
      "80 ml water",
      "4 g agar-agar",
      "5 g glycerin",
    ],
    steps: [
      "Blend cucumber with water until smooth, then sieve.",
      "Heat the pulp with agar until dissolved (~85 °C).",
      "Stir in glycerin.",
      "Pour thin onto a silicone mat.",
      "Dry for 24–48 hours at room temperature.",
    ],
  },
  {
    id: "plain-gelatin",
    name: "Plain gelatin",
    short: "Nothing added",
    family: "Gelatin-based",
    accent: "#f0e8e0",
    description:
      "The baseline test: food gelatin and water only, no glycerin, petals or dye. A stiff, glass-clear film that shows the raw behaviour of the binder.",
    ingredients: ["12 g food gelatin", "100 ml water"],
    steps: [
      "Heat water to 70 °C in a saucepan (do not boil).",
      "Whisk in gelatin slowly until fully dissolved.",
      "Pour onto a silicone mat, spread as evenly as possible.",
      "Let dry at room temperature for 24–48 hours.",
      "Peel carefully. Very brittle without plasticiser.",
    ],
  },
  {
    id: "coffee-film",
    name: "Coffee",
    short: "Deep brown sheet",
    family: "Organic",
    accent: "#8b6647",
    description:
      "Spent coffee grounds bound with agar into a deep brown, paper-like sheet that keeps a faint espresso scent while drying.",
    ingredients: [
      "30 g spent coffee grounds",
      "150 ml water",
      "4 g agar-agar",
      "5 g glycerin",
    ],
    steps: [
      "Simmer grounds with water for 15 min.",
      "Strain through a fine cloth.",
      "Reheat the liquid and dissolve agar fully.",
      "Add glycerin, pour thin onto a silicone mat.",
      "Dry for 24 hours.",
    ],
  },
  {
    id: "flower-petals",
    name: "Flower petals",
    short: "Embedded in gelatin",
    family: "Gelatin-based",
    accent: "#e8b0c8",
    description:
      "A soft, translucent bioplastic with dried flower petals pressed into the surface. Used as inspiration for the inner lining of the Hybrid bag.",
    ingredients: [
      "12 g food gelatin",
      "100 ml water",
      "8 g glycerin",
      "Dried flower petals",
    ],
    steps: [
      "Heat water to 70 °C, whisk in gelatin until dissolved.",
      "Add glycerin, stir 1 minute, remove from heat.",
      "Pour onto a silicone mat.",
      "Place petals on the wet film before it sets.",
      "Dry at room temperature for 24–48 hours.",
    ],
  },
  {
    id: "blue-nacre",
    name: "Blue nacre",
    short: "Pearlescent blue film",
    family: "Gelatin-based",
    accent: "#88b8d8",
    description:
      "Gelatin film tinted blue with a pearlescent finish, a studio experiment to mimic mother-of-pearl for small samples and jewellery tests.",
    ingredients: [
      "12 g food gelatin",
      "100 ml water",
      "8 g glycerin",
      "Blue food colouring (few drops)",
      "Edible pearl dust or fine mica (pinch, optional)",
    ],
    steps: [
      "Heat water to 70 °C, dissolve gelatin and glycerin.",
      "Add colouring and pearl dust, stir gently to avoid bubbles.",
      "Pour onto a very flat silicone mat.",
      "Dry 24–48 h away from dust.",
      "Optional: buff lightly once dry for more shine.",
    ],
  },
];

function sampleImageSrc(sample) {
  return `/process/${sample.id}.png`;
}

function SampleModal({ sample, open, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => closeRef.current?.focus(), 50);
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !sample) return null;

  return (
    <div className="proc-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="proc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proc-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{ "--accent": sample.accent }}
      >
        <header className="proc-modal__head">
          <span className="proc-modal__family">{sample.family}</span>
          <button
            ref={closeRef}
            type="button"
            className="proc-modal__close"
            aria-label="Close recipe"
            onClick={onClose}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="proc-modal__body">
          <figure
            className="proc-modal__media"
            aria-hidden
            style={{ "--accent": sample.accent }}
          >
            <img
              src={sampleImageSrc(sample)}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </figure>

          <h2 id="proc-modal-title" className="proc-modal__title">
            {sample.name}
          </h2>
          <p className="proc-modal__short">{sample.short}</p>
          {sample.description.split("\n\n").map((para, i) => (
            <p key={i} className="proc-modal__desc">
              {para}
            </p>
          ))}

          {sample.composition && (
            <dl className="proc-modal__specs">
              <div className="proc-modal__spec">
                <dt>Composition</dt>
                <dd>{sample.composition}</dd>
              </div>
              {sample.aspect && (
                <div className="proc-modal__spec">
                  <dt>Appearance</dt>
                  <dd>{sample.aspect}</dd>
                </div>
              )}
              {sample.usage && (
                <div className="proc-modal__spec">
                  <dt>Usage</dt>
                  <dd>{sample.usage}</dd>
                </div>
              )}
            </dl>
          )}

          {sample.keyQualities ? (
            <section className="proc-modal__section">
              <h3 className="proc-modal__section-title">Key qualities</h3>
              <ul className="proc-modal__list">
                {sample.keyQualities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : (
            <>
              <section className="proc-modal__section">
                <h3 className="proc-modal__section-title">Ingredients</h3>
                <ul className="proc-modal__list">
                  {sample.ingredients.map((ing) => (
                    <li key={ing}>{ing}</li>
                  ))}
                </ul>
              </section>

              <section className="proc-modal__section">
                <h3 className="proc-modal__section-title">Steps</h3>
                <ol className="proc-modal__steps">
                  {sample.steps.map((step, i) => (
                    <li key={i}>
                      <span className="proc-modal__step-num">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SampleTile({ sample, onClick }) {
  return (
    <button
      type="button"
      className={`proc-tile${sample.featured ? " proc-tile--featured" : ""}`}
      style={{ "--accent": sample.accent }}
      onClick={onClick}
      aria-label={`${sample.name}, ${sample.short}`}
    >
      <figure className="proc-tile__media">
        <img
          src={sampleImageSrc(sample)}
          alt=""
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <span className="proc-tile__family">{sample.family}</span>
        {sample.featured && (
          <span className="proc-tile__badge">Project material</span>
        )}
        <figcaption className="proc-tile__caption">
          <span className="proc-tile__name">{sample.name}</span>
        </figcaption>
      </figure>
    </button>
  );
}

export default function Process() {
  const [activeSample, setActiveSample] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuOverlayRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const openSample = useCallback((sample) => setActiveSample(sample), []);
  const closeSample = useCallback(() => setActiveSample(null), []);

  return (
    <div className="proc-page">
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

      <main className="proc-main">
        <header className="proc-intro">
          <p className="proc-intro__eyebrow">The Hybrid lab</p>
          <h1 className="proc-intro__title">Materials</h1>
          <p className="proc-intro__lead">
            Recycled filaments, home-grown biomaterials, and the film that shows
            how a bioplastic comes to life.
          </p>
        </header>

        <section className="proc-video" aria-label="Cooking a bioplastic">
          <div className="proc-video__frame proc-video__frame--portrait">
            <video
              className="proc-video__media"
              controls
              playsInline
              preload="metadata"
              src={BIOMATERIAL_VIDEO_URL}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </section>

        <section className="proc-section" aria-labelledby="filaments-head">
          <header className="proc-section__head">
            <p className="proc-section__eyebrow">3D printing</p>
            <h2 id="filaments-head" className="proc-section__title">
              Recycled filaments
            </h2>
            <p className="proc-section__lead">
              Eight recycled and bio-based filaments explored in the studio,
              from oyster shell composites to ocean nylon and wood fiber PLA.
            </p>
          </header>

          <div className="proc-grid proc-grid--4">
            {FILAMENTS.map((s) => (
              <SampleTile key={s.id} sample={s} onClick={() => openSample(s)} />
            ))}
          </div>
        </section>

        <section
          className="proc-section proc-section--alt"
          aria-labelledby="bio-head"
        >
          <header className="proc-section__head">
            <p className="proc-section__eyebrow">From the kitchen</p>
            <h2 id="bio-head" className="proc-section__title">
              Biomaterials
            </h2>
            <p className="proc-section__lead">
              Made from food waste, algae, fungi and starches. Each tile opens a
              full recipe with ingredients, steps, drying time. Try them at
              home.
            </p>
          </header>

          <div className="proc-grid proc-grid--4">
            {BIOMATERIALS.map((s) => (
              <SampleTile key={s.id} sample={s} onClick={() => openSample(s)} />
            ))}
          </div>
        </section>

        <footer className="proc-footer">
          <Link
            to={homeBagLink.pathname}
            state={homeBagLink.state}
            className="proc-footer__link"
          >
            Back to home
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
            >
              <path
                d="M3 8h10M8 3l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </footer>
      </main>

      <SampleModal
        sample={activeSample}
        open={activeSample != null}
        onClose={closeSample}
      />

      {menuOpen && (
        <MenuOverlay ref={menuOverlayRef} onClose={() => setMenuOpen(false)} />
      )}
    </div>
  );
}
