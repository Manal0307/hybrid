# Hybrid Bag

> **School project** — Erasmushogeschool Brussel (EHB)  
> Multimedia & Creative Technology · 2025-2026

## About the project

**Hybrid Handbag** is a physical bag I designed and made myself, combining 3D printing, biomaterials and recycled textiles.

This repo is the **immersive companion website** for that object — not a shop, but a way to explore what the bag is made of and how it was created, through 3D scenes, a materials lab and a step-by-step process page.

## The website

| Route | Page |
| :---- | :--- |
| `/` | Home — 3D bag experience |
| `/materials` | Filaments & biomaterials lab |
| `/process` | How the bag is made (3D layers + photos) |
| `/about` | Project info, TikTok, FAQ, contact |

Menu navigation on every page.

## Tech stack

| Category | Tools |
| :------- | :---- |
| Frontend | React 19, Vite 7, React Router 7, CSS |
| 3D | Three.js, GLB / glTF, glTF-Transform |
| Media & quality | Cloudinary, ESLint |
| Deploy | [Vercel](https://vercel.com) — no backend |

`glTF-Transform` compresses large 3D files before upload (see bronnenlijst).

## Getting started

The app lives in the `hybrid-bag/` folder.

**Requirements:** Node.js 18+ and npm

```bash
cd hybrid-bag
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

```bash
npm run build    # production build → hybrid-bag/dist/
npm run preview  # preview the production build locally
npm run lint     # ESLint
```

---

## Bronnenlijst


### 3D-modellen & assets

| Bron | Gebruikt voor | Code |
| :--- | :------------ | :--- |
| [Tripo3D](https://www.tripo3d.ai) | GLB-scans materiaallagen | `public/models/` |
| [Blender glTF export](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html) | Export sac naar `.glb` | `finalbag.glb` |
| [glTF-Transform](https://gltf-transform.dev/) | GLB verkleinen vóór upload | `public/models/finalbag.glb` |
| [Poly Haven](https://polyhaven.com/a/table_mountain_1_puresky) | HDRI-verlichting `/process` | `Materials.jsx` |
| [Cloudinary](https://cloudinary.com) | Biomaterial-video `/materials` | `Process.jsx` |

### Scène 3D — homepage

| Bron | Gebruikt voor | Code |
| :--- | :------------ | :--- |
| [Three.js](https://threejs.org) | Scene, lights, loaders — basis homepage-scène | `BagScene.jsx` |
| [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html) | Canvas-render, tone mapping, schaduwen | `BagScene.jsx` |
| [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) | `finalbag.glb` inladen | `BagScene.jsx` |
| [PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html) | Mauve lucht → environment map | `BagScene.jsx` |
| [Environment maps](https://webglfundamentals.org/webgl/lessons/webgl-environment-maps.html) | Reflecties & sfeer op object/water | `BagScene.jsx` |
| [UnrealBloomPass](https://threejs.org/docs/pages/UnrealBloomPass.html) | Subtiele glow (post-processing) | `BagScene.jsx` |
| [Water](https://threejs.org/docs/#Water) · [Water.js](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Water.js) | Reflecterend wateroppervlak | `lib/Water.js` |
| [Yasmina — Three.js beginners](https://youtu.be/xJAfLdUgdc4) | Basis setup Three.js | `BagScene.jsx` |
| [Lomarco — Water reflections](https://youtu.be/RZzz1Jexm0M) | Water, normal map, reflecties | `loadWaterNormals.js` |
| [Cursor AI — Création one-pager eau et ciel](docs/bronnen/cursor-one-pager-scene.md) | Eerste 3D-scène: eau, ciel, Water.js, normal maps | `BagScene.jsx`, `lib/Water.js` |
| [Class Outside — Blender → Three.js](https://youtu.be/_QmhpmZVZIU) | GLB plaatsen in webscène | `BagScene.jsx` |
