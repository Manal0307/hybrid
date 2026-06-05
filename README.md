# Hybrid Bag

**School project — Erasmushogeschool Brussel (EHB)**  
Multimedia & Creative Technology · 2025-2026

## About the project

**Hybrid Handbag** is a physical bag I designed and made myself, combining 3D printing, biomaterials and recycled textiles. This repo is the **immersive companion website** for that object: not a shop, but a simple way to explore what the bag is made of and how it was created — through 3D scenes, a materials lab and a step-by-step process page.

---

## The website

- `/` : Home, 3D bag experience
- `/materials` : Filaments & biomaterials lab
- `/process` : How the bag is made (3D layers + photos)
- `/about` : Project info, TikTok, FAQ, contact

Menu navigation on every page.

---

## Tech stack

- **React 19**
- **Vite 7**
- **Three.js**
- **React Router 7**
- **CSS**
- **GLB / glTF**
- **Cloudinary**
- **ESLint**
- **glTF-Transform** — compresses large 3D files before upload (see bronnenlijst)

No backend. Built and deployed on **[Vercel](https://vercel.com)**.

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
npm run build    # production build → hybrid-bag/dist/
npm run preview  # preview the production build locally
npm run lint     # ESLint
```

---

## Bronnenlijst

21 kernbronnen, gegroepeerd per onderdeel van het project.

### Website & deploy

| Bron                                                             | Gebruikt voor             | Code                            |
| ---------------------------------------------------------------- | ------------------------- | ------------------------------- |
| [React](https://react.dev)                                       | UI, pagina's, componenten | `src/pages/`, `src/components/` |
| [Vite](https://vite.dev)                                         | dev server & build        | `vite.config.js`                |
| [React Router](https://reactrouter.com)                          | navigatie tussen routes   | `App.jsx`                       |
| [Vercel](https://vercel.com/docs/project-configuration#rewrites) | hosting & SPA routing     | `vercel.json`                   |
| [MDN](https://developer.mozilla.org)                             | HTML, CSS, JavaScript     | `src/index.css`, layouts        |

### 3D-modellen & assets

| Bron                                                                                                   | Gebruikt voor                                                            | Code                            |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------- |
| [Tripo3D](https://www.tripo3d.ai)                                                                      | GLB-scans materiaallagen                                                 | `public/models/`                |
| [Blender glTF export](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html) | export sac naar `.glb`                                                   | `finalbag.glb`                  |
| [glTF-Transform](https://gltf-transform.dev/)                                                          | GLB verkleinen vóór upload (`--compress false --texture-compress false`) | `public/models/finalbag.glb`    |
| [Khronos glTF](https://www.khronos.org/gltf)                                                           | GLB-bestandsformaat                                                      | `BagScene.jsx`, `Materials.jsx` |
| [Poly Haven](https://polyhaven.com/a/table_mountain_1_puresky)                                         | HDRI-verlichting `/process`                                              | `Materials.jsx`                 |
| [Cloudinary](https://cloudinary.com)                                                                   | biomaterial-video `/materials`                                           | `Process.jsx`                   |

### Scène 3D — homepage (`BagScene.jsx`)

| Bron                                                                                                                             | Gebruikt voor                                                                                      | Code                  |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------- |
| [Three.js](https://threejs.org)                                                                                                  | Algemene inspiratie: scene, lights, loaders — basis homepage-scène (ook bij refresh aan het begin) | `BagScene.jsx`        |
| [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)                                                               | canvas-render, tone mapping, schaduwen                                                             | `BagScene.jsx`        |
| [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)                                                                     | `finalbag.glb` inladen                                                                             | `BagScene.jsx`        |
| [PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html)                                                             | mauve lucht → environment map                                                                      | `BagScene.jsx`        |
| [Environment maps](https://webglfundamentals.org/webgl/lessons/webgl-environment-maps.html)                                      | reflecties & sfeer op object/water                                                                 | `BagScene.jsx`        |
| [UnrealBloomPass](https://threejs.org/docs/pages/UnrealBloomPass.html)                                                           | subtiele glow (post-processing)                                                                    | `BagScene.jsx`        |
| [Water](https://threejs.org/docs/#Water) + [Water.js](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Water.js) | reflecterend wateroppervlak                                                                        | `lib/Water.js`        |
| [Yasmina — Three.js beginners](https://youtu.be/xJAfLdUgdc4) (YouTube)                                                           | basis setup Three.js                                                                               | `BagScene.jsx`        |
| [Lomarco — Water reflections](https://youtu.be/RZzz1Jexm0M) (YouTube)                                                            | water, normal map, reflecties                                                                      | `loadWaterNormals.js` |
| [Class Outside — Blender → Three.js](https://youtu.be/_QmhpmZVZIU) (YouTube)                                                     | GLB plaatsen in webscène                                                                           | `BagScene.jsx`        |
