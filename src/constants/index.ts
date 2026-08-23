import { StereoPair, StereoAlignment } from '../types';

export const DEFAULT_ALIGNMENT: StereoAlignment = {
  horizontalDisparity: 0,
  verticalOffset: 0,
  rotationAngle: 0,
  zoomScale: 1.0,
  invertEyes: false,
};

// High-Fidelity SVG-based Stereoscopic 3D Demo Pairs with precise geometric parallax shifts
const DEMO_MOUNTAIN_LEFT = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="%230b192c"/>
      <stop offset="60%" stop-color="%231e3e62"/>
      <stop offset="100%" stop-color="%23ff6500"/>
    </linearGradient>
    <linearGradient id="snow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%23ffffff"/>
      <stop offset="100%" stop-color="%2390a4ae"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(%23sky)"/>
  <!-- Distant Stars/Sun -->
  <circle cx="650" cy="180" r="45" fill="%23ffe082" opacity="0.9"/>
  <!-- Distant Background Mountains (Subtle Shift) -->
  <polygon points="120,400 320,200 480,400" fill="%232c3e50" opacity="0.85"/>
  <polygon points="320,200 360,250 310,260" fill="url(%23snow)"/>
  <!-- Midground Mountain (Medium Shift) -->
  <polygon points="280,450 510,140 720,450" fill="%231a252f"/>
  <polygon points="510,140 550,220 480,240" fill="url(%23snow)"/>
  <!-- Foreground Ridge & Trees (Large Shift for Hyperstereo Depth) -->
  <polygon points="-50,600 200,340 450,600" fill="%230f141a"/>
  <polygon points="380,600 580,380 820,600" fill="%230a0d11"/>
  <!-- Foreground Pine Trees (Left Perspective) -->
  <polygon points="170,420 185,380 200,420" fill="%23004d40"/>
  <polygon points="180,450 195,400 210,450" fill="%23004d40"/>
  <text x="40" y="70" fill="%23ffffff" font-size="28" font-weight="bold" font-family="sans-serif">LEFT EYE (Alps 50m Baseline)</text>
</svg>`;

const DEMO_MOUNTAIN_RIGHT = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="%230b192c"/>
      <stop offset="60%" stop-color="%231e3e62"/>
      <stop offset="100%" stop-color="%23ff6500"/>
    </linearGradient>
    <linearGradient id="snow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%23ffffff"/>
      <stop offset="100%" stop-color="%2390a4ae"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(%23sky)"/>
  <!-- Distant Sun (Infinite Depth, no shift) -->
  <circle cx="650" cy="180" r="45" fill="%23ffe082" opacity="0.9"/>
  <!-- Distant Background Mountains (Shifted left by 6px) -->
  <polygon points="114,400 314,200 474,400" fill="%232c3e50" opacity="0.85"/>
  <polygon points="314,200 354,250 304,260" fill="url(%23snow)"/>
  <!-- Midground Mountain (Shifted left by 18px) -->
  <polygon points="262,450 492,140 702,450" fill="%231a252f"/>
  <polygon points="492,140 532,220 462,240" fill="url(%23snow)"/>
  <!-- Foreground Ridge & Trees (Shifted left by 45px for massive 3D pop!) -->
  <polygon points="-95,600 155,340 405,600" fill="%230f141a"/>
  <polygon points="335,600 535,380 775,600" fill="%230a0d11"/>
  <!-- Foreground Pine Trees (Shifted perspective) -->
  <polygon points="125,420 140,380 155,420" fill="%23004d40"/>
  <polygon points="135,450 150,400 165,450" fill="%23004d40"/>
  <text x="40" y="70" fill="%23ffffff" font-size="28" font-weight="bold" font-family="sans-serif">RIGHT EYE (Alps 50m Baseline)</text>
</svg>`;

const DEMO_PORTRAIT_LEFT = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%231e1b4b"/>
      <stop offset="100%" stop-color="%23311042"/>
    </linearGradient>
    <radialGradient id="faceGrad" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="%23fed7aa"/>
      <stop offset="100%" stop-color="%23f97316"/>
    </radialGradient>
  </defs>
  <rect width="800" height="600" fill="url(%23bg)"/>
  <!-- Background Wall Decor (Depth 0) -->
  <circle cx="200" cy="150" r="60" fill="%233730a3" opacity="0.4"/>
  <rect x="580" y="100" width="100" height="140" rx="8" fill="%234338ca" opacity="0.4"/>
  <!-- Person Shoulders (Mid-depth) -->
  <ellipse cx="400" cy="530" rx="200" ry="120" fill="%230284c7"/>
  <!-- Head (Front Depth) -->
  <circle cx="400" cy="300" r="120" fill="url(%23faceGrad)"/>
  <!-- Glasses / Eyes -->
  <rect x="330" y="270" width="55" height="35" rx="8" fill="%230f172a" stroke="%2338bdf8" stroke-width="4"/>
  <rect x="415" y="270" width="55" height="35" rx="8" fill="%230f172a" stroke="%2338bdf8" stroke-width="4"/>
  <line x1="385" y1="287" x2="415" y2="287" stroke="%2338bdf8" stroke-width="4"/>
  <!-- Smile -->
  <path d="M 360 360 Q 400 395 440 360" stroke="%239a3412" stroke-width="5" fill="none" stroke-linecap="round"/>
  <!-- Foreground Coffee Cup (Near Pop-out) -->
  <rect x="260" y="470" width="60" height="70" rx="6" fill="%23f43f5e"/>
  <text x="40" y="70" fill="%23ffffff" font-size="28" font-weight="bold" font-family="sans-serif">LEFT EYE (Portrait 6.5cm)</text>
</svg>`;

const DEMO_PORTRAIT_RIGHT = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%231e1b4b"/>
      <stop offset="100%" stop-color="%23311042"/>
    </linearGradient>
    <radialGradient id="faceGrad" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="%23fed7aa"/>
      <stop offset="100%" stop-color="%23f97316"/>
    </radialGradient>
  </defs>
  <rect width="800" height="600" fill="url(%23bg)"/>
  <!-- Background Wall Decor (Unshifted) -->
  <circle cx="200" cy="150" r="60" fill="%233730a3" opacity="0.4"/>
  <rect x="580" y="100" width="100" height="140" rx="8" fill="%234338ca" opacity="0.4"/>
  <!-- Person Shoulders (Shifted left by 12px) -->
  <ellipse cx="388" cy="530" rx="200" ry="120" fill="%230284c7"/>
  <!-- Head (Shifted left by 20px) -->
  <circle cx="380" cy="300" r="120" fill="url(%23faceGrad)"/>
  <!-- Glasses / Eyes -->
  <rect x="310" y="270" width="55" height="35" rx="8" fill="%230f172a" stroke="%2338bdf8" stroke-width="4"/>
  <rect x="395" y="270" width="55" height="35" rx="8" fill="%230f172a" stroke="%2338bdf8" stroke-width="4"/>
  <line x1="365" y1="287" x2="395" y2="287" stroke="%2338bdf8" stroke-width="4"/>
  <!-- Smile -->
  <path d="M 340 360 Q 380 395 420 360" stroke="%239a3412" stroke-width="5" fill="none" stroke-linecap="round"/>
  <!-- Foreground Coffee Cup (Shifted left by 36px for extreme near pop-out) -->
  <rect x="224" y="470" width="60" height="70" rx="6" fill="%23f43f5e"/>
  <text x="40" y="70" fill="%23ffffff" font-size="28" font-weight="bold" font-family="sans-serif">RIGHT EYE (Portrait 6.5cm)</text>
</svg>`;

export const DEMO_STEREO_PAIRS: StereoPair[] = [
  {
    id: 'demo_mountain_matterhorn',
    title: 'Matterhorn Alpine Peak',
    leftUri: DEMO_MOUNTAIN_LEFT,
    rightUri: DEMO_MOUNTAIN_RIGHT,
    mediaType: 'photo',
    sourceType: 'demo',
    createdAt: Date.now(),
    description: 'Hyperstereo capture with 50m baseline for distant mountain depth.',
    baselineDistanceMeters: 50.0,
    subjectDistanceMeters: 1500.0,
    subjectCategory: 'mountain',
    alignment: { ...DEFAULT_ALIGNMENT },
    aspectRatio: 800 / 600,
  },
  {
    id: 'demo_portrait_studio',
    title: 'Studio Portrait 3D',
    leftUri: DEMO_PORTRAIT_LEFT,
    rightUri: DEMO_PORTRAIT_RIGHT,
    mediaType: 'photo',
    sourceType: 'demo',
    createdAt: Date.now() - 100000,
    description: 'Human eye interpupillary distance (6.5cm baseline) portrait.',
    baselineDistanceMeters: 0.065,
    subjectDistanceMeters: 2.0,
    subjectCategory: 'portrait',
    alignment: { ...DEFAULT_ALIGNMENT },
    aspectRatio: 800 / 600,
  },
];
