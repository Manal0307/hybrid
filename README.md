# Hybrid Bag

**School project — Erasmushogeschool Brussel (EHB)**  
Multimedia & Creative Technology · 2025–2026

Immersive web experience for **Hybrid**, a physical fashion accessory that combines 3D printing, biomaterials and recycled matter into one design object. The site is not a shop: it is a digital showcase built around the real bag.

---

## About the project

Hybrid explores how technology and ecology can meet in a single everyday object. The physical piece was designed and crafted as part of my EHB coursework; this repository contains the **companion website** — a scroll-driven WebGL experience where visitors discover the bag, its materials and how it was made.

**Author:** Manal Boulahya (solo project)

---

## The website

| Route | Description |
|-------|-------------|
| `/` | Loading screen, intro text, 3D bag scene (water, sky, sakura), scroll narrative |
| `/materials` | Material showcase, 3D material viewer, process overview |
| `/process` | Recycled filaments, biomaterial samples, recipe modals, video section |
| `/about` | Project mission, FAQ, contact |

Navigation is available from the overlay menu on every page.

---

## Tech stack

- **React 19** + **Vite**
- **Three.js** — 3D scene, water shader, GLB models, HDRI lighting
- **React Router** — client-side routing
- **CSS** — custom layout and typography (Telma, Caligula Dodgy)

No backend. Static build deployable to any static host.

---

## Getting started

The app lives in the `hybrid-bag/` folder.

**Requirements:** Node.js 18+ and npm

```bash
cd hybrid-bag
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

**Other commands:**

```bash
npm run build    # production build → dist/
npm run preview  # preview the production build locally
npm run lint     # ESLint
```

> **Note:** There is no public demo URL yet. Run the project locally to view it.

---

## Project structure

```
hybrid/
├── README.md              ← this file (project overview)
└── hybrid-bag/            ← React + Vite application
    ├── public/
    │   ├── models/        ← 3D assets (bag, sakura, …)
    │   ├── textures/      ← water normals, loading images
    │   └── fonts/
    └── src/
        ├── components/    ← BagScene, MenuOverlay, …
        ├── pages/         ← Home, Materials, Process, About
        └── utils/
```

---

## Status

Work in progress. Core pages and the main 3D experience are in place; content (photos, videos, copy) is still being refined.

---

## Contact

Manal Boulahya — [manal.boulahya@student.ehb.be](mailto:manal.boulahya@student.ehb.be)  
Brussels
