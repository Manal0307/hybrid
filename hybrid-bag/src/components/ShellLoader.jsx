/**
 * ShellLoader — coquille Saint-Jacques SVG avec eau qui monte selon le % de chargement.
 * Forme tracée fidèlement : 7 bosses en éventail, lignes radiales, charnière ronde en bas.
 */
export default function ShellLoader({ percent = 0 }) {
  // L'eau monte de y=165 (0%) à y=18 (100%) dans le viewBox 0 0 200 185
  const waterY = 165 - (percent / 100) * 147;

  return (
    <div className="shell-loader">
      <svg viewBox="0 0 200 185" width="150" height="139" aria-hidden="true">
        <defs>
          {/* Clip = contour extérieur du coquillage */}
          <clipPath id="shell-clip">
            <path d={OUTER_PATH} />
          </clipPath>

          {/* Dégradé eau */}
          <linearGradient id="water-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#6aaae8" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0d3a70" stopOpacity="1"    />
          </linearGradient>
        </defs>

        {/* ── Eau clippée ── */}
        <g clipPath="url(#shell-clip)">
          {/* Fond de couleur sous l'eau (coquillage non rempli) */}
          <rect x="0" y={waterY + 40} width="200" height="200" fill="#0d3a70" opacity="0.18" />

          {/* Bloc eau principal avec transition smooth */}
          <g style={{
            transform: `translateY(${waterY}px)`,
            transition: "transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)",
          }}>
            {/* Vague 1 */}
            <path
              className="shell-wave"
              d="M-20,10 Q10,2 40,10 Q70,18 100,10 Q130,2 160,10 Q190,18 220,10 L220,180 L-20,180 Z"
              fill="url(#water-grad)"
            />
            {/* Vague 2 — décalée */}
            <path
              className="shell-wave shell-wave--2"
              d="M-20,14 Q15,6 50,14 Q85,22 120,14 Q155,6 190,14 Q210,18 220,14 L220,180 L-20,180 Z"
              fill="#4488cc"
              opacity="0.35"
            />
          </g>
        </g>

        {/* ── Lignes radiales (ridges) — par-dessus l'eau ── */}
        {RIDGE_LINES.map(([x, y], i) => (
          <line
            key={i}
            x1="100" y1="158"
            x2={x} y2={y}
            stroke="#e8ddd0"
            strokeWidth="0.85"
            opacity="0.22"
          />
        ))}

        {/* ── Contour extérieur ── */}
        <path
          d={OUTER_PATH}
          fill="none"
          stroke="#e8ddd0"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />

        {/* ── Charnière (petit demi-cercle en bas) ── */}
        <path
          d="M 91,158 A 9,7 0 1 1 109,158"
          fill="none"
          stroke="#e8ddd0"
          strokeWidth="1.6"
          opacity="0.9"
        />
      </svg>

      <span className="shell-loader__percent">
        {percent}<small>%</small>
      </span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Contour extérieur — coquille St-Jacques, viewBox 0 0 200 185
   7 bosses arrondies en éventail, lissées avec beziers cubiques.
   Sens horaire depuis bas-gauche.
────────────────────────────────────────────────────────────────── */
const OUTER_PATH = `
  M 60,160
  C 42,162 24,150 18,134
  C 12,118 14,100 20,90
  C 22,86 25,82 28,80
  C 30,76 30,72 34,70
  C 36,66 35,60 40,56
  C 42,52 46,46 52,42
  C 54,38 54,32 60,28
  C 64,24 69,22 74,23
  C 76,19 79,16 84,16
  C 88,14 93,13 98,14
  C 99,13 100,12 100,14
  C 100,12 101,13 102,14
  C 107,13 112,14 116,16
  C 121,16 124,19 126,23
  C 131,22 136,24 140,28
  C 146,32 146,38 148,42
  C 154,46 158,52 160,56
  C 165,60 164,66 166,70
  C 170,72 170,76 172,80
  C 175,82 178,86 180,90
  C 186,100 188,118 182,134
  C 176,150 158,162 140,160
  C 126,168 114,172 100,172
  C 86,172 74,168 60,160
  Z
`;

/* Destinations des lignes radiales depuis la charnière (100, 158) */
const RIDGE_LINES = [
  [20,  106],   // bord gauche
  [30,   78],   // bosse 1
  [50,   46],   // bosse 2
  [72,   25],   // bosse 3
  [100,  16],   // centre (bosse 4)
  [128,  25],   // bosse 5
  [150,  46],   // bosse 6
  [170,  78],   // bosse 7
  [180, 106],   // bord droit
];
