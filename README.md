# Hybrid Bag

**School project, Erasmushogeschool Brussel (EHB)**  
Multimedia & Creative Technology · 2025-2026

Immersive web experience for **Hybrid**, a physical fashion accessory that combines 3D printing, biomaterials and recycled textiles into one design object. The site is not a shop: it is a digital showcase built around the real bag.

**Author:** [Manal Boulahya](https://www.linkedin.com/in/manalboulahya) (solo project)

---

## About the project

Hybrid is a concept bag built from oyster-shell PLA, red-cabbage bioplastic, recycled fabric and handmade florals. This repo is the companion website: 3D scenes, material lab and process documentation.

---

## The website

- `/` : Home, 3D bag experience  
- `/materials` : Filaments & biomaterials lab  
- `/process` : How the bag is made (3D layers + photos)  
- `/about` : Project info, TikTok, FAQ, contact  

Menu navigation on every page.

---

## Tech stack

- **React 19** + **Vite 7**
- **Three.js** : WebGL scenes, GLTF/GLB loading, HDRI lighting, custom water shader
- **React Router 7** : client-side routing
- **CSS** : custom layout; typography: **Caligula Dodgy**, **Telma**, **Figtree**

No backend. Static build deployable to any static host (Netlify, Vercel, GitHub Pages, etc.).

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

> **Note:** Large GLB files are included for local development. First load of `/process` may take a moment.

---

## Bronnenlijst

### Onderwijs & project

1. Erasmushogeschool Brussel (EHB). *Multimedia & Creative Technology*. https://www.erasmushogeschool.be  
2. Boulahya, M. (2025-2026). *Hybrid Bag*, concept accessoire, materiaalonderzoek en companion website (schoolproject).

### Materialen & makers (fysiek werk)

3. R-use Fabric. Hergebruikte stoffen en reststoffen, Ixelles. https://www.rusefabric.com  
4. Circular Ocean / fishing net filament, gerecycleerd nylon uit visnetten (materiaalinfo op `/materials`).  
5. PLA Huître, biocomposiet op basis van oesterschelpafval (gebruikt in de 3D-geprinte structuur).  
6. Eigen ontwikkelde bioplastics op basis van rode kool en andere plantaardige tests (zie biomaterialen op `/materials`).

### 3D-modellen & beeld

7. Tripo3D. 3D-scans / modellen (`filament.glb`, `innerbag.glb`, `tissu.glb`, `flowers.glb`). https://www.tripo3d.ai  
8. Poly Haven. HDRI *table_mountain_1_puresky* (verlichting 3D-viewer). https://polyhaven.com/a/table_mountain_1_puresky  
9. Cloudinary. Biomateriaal-procesvideo (gehoste `.mov` op `/materials`). https://cloudinary.com  

### Website, software & libraries

10. React. https://react.dev  
11. Vite. https://vite.dev  
12. React Router. https://reactrouter.com  
13. Three.js & Three.js Water example (`examples/jsm/objects/Water.js`). https://threejs.org  
14. TikTok Embed API / iframe embed (`tiktok.com/embed/v2`). https://developers.tiktok.com  

### Typografie & UI

15. Google Fonts, Figtree. https://fonts.google.com/specimen/Figtree  
16. Telma & Caligula Dodgy, projectfonts in `hybrid-bag/public/fonts/`.

### Documentatie & inspiratie (web development)

17. MDN Web Docs, WebGL, HTML, CSS, JavaScript. https://developer.mozilla.org  
18. GLTF / GLB-specificatie (Khronos Group). https://www.khronos.org/gltf  
