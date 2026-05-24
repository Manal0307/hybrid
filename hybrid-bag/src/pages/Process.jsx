import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import MenuOverlay from "../components/MenuOverlay";
import SoundButton from "../components/SoundButton";
import { homeBagLink } from "../utils/homeNav";
import "./Process.css";

/* ──────────────────────────────────────────────────────────────────────────
   Recycled filaments. alternatives utilisées pour l'impression 3D
   ────────────────────────────────────────────────────────────────────────── */
const FILAMENTS = [
  {
    id: "oyster-shell",
    name: "Oyster shell",
    short: "Used for the Hybrid bag",
    family: "Mineral",
    accent: "#d4c4a0",
    description:
      "Crushed oyster shells collected from coastal restaurants are blended with a PLA base. The result is a chalky, naturally rigid filament that prints like ceramic.",
    ingredients: [
      "70% PLA base (corn-derived)",
      "30% micronised oyster shell (calcium carbonate)",
      "Mineral pigments (optional)",
    ],
    steps: [
      "Clean and dry the oyster shells, then grind them into a fine powder (<50 µm).",
      "Mix the shell powder with PLA pellets in an industrial blender until homogeneous.",
      "Extrude through a 1.75 mm filament extruder at 180–200 °C.",
      "Cool, spool and dry. Print between 195–215 °C.",
    ],
  },
  {
    id: "pla-corn",
    name: "Corn-based PLA",
    short: "Most common bioplastic",
    family: "Plant-based",
    accent: "#e6d690",
    description:
      "Polylactic acid made from fermented corn starch. The everyday alternative to ABS — compostable in industrial conditions, with a low printing temperature.",
    ingredients: [
      "Corn starch (or sugarcane)",
      "Lactic acid bacteria",
      "Glycerin (plasticiser)",
    ],
    steps: [
      "Ferment corn starch with lactobacillus to produce lactic acid.",
      "Polymerise the lactic acid into PLA pellets.",
      "Extrude the pellets into a 1.75 mm filament.",
      "Print at 190–220 °C, bed at 50–60 °C.",
    ],
  },
  {
    id: "recycled-pet",
    name: "Recycled PET",
    short: "From discarded bottles",
    family: "Recycled plastic",
    accent: "#9bc8e6",
    description:
      "Plastic bottles collected, washed and shredded into flakes, then extruded as a tough, slightly translucent filament. Cuts virgin plastic use by 100%.",
    ingredients: [
      "Clear PET bottles (PETE / #1)",
      "Drying agent",
    ],
    steps: [
      "Sort and wash the bottles, remove labels and caps.",
      "Shred into 5 mm flakes, then dry at 70 °C for 4 hours.",
      "Extrude into filament at 250–270 °C.",
      "Print at 240–260 °C with an enclosed chamber.",
    ],
  },
  {
    id: "coffee-grounds",
    name: "Coffee grounds",
    short: "From cafés waste",
    family: "Organic",
    accent: "#8b6647",
    description:
      "Used coffee grounds dried, sieved and mixed with PLA. The filament has a soft brown tone and a faint coffee scent when printing.",
    ingredients: [
      "Used coffee grounds (dried)",
      "PLA base (70%)",
      "Natural waxes (optional)",
    ],
    steps: [
      "Collect spent coffee grounds, oven-dry at 90 °C for 12 hours.",
      "Sieve to <100 µm, blend with PLA pellets (≤30% by weight).",
      "Extrude into a 1.75 mm filament at 185–200 °C.",
      "Print at 195–210 °C.",
    ],
  },
  {
    id: "hemp-fiber",
    name: "Hemp fiber",
    short: "Plant-based composite",
    family: "Plant-based",
    accent: "#a8b07a",
    description:
      "Hemp fibers ground and blended with PLA for a matte, fibrous finish. The fibers add stiffness and a beautifully irregular surface texture.",
    ingredients: [
      "Hemp fibers (chopped, <2 mm)",
      "PLA base (75%)",
      "Compatibiliser (maleic anhydride)",
    ],
    steps: [
      "Dry the hemp fibers at 105 °C to remove moisture.",
      "Pre-compound with PLA in a twin-screw extruder.",
      "Pellet, then re-extrude into 1.75 mm filament.",
      "Print at 200–215 °C, expect a matte finish.",
    ],
  },
  {
    id: "wood-fiber",
    name: "Wood fiber",
    short: "From sawmill offcuts",
    family: "Recycled plant",
    accent: "#c19a6b",
    description:
      "Wood sawdust collected from local carpentry workshops and bound with PLA. Looks and feels like raw wood, can be sanded after printing.",
    ingredients: [
      "Sawdust (<80 µm)",
      "PLA base (60–70%)",
      "Binder (PHA optional)",
    ],
    steps: [
      "Dry the sawdust at 80 °C for 8 hours.",
      "Blend with PLA pellets, aim for 30% wood content.",
      "Extrude into filament at 175–190 °C (lower than pure PLA).",
      "Print at 190–210 °C, sand or seal for a wood-like finish.",
    ],
  },
  {
    id: "algae-composite",
    name: "Algae composite",
    short: "Sea-bound 3D printing",
    family: "Algae-based",
    accent: "#88b8a0",
    description:
      "Dried spirulina and brown algae ground into a fine powder, mixed with PLA to produce a deep-green filament with a faintly oceanic scent.",
    ingredients: [
      "Spirulina / brown algae (dried, milled)",
      "PLA base (70–80%)",
      "Glycerin (1–2%)",
    ],
    steps: [
      "Dehydrate the algae fully and grind to <60 µm.",
      "Blend with PLA pellets in a planetary mixer.",
      "Extrude at 180–195 °C — avoid overheating to preserve colour.",
      "Print at 195–210 °C, expect a matte green finish.",
    ],
  },
  {
    id: "cork-composite",
    name: "Cork composite",
    short: "From wine bottle stoppers",
    family: "Plant-based",
    accent: "#b89878",
    description:
      "Cork dust recovered from cork stopper production blended with PLA. The filament prints soft, slightly compressible objects with a natural cork texture.",
    ingredients: [
      "Cork dust (<100 µm)",
      "PLA base (75%)",
      "Plasticiser (PEG)",
    ],
    steps: [
      "Collect cork dust from local stopper workshops.",
      "Dry at 60 °C for 6 hours to remove moisture.",
      "Blend with PLA and PEG, then extrude at 180–195 °C.",
      "Print at 190–205 °C — best with a 0.6 mm nozzle to avoid clogs.",
    ],
  },
  {
    id: "bamboo-fiber",
    name: "Bamboo fiber",
    short: "Fast-growing plant base",
    family: "Plant-based",
    accent: "#c8c8a0",
    description:
      "Bamboo ground into micro-fibers and pre-compounded with PLA. Cheap to grow, strong when printed, beautifully fibrous on the surface.",
    ingredients: [
      "Bamboo fibers (<2 mm)",
      "PLA base (70%)",
      "Compatibiliser (maleic anhydride)",
    ],
    steps: [
      "Mill bamboo into short fibers, dry to <0.5% moisture.",
      "Compound with PLA in a twin-screw extruder.",
      "Pelletise, then extrude into 1.75 mm filament.",
      "Print at 200–215 °C — sand for a smoother finish.",
    ],
  },
  {
    id: "flax-fiber",
    name: "Flax fiber",
    short: "Linen-strong filament",
    family: "Plant-based",
    accent: "#d8c890",
    description:
      "Flax fibers from linen production blended with PLA. Light, very stiff, with a pale fibrous look reminiscent of raw linen thread.",
    ingredients: [
      "Flax fibers (<1.5 mm)",
      "PLA base (75%)",
      "Silane coupling agent (0.5%)",
    ],
    steps: [
      "Comb out short flax fibers from linen offcuts.",
      "Treat with a silane coupling agent for better adhesion.",
      "Compound with PLA pellets in a twin-screw extruder.",
      "Pelletise, then extrude into 1.75 mm filament.",
      "Print at 200–215 °C for a clean linen-like finish.",
    ],
  },
];

/* ──────────────────────────────────────────────────────────────────────────
   Biomaterials — recettes maison
   ────────────────────────────────────────────────────────────────────────── */
const BIOMATERIALS = [
  {
    id: "cabbage-bioplastic",
    name: "Cabbage bioplastic",
    short: "Used for the bag lining",
    family: "Gelatin-based",
    accent: "#e8a8c4",
    description:
      "A soft, translucent bioplastic embedded with dried flower petals and red cabbage extract. Used as the inner lining of the Hybrid bag.",
    ingredients: [
      "12 g food gelatin (or 4 g agar)",
      "60 ml red cabbage decoction (water boiled with red cabbage leaves)",
      "8 g glycerin",
      "Dried flower petals",
    ],
    steps: [
      "Simmer chopped red cabbage in water for 20 minutes, then strain to keep the deep purple liquid.",
      "Heat 60 ml of the red cabbage decoction to 70 °C in a saucepan (do not boil).",
      "Whisk in the gelatin slowly until fully dissolved.",
      "Add glycerin, stir for 1 minute. Remove from heat.",
      "Pour onto a silicone mat, sprinkle dried petals evenly.",
      "Let dry at room temperature for 24–48 hours.",
    ],
  },
  {
    id: "agar-seaweed",
    name: "Agar seaweed",
    short: "Vegan & translucent",
    family: "Algae-based",
    accent: "#7cc8a8",
    description:
      "A vegan bioplastic made from agar-agar, sourced from red seaweed. Fully biodegradable in soil, dissolves in hot water.",
    ingredients: [
      "4 g agar-agar powder",
      "100 ml water",
      "5 g glycerin",
      "Natural colourant (optional)",
    ],
    steps: [
      "Combine all ingredients in a saucepan.",
      "Heat slowly while stirring until the agar is fully dissolved (~85 °C).",
      "Simmer 2 minutes until the mixture thickens slightly.",
      "Pour onto a flat silicone surface, spread to even thickness.",
      "Dry at room temperature for 24 hours.",
    ],
  },
  {
    id: "potato-starch",
    name: "Potato starch",
    short: "Soft & flexible",
    family: "Starch-based",
    accent: "#e8d6a0",
    description:
      "The simplest bioplastic. Cheap, edible, and easy to colour. Great for prototypes and short-life applications.",
    ingredients: [
      "10 g potato starch",
      "100 ml water",
      "5 ml white vinegar",
      "5 g glycerin",
    ],
    steps: [
      "Mix starch and water in a saucepan until smooth.",
      "Add vinegar and glycerin, stir well.",
      "Heat gently while stirring — the mixture will turn translucent and thick.",
      "Pour onto a silicone mat, spread thin.",
      "Dry for 2–3 days.",
    ],
  },
  {
    id: "fruit-pectin",
    name: "Fruit pectin",
    short: "From apple peels",
    family: "Fruit-based",
    accent: "#f4b48a",
    description:
      "A bioplastic made from apple peels rich in pectin. Naturally amber-coloured, with a fruity scent that fades over time.",
    ingredients: [
      "200 g apple peels",
      "150 ml water",
      "5 g glycerin",
      "Lemon juice (a few drops)",
    ],
    steps: [
      "Boil the apple peels with water and lemon juice for 30 min.",
      "Blend the mixture until smooth, then sieve.",
      "Add glycerin to the pulp, simmer for 5 min.",
      "Spread on a silicone mat in a thin layer.",
      "Dry at 40 °C in an oven for 8 hours, or 3 days at room temp.",
    ],
  },
  {
    id: "mycelium-foam",
    name: "Mycelium foam",
    short: "Living, grown material",
    family: "Fungi-based",
    accent: "#b8a890",
    description:
      "Mycelium (mushroom roots) grown on agricultural waste forms a dense, biodegradable foam. Used as packaging and structural cores.",
    ingredients: [
      "Hemp shavings or straw (substrate)",
      "Mycelium spawn (Ganoderma or Pleurotus)",
      "Water",
      "Flour (food source)",
    ],
    steps: [
      "Sterilise the substrate by boiling, then cool to room temperature.",
      "Mix with mycelium spawn and a small amount of flour.",
      "Pack into a sealed mould, leaving a small air hole.",
      "Incubate in the dark at 24 °C for 7–10 days.",
      "Demould, then dry in an oven at 80 °C to kill the mycelium.",
    ],
  },
  {
    id: "banana-leather",
    name: "Banana leather",
    short: "From peel waste",
    family: "Fruit-based",
    accent: "#d4b85a",
    description:
      "A leather-like material made from banana peels and glycerin. Strong, flexible, and surprisingly water-resistant once treated.",
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
    id: "kombucha-leather",
    name: "Kombucha leather",
    short: "Grown on tea",
    family: "Bacterial cellulose",
    accent: "#b08868",
    description:
      "SCOBY (kombucha culture) grown on sweetened tea forms a leather-like sheet of bacterial cellulose. Naturally amber, can be dyed.",
    ingredients: [
      "1 L brewed black tea",
      "100 g sugar",
      "100 ml kombucha starter (with SCOBY)",
    ],
    steps: [
      "Brew strong black tea, dissolve sugar, let cool.",
      "Add kombucha starter and SCOBY to a wide shallow container.",
      "Cover with cloth, let grow at 25 °C for 2–3 weeks.",
      "Harvest the pellicle, rinse, and dry on a flat surface.",
      "Apply natural oil or wax for flexibility.",
    ],
  },
  {
    id: "red-cabbage-bio",
    name: "Red cabbage film",
    short: "From kitchen waste",
    family: "Vegetable-based",
    accent: "#7a3a8a",
    description:
      "Red cabbage leaves usually thrown away, turned into a deep violet, slightly translucent film. Used alongside the cabbage bioplastic in the Hybrid bag.",
    ingredients: [
      "300 g red cabbage leaves",
      "200 ml water",
      "10 g glycerin",
      "5 g agar-agar",
    ],
    steps: [
      "Simmer the chopped leaves in water for 20 minutes to extract the deep purple decoction.",
      "Strain to keep only the violet liquid.",
      "Add agar and glycerin to the decoction, heat gently until thickened.",
      "Spread thin on a silicone mat.",
      "Dry at room temperature for 48 hours.",
    ],
  },
  {
    id: "spinach-bioplastic",
    name: "Spinach pulp",
    short: "Translucent green film",
    family: "Vegetable-based",
    accent: "#6cb898",
    description:
      "Spinach blanched and pulped, set with agar — a translucent green film that catches the light beautifully.",
    ingredients: [
      "200 g fresh spinach",
      "100 ml water",
      "4 g agar-agar",
      "5 g glycerin",
    ],
    steps: [
      "Blanch the spinach 2 minutes, then drain.",
      "Blend smooth, sieve through a fine cloth.",
      "Heat the pulp with water and agar until dissolved.",
      "Stir in glycerin, pour onto a silicone mat.",
      "Dry for 24 hours at room temperature.",
    ],
  },
  {
    id: "orange-peel",
    name: "Orange peel",
    short: "Citrus-amber translucent film",
    family: "Citrus-based",
    accent: "#f4b48a",
    description:
      "Orange peels caramelised with pectin and lemon — an amber, slightly fragrant film perfect for packaging or jewellery.",
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
    id: "avocado-seed",
    name: "Avocado seed",
    short: "Pink-brown bioplastic",
    family: "Seed-based",
    accent: "#b08868",
    description:
      "Avocado pits ground to flour, cooked with starch — produces a delicate pink-brown film that darkens with time.",
    ingredients: [
      "30 g avocado seed flour (dried & milled)",
      "100 ml water",
      "5 ml white vinegar",
      "5 g glycerin",
    ],
    steps: [
      "Sun-dry the pits for 5 days, then mill to flour.",
      "Mix flour with water and vinegar.",
      "Heat while stirring until thickened (~85 °C).",
      "Stir in glycerin, pour onto a silicone mat.",
      "Dry for 3 days at room temperature.",
    ],
  },
  {
    id: "beet-bioplastic",
    name: "Beet juice",
    short: "Magenta-pink film",
    family: "Vegetable-based",
    accent: "#c890a8",
    description:
      "Beet juice set with carrageenan into a magenta translucent film. Fades to dusty pink as it dries.",
    ingredients: [
      "80 ml beet juice",
      "20 ml water",
      "3 g carrageenan",
      "5 g glycerin",
    ],
    steps: [
      "Warm beet juice and water gently.",
      "Whisk in carrageenan slowly until dissolved.",
      "Add glycerin, simmer 1 minute.",
      "Pour onto a silicone mat, spread thin.",
      "Dry for 24 hours.",
    ],
  },
  {
    id: "coffee-film",
    name: "Coffee film",
    short: "Deep brown paper-like sheet",
    family: "Organic",
    accent: "#8b6647",
    description:
      "Spent coffee grounds boiled and bound with agar — a deep brown, paper-like sheet that smells faintly of espresso.",
    ingredients: [
      "30 g spent coffee grounds",
      "150 ml water",
      "4 g agar-agar",
      "5 g glycerin",
    ],
    steps: [
      "Simmer grounds with water for 15 min.",
      "Strain through a fine cloth.",
      "Reheat the liquid, dissolve agar fully.",
      "Add glycerin, pour thin onto a silicone mat.",
      "Dry for 24 hours.",
    ],
  },
  {
    id: "tea-leaves",
    name: "Tea leaves",
    short: "Jade-brown translucent sheet",
    family: "Leaf-based",
    accent: "#a87858",
    description:
      "Used green tea leaves blended with pectin — a translucent jade-brown sheet, faintly aromatic.",
    ingredients: [
      "40 g spent tea leaves",
      "200 ml water",
      "4 g pectin",
      "5 g glycerin",
    ],
    steps: [
      "Boil tea leaves with water for 20 min.",
      "Blend, then strain through cloth.",
      "Reheat with pectin until thickened.",
      "Stir in glycerin, spread thin.",
      "Dry for 36 hours.",
    ],
  },
  {
    id: "chitosan-film",
    name: "Chitosan film",
    short: "From shrimp shells",
    family: "Marine-based",
    accent: "#f0d870",
    description:
      "Chitosan extracted from shrimp shells — strong, transparent, and naturally antibacterial. Used in wound dressings and food packaging.",
    ingredients: [
      "2 g chitosan powder",
      "100 ml acetic acid 1%",
      "5 g glycerin",
    ],
    steps: [
      "Dissolve chitosan in the acid solution slowly.",
      "Stir for 30 minutes until fully homogeneous.",
      "Filter to remove undissolved particles.",
      "Add glycerin, pour onto a silicone mat.",
      "Dry for 48 hours.",
    ],
  },
  {
    id: "egg-white",
    name: "Egg white film",
    short: "Paper-thin & transparent",
    family: "Animal protein",
    accent: "#e8e0c8",
    description:
      "Egg whites whipped briefly and dried with glycerin — a fully transparent, paper-thin film that catches light like silk.",
    ingredients: [
      "3 egg whites",
      "20 ml water",
      "5 g glycerin",
    ],
    steps: [
      "Whisk egg whites and water gently — avoid foam.",
      "Add glycerin, strain through fine cloth.",
      "Spread very thin on a silicone mat.",
      "Dry slowly at 30 °C for 24 hours.",
      "Peel carefully — fragile when fresh.",
    ],
  },
  {
    id: "milk-casein",
    name: "Milk casein",
    short: "Ivory hard plastic",
    family: "Animal protein",
    accent: "#f0e8d0",
    description:
      "Casein extracted from skimmed milk with vinegar — a hard, ivory-coloured plastic, used historically for buttons and beads.",
    ingredients: [
      "500 ml skimmed milk",
      "30 ml white vinegar",
    ],
    steps: [
      "Heat milk gently to 60 °C.",
      "Pour vinegar in slowly, stirring — curds will form.",
      "Strain through a cloth, press out the liquid.",
      "Knead the curds into shape (moulds optional).",
      "Air-dry for 3 days, then sand or polish.",
    ],
  },
  {
    id: "rice-flour",
    name: "Rice flour",
    short: "Soft translucent film",
    family: "Starch-based",
    accent: "#f0e0c8",
    description:
      "White rice flour cooked into a translucent, slightly elastic film. Cheap, easy to colour, and edible.",
    ingredients: [
      "12 g rice flour",
      "100 ml water",
      "5 ml vinegar",
      "5 g glycerin",
    ],
    steps: [
      "Whisk rice flour and water until smooth.",
      "Add vinegar and glycerin.",
      "Heat while stirring until translucent (~85 °C).",
      "Pour onto a silicone mat, spread thin.",
      "Dry for 48 hours.",
    ],
  },
  {
    id: "carrageenan-film",
    name: "Carrageenan film",
    short: "Glassy seaweed sheet",
    family: "Algae-based",
    accent: "#8cc8b0",
    description:
      "Carrageenan from red seaweed — produces a glassy, slightly elastic film that dissolves in hot water.",
    ingredients: [
      "4 g carrageenan",
      "100 ml water",
      "5 g glycerin",
    ],
    steps: [
      "Heat the water to 80 °C.",
      "Whisk in carrageenan slowly until clear.",
      "Stir in glycerin.",
      "Pour thin onto silicone.",
      "Dry for 24 hours.",
    ],
  },
  {
    id: "pumpkin-pulp",
    name: "Pumpkin pulp",
    short: "Warm orange sheet",
    family: "Vegetable-based",
    accent: "#e8a878",
    description:
      "Roasted pumpkin pulped and set with agar — warm orange, slightly grainy, fully biodegradable.",
    ingredients: [
      "200 g pumpkin pulp",
      "50 ml water",
      "4 g agar-agar",
      "5 g glycerin",
    ],
    steps: [
      "Roast pumpkin until soft, then pulp.",
      "Heat the pulp with water and agar.",
      "Stir in glycerin, simmer 2 min.",
      "Spread on a silicone mat.",
      "Dry for 48 hours.",
    ],
  },
];

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
    <div
      className="proc-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
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
              src={`/process/${sample.id}.jpg`}
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
          <p className="proc-modal__desc">{sample.description}</p>

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
                  <span className="proc-modal__step-num">{String(i + 1).padStart(2, "0")}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

function SampleTile({ sample, onClick }) {
  return (
    <button
      type="button"
      className="proc-tile"
      style={{ "--accent": sample.accent }}
      onClick={onClick}
      aria-label={`${sample.name} — ${sample.short}`}
    >
      <figure className="proc-tile__media">
        <img
          src={`/process/${sample.id}.jpg`}
          alt=""
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <span className="proc-tile__family">{sample.family}</span>
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
  const [soundMuted, setSoundMuted] = useState(false);
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
          <button
            type="button"
            className={`sound-button${soundMuted ? " sound-button--muted" : ""}`}
            aria-label={
              soundMuted ? "Unmute ambient sound" : "Mute ambient sound"
            }
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
                <line
                  className="sound-button__mute-line"
                  x1="5"
                  y1="5"
                  x2="19"
                  y2="19"
                />
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

      <main className="proc-main">
        <header className="proc-intro">
          <p className="proc-intro__eyebrow">The Hybrid lab</p>
          <h1 className="proc-intro__title">How it&apos;s made</h1>
          <p className="proc-intro__lead">
            Recycled filaments, home-grown biomaterials — and the film that
            shows how a bioplastic comes to life.
          </p>
        </header>

        <section className="proc-video" aria-label="Cooking a bioplastic">
          <div className="proc-video__frame">
            <video
              className="proc-video__media"
              controls
              preload="metadata"
              poster="/process/video-poster.jpg"
              src="/process/bioplastic.mp4"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            >
              Your browser does not support the video tag.
            </video>
            <div className="proc-video__placeholder" aria-hidden>
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.2" />
                <path d="M10 8l6 4-6 4V8z" fill="currentColor" />
              </svg>
              <p>Process film coming soon</p>
            </div>
          </div>
        </section>

        <section className="proc-section" aria-labelledby="filaments-head">
          <header className="proc-section__head">
            <p className="proc-section__eyebrow">3D printing</p>
            <h2 id="filaments-head" className="proc-section__title">
              Recycled filaments
            </h2>
            <p className="proc-section__lead">
              The Hybrid shell is printed in oyster shell filament. But many
              other waste streams can be turned into filament — here are the
              ones we&apos;ve tested in the studio.
            </p>
          </header>

          <div className="proc-grid">
            {FILAMENTS.map((s) => (
              <SampleTile key={s.id} sample={s} onClick={() => openSample(s)} />
            ))}
          </div>
        </section>

        <section className="proc-section proc-section--alt" aria-labelledby="bio-head">
          <header className="proc-section__head">
            <p className="proc-section__eyebrow">From the kitchen</p>
            <h2 id="bio-head" className="proc-section__title">
              Biomaterials
            </h2>
            <p className="proc-section__lead">
              Made from food waste, algae, fungi and starches. Each tile opens
              a full recipe with ingredients, steps, drying time. Try them at home.
            </p>
          </header>

          <div className="proc-grid">
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
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
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
        <MenuOverlay
          ref={menuOverlayRef}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}
