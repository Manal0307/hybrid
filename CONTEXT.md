# HYBRID BAG — Project Context

## Vision

Hybrid Bag est un sac de design sculptural fabriqué en combinant :
- **Impression 3D** (PLA/PETG, conçu sous Blender)
- **Biomatériaux** (matières organiques vivantes — ex. mycelium, cuir de kombucha, algues — à définir)
- **Matières recyclées** (plastique recyclé, filets de pêche, tissu récupéré — à définir)

Le projet explore comment des matières opposées peuvent devenir une seule pièce de design, avec un ancrage fort dans l'écologie et la durabilité.

---

## Site Web

Le site est une **expérience immersive WebGL** — pas une page produit classique. Le visiteur entre dans un environnement 3D où le sac est la pièce maîtresse.

### Flow narratif prévu

```
① INTRO
   Fondu noir → sac qui émerge lentement de l'eau → titre "HYBRID"

② SCÈNE PRINCIPALE
   Sac posé sur l'eau, éclairage cinématique
   Rotation libre à la souris (drag to explore)
   Hotspots lumineux sur zones clés du sac

③ HOTSPOT (ex: zone biomatériau)
   Caméra glisse vers la zone
   Texte narratif dans l'espace 3D
   Retour possible

④ TRANSITION → Page Matières
   Bouton "Découvrir les matières"
   Sac se décompose en ses matières constitutives

⑤ PAGE MATIÈRES
   3 swatches cliquables (3D print / biomatériau / recyclé)
   Clic → scène 3D dédiée à chaque matière
   Chaque matière a sa propre atmosphère, lumière, shader
```

---

## Stack technique

| Outil | Rôle |
|---|---|
| React + Vite | Framework frontend |
| Three.js | Moteur 3D WebGL |
| EffectComposer + UnrealBloomPass | Post-processing (bloom) |
| OrbitControls | Rotation interactive souris |
| Water (Three.js examples) | Shader eau avec reflets |
| RGBELoader | Chargement HDRI pour l'environnement |
| GLTFLoader | Chargement du modèle 3D du sac (.glb) |
| GSAP | Prévu pour les transitions caméra et animations UI |

---

## État actuel — Ce qui est implémenté

### Scène 3D (Scene3D.jsx)
- **Eau** — Water shader Three.js, normales procédurales générées en canvas, fallback sur textures fichier
- **Ciel** — Gradient canvas équirectangulaire (bleu violacé → rose pêche, inspiration Viva La Labia)
- **HDRI** — `table_mountain_1_puresky_2k.hdr` pour l'environnement et les reflets
- **Sac 3D** — `codebag.glb` chargé via GLTFLoader, auto-scalé à ~1.5 unités
- **Animation émergence** — Le sac monte de sous l'eau en tournant pour présenter sa face avant (6 secondes, easing pow4)
- **OrbitControls** — Rotation drag, zoom scroll, limites polaires (pas de vue sous l'eau)
- **Lumières** — keyLight devant-droite + fillLight gauche bleuté + rimLight arrière minimal
- **Bloom** — EffectComposer + UnrealBloomPass (corrigé : l'ancien code utilisait `renderer.setEffects()` inexistant)
- **Cleanup React** — Dispose complet du renderer, composer, controls au unmount

### Paramètres de rendu actuels
```js
toneMappingExposure: 0.52
environmentIntensity: 0.45
ambientLight: 0x8899cc @ 0.3
keyLight: 0xfff0e0 @ 1.0  (pos: 2, 4, 4)
fillLight: 0xaabfff @ 0.35 (pos: -3, 2, 2)
rimLight: 0xffd0a0 @ 0.08  (pos: 0, 3, -5)
bloomStrength: 0.18 / radius: 0.35 / threshold: 0.88
camera: (0, 1.2, 3.0) → target (0, 0.5, 0)
```

---

## Structure des fichiers

```
hybrid-bag/
├── public/
│   ├── models/
│   │   └── codebag.glb          ← modèle 3D du sac
│   └── textures/
│       ├── water.jpg             ← normal map eau (fallback)
│       ├── waternormals.jpg      ← normal map eau (fallback)
│       └── waternormal3.jpg      ← normal map eau (fallback)
└── src/
    ├── components/
    │   └── Scene3D.jsx           ← composant principal 3D
    ├── map/hdri/
    │   └── table_mountain_1_puresky_2k.hdr  ← HDRI actif
    ├── utils/
    │   ├── waterNormalsTexture.js  ← génère normales eau procéduralement
    │   └── loadWaterNormals.js     ← charge normal map avec fallback chain
    ├── App.jsx
    ├── index.css                 ← styles globaux (full-screen scene)
    └── main.jsx
```

---

## Prochaines étapes

### Priorité 1 — Hotspots
- Points lumineux pulsants sur des zones spécifiques du sac
- Clic → caméra qui glisse vers la zone + texte narratif spatial
- Nécessite de définir les 3-4 zones de storytelling du sac

### Priorité 2 — Intro cinématique
- Fondu noir au chargement
- Titre "HYBRID" qui apparaît progressivement
- GSAP pour les transitions

### Priorité 3 — Page matières
- Route `/materials` ou section séparée
- Swatches des 3 matières (à confirmer : 3D print / biomatériau / recyclé)
- Chaque matière → scène 3D dédiée avec forme brute + shader/atmosphère propre

### Priorité 4 — Contenu éditorial
- Définir les biomatériaux utilisés (mycelium ? kombucha leather ? autre ?)
- Rédiger les textes narratifs pour chaque zone du sac
- Photos / scans des matières pour les textures

---

## Décisions de design

- **Pas de backend** — le projet est un site vitrine statique, pas un produit connecté
- **Pas de hardware** (Raspberry Pi, LEDs, servos) — focus sur le sac comme objet de design
- **Inspiration visuelle** — Viva La Labia, Rocani, galerie digitale expérimentale
- **Ton** — futuriste / artistique / expérimental / écologique — pas commercial
