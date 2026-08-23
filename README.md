# Spatial 3D Studio (iOS First) 📸👓

Eine moderne iOS-optimierte React Native App für räumliche & stereoskopische Fotos und Videos im Apple Liquid Glass Design.

---

## ✨ Features

- 💎 **Apple Liquid Glass Design System**: Mehrschichtige Lichtbrechung, Glanzreflektionen, asymmetrische Glasfasen und Ambient-Glows.
- ✂️ **Spatial Photo & Video Splitting**: Automatisches Splitten von iPhone 15 Pro / 16 / 16 Pro Spatial Videos & SBS-Medien in synchrone L/R-Augenkanäle.
- 📸 **Cha-Cha 3D Guided Camera**:
  - Zwei-Schritt-Aufnahmeassistent mit transparentem Geisterbild (Onion Skin Viewfinder) für perfekte Deckung.
  - Dynamischer **1/30-Basis-Rechner** ($B \approx D/30$) mit Entfernungs-Presets (Makro 25cm $\rightarrow$ 8mm, Porträt 2m $\rightarrow$ 6.5cm, Raum 4.5m $\rightarrow$ 15cm, Architektur 25m $\rightarrow$ 85cm, Berg 1.5km $\rightarrow$ 50m Hyperstereo).
  - Horizont-Wasserwaage mit Kreis-Reticle und haptischem Feedback.
- 👓 **5-in-1 3D Viewing Studio**:
  1. **Split / Side-by-Side (SBS)** mit VR-Headset Modus (Vision Pro, Meta Quest, Cardboard) und IPD-Regler.
  2. **Schielblick (Cross-Eye)** mit Führungs-Punkten für 3D-Sicht ohne Brille.
  3. **Rot-Cyan Anaglyph 3D** mit Dubois-Farbüberlagerungsmatrix.
  4. **Wiggle 3D (Wigglegram)** mit regulierbarer FPS (6–20 FPS) und Touch-Scrubber.
  5. **3D Gyro Parallax Tilt**: Neige das iPhone, um räumlich um das Motiv herumzublicken.
- ⚙️ **Stereo-Justierung**: Disparität, vertikaler Ausgleich, Roll-Neigung und L/R-Tausch.
- 📤 **Export Studio**: SBS Voll/Halb, Anaglyph, Cross-Eye Card und Wigglegram-Export.
- 🔄 **Responsives Layout**: Automatische Anpassung an **Hochformat (Portrait)** und **Querformat (Landscape)**.

---

## 🚀 Schnellanleitung zum Starten

### 1. Abhängigkeiten installieren
```bash
npm install --legacy-peer-deps
```

### 2. Expo Server starten
```bash
npm start
```
*(oder `npx expo start -c --port 8082`)*

### 3. Auf dem iPhone testen
1. Öffne die kostenlose App **Expo Go** auf dem iPhone.
2. Scanne den im Terminal angezeigten **QR-Code** mit der iPhone-Kamera.
