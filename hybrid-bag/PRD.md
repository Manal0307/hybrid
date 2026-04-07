# PRD — Hybrid Bag (site web)

**Document :** exigences produit et technique pour l’application `hybrid-bag`  
**Périmètre :** expérience web immersive autour du sac **Hybrid Programmable Bag**  
**Dernière mise à jour :** 6 avril 2026

---

## 1. Résumé exécutif

**Hybrid Bag** est un site vitrine **sans backend** : une expérience **scroll + WebGL** centrée sur un sac 3D dans un environnement océanique (eau, ciel, éclairage cinématique). Le produit n’est pas un objet connecté : il s’agit de **présenter un objet de design** (impression 3D, biomatériaux, matières recyclées — narration à préciser) avec un ton **artistique, expérimental et écologique**, pas purement commercial.

**Valeur utilisateur :** immersion, découverte du produit et des matériaux, lien vers une page **Materials** plus éditoriale.

---

## 2. Objectifs produit

| Objectif | Description |
|----------|-------------|
| **Immersion** | Faire entrer le visiteur dans une scène 3D où le sac est la pièce centrale. |
| **Narration** | Intro cinématique + textes au scroll + transition vers la découverte des matériaux. |
| **Exploration** | Permettre d’explorer le sac (rotation par drag) et les matériaux (sphères 3D interactives). |
| **Clarté** | Navigation simple : accueil `/`, matériaux `/materials`, retour vers l’accueil. |

**Succès (indicateurs qualitatifs)** : parcours compréhensible sans tutoriel ; performance WebGL acceptable sur desktop et mobile récents ; cohérence visuelle (typo, couleurs, ton).

---

## 3. Public cible & positionnement

- **Public :** curieux du design, de l’innovation matériau, du luxe expérimental ; pas un flux e-commerce classique.
- **Positionnement :** galerie digitale / vitrine — références d’inspiration mentionnées dans le projet : expériences type showcase expérimental, pas catalogue produit.

---

## 4. Parcours utilisateur (implémenté)

### 4.1 Page d’accueil (`/`)

1. **Chargement** — Écran plein avec logo lettre par lettre « HYBRID » et pourcentage de chargement simulé.
2. **Intro texte** — Lignes poétiques (« Where the ocean meets design », etc.), possibilité de **Passer** l’intro.
3. **Transition** — Sortie de l’intro puis entrée en **scène 3D** (scroll remis à zéro).
4. **Descente automatique** — Scroll programmé sur ~4,5 s jusqu’à un seuil (`AUTO_DESCENT_SCROLL_END` ≈ 0,52 × hauteur viewport) : le sac se pose **juste au-dessus de l’eau**, **face avant** (trous) orientée vers la caméra, **sans** rotation complète pendant cette phase.
5. **Scroll libre** — Ensuite le visiteur fait défiler : le sac continue vers le bas (immersion), rotation complète sur la portion de scroll restante jusqu’à la fin de la « descente » narrative (`DESCENT_END` ≈ 1,8 × vh).
6. **CTA Scroll** — Bouton « Scroll » visible dans une bande après la fin de la descente auto pour inciter à poursuivre.
7. **Piste texte sticky** — Trois blocs de texte (titre + corps) avec fondu en fonction du scroll (plage ~1,5–7,5 vh pour l’overlay de fondu).
8. **Section produit** — Zone réservée (spacers + section produit) jusqu’à l’apparition du CTA **Discover Materials** (visible après ~9 × hauteur de viewport de scroll).
9. **Lien** — `Discover Materials` → `/materials`.

**Scène 3D (comportement clé)**  
- Eau (shader Three.js `Water`), normales eau (procédural + fallback fichiers).  
- Ciel (gradient canvas type HDRI équirectangulaire).  
- Environnement **RGBE** (`table_mountain_1_puresky_2k.hdr`).  
- Sac **`/models/codebag.glb`**, échelle et positions verticales calculées (yTop, yBottom, yHover au-dessus de la surface).  
- **Perles** (`pearl.glb` ou sphères de secours) : deux comportements distincts par scène.
  - **Scène 1** (descente `0 → DESCENT_END`) : perles **cachées** (`pearlGroup.visible = false`).
  - **Scène 2** (émergence `EMERGENCE_START → ∞`) : déclenchement synchronisé sur la **position Y du sac** (quand `bagGroup.position.y > -0.35`, soit juste avant que le sac crève la surface). Chaque perle jaillit avec un stagger en secondes réelles (indépendant de la vitesse de scroll), animation « burst » amorti (exponentielle × sinus), puis repos à `y = 0` (moitié immergée dans l'eau).  
- **Hotspots** HTML projetés sur le sac en phase « produit » (après ré-émergence), avec visibilité selon orientation / écran.  
- **Bloom** (EffectComposer + UnrealBloomPass).  
- **Drag** sur le sac en phase produit uniquement (rotation du groupe sac, inertie).

### 4.2 Page Materials (`/materials`)

1. **Hero** — Titre « Materials », sous-titre, indication de scroll.
2. **Storytelling** — Trois blocs texte + visuels **placeholder** (à remplacer par images/vidéos).
3. **Section top-view** — Placeholder transition « vue du dessus ».
4. **Showcase matériaux** — Quatre matériaux (Blueberry Leather, Ocean Textile, Bio Composite, Golden Mycelium) : pastilles latérales + **viewer WebGL** (sphère avec `MeshStandardMaterial` paramétré par matériau, HDRI, drag + rotation lente).
5. **Process** — Trois étapes (Source, Transform, Craft).
6. **Vidéo** — iframe YouTube intégrée (URL actuelle dans le code).
7. **Retour** — Lien « Back to the beginning » vers `/`.

---

## 5. Inventaire fonctionnel

### 5.1 Livré (code actuel)

| Domaine | Fonctionnalités |
|---------|-----------------|
| **Routing** | `react-router-dom` : `/`, `/materials`. |
| **Home** | Phases loading / intro / introExit / scene ; scroll auto + CTA ; text track ; fade overlay ; nav header (logo, boutons son/menu non branchés fonctionnellement). |
| **Scene3D** | Eau, ciel, HDRI, sac GLB, perles, scroll-driven animation, hotspots, bloom, resize, cleanup dispose. |
| **Materials** | Page long format, reveal au scroll (IntersectionObserver), viewers 3D par matériau. |
| **Accessibilité partielle** | `aria-label` sur certains contrôles ; hotspots avec `aria-hidden` dynamique. |

### 5.2 Partiel / placeholder

| Élément | État |
|---------|------|
| Boutons **son** et **menu** (header) | UI présente, logique non décrite / non branchée dans ce dépôt. |
| Visuels **Materials** (story + top-view) | Placeholders texte. |
| **GSAP** | Mentionné dans `CONTEXT.md` pour transitions futures — non requis dans le build actuel. |

### 5.3 Vision / backlog (réf. `CONTEXT.md`)

- Transitions caméra vers zones du sac + texte spatial dédié par hotspot (au-delà des infobulles actuelles).  
- Intro encore plus cinématographique (timeline GSAP si besoin).  
- Décomposition narrative du sac vers la page matériaux (effet scénique).  
- Contenu réel : choix définitifs des biomatériaux, textes définitifs, assets photo/scan.

---

## 6. Exigences non fonctionnelles

| Critère | Cible |
|---------|--------|
| **Performance** | Limiter le pixel ratio (ex. 2 max) ; une scène Three principale + viewers Materials légers. |
| **Compatibilité** | Navigateurs récents avec WebGL ; pas d’IE. |
| **Hébergement** | Site **statique** (build Vite) : pas d’API, pas de base de données. |
| **Confidentialité** | Pas de compte utilisateur dans le périmètre actuel. |

---

## 7. Architecture technique

| Couche | Choix |
|--------|--------|
| **Framework** | React 19, Vite 7 |
| **3D** | Three.js (r152+ / 0.183.x selon lock) |
| **Routing** | React Router 7 |
| **Assets** | `public/models/*.glb`, textures eau en `public/textures/`, HDRI sous `src/map/hdri/` |

**Fichiers clés**

- `src/App.jsx` — routes.  
- `src/pages/Home.jsx` — machine à états intro + scroll + CTA.  
- `src/components/Scene3D.jsx` — scène principale, constantes de scroll exportées (`AUTO_DESCENT_SCROLL_END`).  
- `src/pages/Materials.jsx` + `Materials.css` — page matériaux.  
- `src/utils/waterNormalsTexture.js`, `loadWaterNormals.js` — eau.

---

## 8. Contenu & marque

- **Nom produit :** Hybrid Programmable Bag (textes marketing dans `TEXTS`, hero Materials).  
- **Thème :** océan, nature, circularité, atelier (Brussels mentionné dans le process).  
- **Typographie :** fonts projet (ex. Telma référencée dans le repo) — détails dans `index.css` / `fonts/`.

---

## 9. Hors périmètre (décisions documentées)

- Pas de **backend** ni tunnel e-commerce dans ce PRD.  
- Pas de **hardware** (LED, Raspberry Pi, etc.) pour cette application web.  
- Pas d’application mobile native : **web responsive** uniquement.

---

## 10. Glossaire

| Terme | Signification |
|-------|----------------|
| **vh** | Unité « × hauteur de viewport » utilisée pour mapper le scroll à la scène 3D. |
| **Phase produit** | Partie du scroll où le sac est en mode « floating » et le drag / hotspots sont actifs. |
| **yHover** | Position verticale du sac « au repos » juste au-dessus du plan d’eau après la descente auto. |

---

## 11. Historique documentaire

| Source | Rôle |
|--------|------|
| `CONTEXT.md` (racine du repo parent) | Vision long terme, stack, idées « prochaines étapes ». |
| Ce PRD | Synthèse **produit** + **état réel du code** pour onboarding et priorités. |

*Pour toute évolution majeure (nouvelle route, e-commerce, CMS), mettre à jour ce fichier et les sections concernées dans `CONTEXT.md`.*
