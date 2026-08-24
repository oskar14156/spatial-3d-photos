# Spatial 3D Studio (iOS)

Eine iOS-App für räumliche und stereoskopische Fotos und Videos, gebaut mit
React Native, Expo und zwei eigenen Swift-Modulen.

---

## Features

### Geführte Cha-Cha-Aufnahme mit echter Bewegungsmessung

Der Sucher ist eine ARKit-Session, keine gewöhnliche Kameravorschau. Das ist
der Kern der App: World Tracking misst, **wie weit du dich tatsächlich bewegt
hast**, statt dich Schritte schätzen zu lassen.

- Aufnahme 1 setzt den Ursprung. Aufnahme 2 zeigt live „Nach rechts bewegen ·
  noch 3,2 cm“ mit Fortschrittsbalken und Zielfenster.
- LiDAR misst den Motivabstand am Reticle; daraus folgt die empfohlene
  Stereobasis (1/30-Regel, für nahe Motive begrenzt, für weite Szenen bewusst
  als Hyperstereo).
- Waagerecht- und Höhendrift-Prüfung, Haptik beim Erreichen der Position,
  optionaler Auto-Auslöser.
- Stills kommen aus `captureHighResolutionFrame`, also in voller Auflösung.
- Onion-Skin-Überlagerung der ersten Aufnahme für deckungsgleiche Bildwahl.

Ohne LiDAR oder World Tracking fällt die App auf Abstands-Presets zurück und
sagt das auch.

### Import

Der Einstieg ist die **Galerie**, nicht ein Format-Dialog: die App zeigt deine
eigene Fotomediathek als Raster, prüft im Hintergrund, welche Aufnahmen
tatsächlich räumlich sind, markiert sie mit „3D" und sortiert sie nach vorn.
Mehrfachauswahl, ein Filter „nur räumlich", und ein Knopf, der **alle**
gefundenen räumlichen Aufnahmen auf einmal importiert.

Die Prüfung läuft nur über Dateien, die überhaupt in Frage kommen (HEIC, HEIF,
MOV) und mit höchstens zwei gleichzeitig, damit eine Mediathek mit Tausenden
Bildern nicht Stück für Stück dekodiert wird.

Unterstützte Quellen:

- **Apple Spatial Photo / Video** — HEIC-Stereopaare und MV-HEVC werden nativ
  in echte linke und rechte Kanäle zerlegt. Der Original-Asset wird über die
  Mediathek gelesen, weil der Image Picker eine transkodierte Kopie liefert und
  genau dabei die Stereo-Daten verloren gehen. **Nur iOS** — siehe unten.
- **Side-by-Side-Bild** — einmal dekodiert, zweimal beschnitten. Wird beim
  Galerie-Import automatisch erkannt, wenn ein Bild etwa doppelt so breit wie
  hoch ist.
- **Zwei Fotos** — linkes und rechtes Auge einzeln wählen (unter „Manuell").

### Betrachtung

| Modus | Foto | Video |
| --- | --- | --- |
| Split / Side-by-Side (mit VR-Modus und Augenabstand-Regler) | ✓ | ✓ |
| Schielblick mit Fusionspunkten | ✓ | ✓ |
| Rot-Cyan-Anaglyph (Farbe / Halbfarbe / Mono) | ✓ | — |
| Wiggle 3D (6–20 fps, Touch-Scrubbing) | ✓ | — |
| Gyro-Parallaxe | ✓ | — |

Die Gyro-Parallaxe zeigt als Linie an, wo zwischen den Augen du gerade stehst
und wie viel Weg in jede Richtung bleibt — Neigen und Ziehen bewegen denselben
Regler. Im Sucher liegt zusätzlich eine künstliche Horizontlinie über dem Bild:
sie dreht sich mit dem Gerät und wird grün, sobald es waagerecht ist.

Das Anaglyph ist eine echte Kanaltrennung: jedes Auge wird mit einer reinen
Primärfarbe multipliziert (links behält R, rechts G und B), danach werden beide
per `screen` überlagert. Da sich die Kanalmengen nicht überschneiden, ist das
mathematisch identisch zur Addition — die Komposition stimmt exakt.

Stereo-Videos laufen mit zwei Decodern: das native Splitting kopiert die
Tonspur in die linke Spur, die damit der einzige Wiedergabe-Master ist.

### Justierung und Export

- Disparität, vertikaler Ausgleich, Roll, Skalierung und L/R-Tausch als
  Schieberegler; Änderungen werden sofort gesichert.
- Export als SBS voll/halb, Cross-Eye, Anaglyph (in der gewählten Variante),
  Wiggle-GIF oder Einzelauge — mit korrekter Ausrichtung und in tatsächlicher
  Pixelgröße.

### Sprache

Deutsch und Englisch, umschaltbar zur Laufzeit; die gesamte Oberfläche
aktualisiert sich sofort.

---

## Entwicklung

Die App enthält eigene Native-Module (`modules/spatial-capture`,
`modules/spatial-media`) und läuft deshalb **nicht in Expo Go**. Sie braucht
einen Development- oder Release-Build.

```bash
npm install
```

```bash
npx expo run:ios --device
```

Typen prüfen:

```bash
npm run ts:check
```

### Android

Der gesamte JavaScript-Teil läuft auf beiden Plattformen: Oberfläche, alle fünf
Betrachtungsmodi, Mediathek, Galerie-Import, Export, Sprachen, Hell/Dunkel.
SF Symbols werden auf Android durch Material-Icons ersetzt, Liquid Glass durch
einen Blur.

Nativ gibt es zwei Kotlin-Module mit derselben Schnittstelle wie unter iOS:

- `spatial-capture` misst die Bewegung mit **ARCore** statt ARKit — gleiche
  Anker-Logik, gleiche Bildschirmachsen, gleiche Ereignisse. Tiefe kommt aus
  der ARCore Depth API.
- `spatial-media` erledigt alle Exportformate inklusive echtem Anaglyph-Kanal-
  trennung, und liest die EXIF-Ausrichtung selbst, weil `BitmapFactory` sie
  ignoriert.

**Was Android nicht kann:** Apple Spatial Photos und Videos importieren. Es
gibt dort keine Schnittstelle, um HEIC-Stereogruppen zu lesen, und MediaCodec
dekodiert bei MV-HEVC nur die Basisebene. Die App erkennt solche Dateien und
sagt das ausdrücklich, statt still ein einäugiges Bild zu importieren.

```bash
npx expo run:android --device
```

Dafür braucht es das Android SDK (Android Studio) und ein Gerät mit
[ARCore-Unterstützung](https://developers.google.com/ar/devices) für die
Bewegungsführung. Ohne ARCore fällt die Aufnahme auf Abstands-Presets zurück.

### Anforderungen

- iOS 15.1 oder neuer.
- ARKit World Tracking für die Bewegungsführung (A9 und neuer).
- LiDAR für die automatische Abstandsmessung (iPhone 12 Pro und neuer).
- `captureHighResolutionFrame` ab iOS 16; darunter wird der Sucherframe
  gespeichert.
- Spatial-Video-Import setzt iOS 17.2 voraus.

### Aufbau

```
modules/spatial-capture   ARKit- bzw. ARCore-Sucher: Tiefe, Bewegung, Stills
modules/spatial-media     HEIC/MV-HEVC-Splitting und Foto-Export
src/theme                 Design-Tokens (Farben, Typografie, Radien)
src/components/common     Icon-Abstraktion, Glas, Tab-Leiste, Leer-Zustände
src/components/viewer     Renderflächen, Bedienleiste, Justierung
src/components/importer   Galerie-Raster und manuelle Importwege
src/components/camera     Aufnahme, Führung, Überprüfung
src/screens               Studio und Mediathek, zwei Tabs über einer Liste
```

**Layout-Vertrag:** Der Viewer besitzt genau einen Rahmen, und *nichts* anderes
zeichnet darin. Die Renderflächen füllen ihn absolut; Modus-Bedienung,
Justierung und Metadaten stapeln sich darunter im normalen Fluss. Nur die
Tab-Leiste schwebt.
