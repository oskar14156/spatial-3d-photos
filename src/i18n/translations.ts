import { LanguageCode } from '../types';

export const TRANSLATIONS = {
  de: {
    // App & Navigation
    app_title: 'Spatial 3D Studio',
    app_subtitle: 'Räumliche & Stereoskopische Fotos & Videos',
    tab_studio: '3D Studio',
    tab_camera: '3D Kamera',
    tab_gallery: 'Galerie',
    tab_settings: 'Einstellungen',

    // View Modes
    view_mode_sbs: 'Split / SBS',
    view_mode_cross_eye: 'Schielblick',
    view_mode_anaglyph: 'Rot-Cyan 3D',
    view_mode_wigglegram: 'Wiggle 3D',
    view_mode_parallax_tilt: '3D Gyro Tilt',

    // Mode Explanations
    sbs_explanation: 'Side-by-Side für VR-Brillen (Vision Pro, Meta Quest, Cardboard) oder freie parallele 3D-Sicht.',
    cross_eye_explanation: 'Schielblick-Methode: Ohne Brille leicht schielen, bis das 3. Bild in der Mitte dreidimensional verschmilzt.',
    cross_eye_guide_dot_left: '● Links schielen',
    cross_eye_guide_dot_right: '● Rechts schielen',
    cross_eye_tip: 'Tipp: Fokussiere die beiden Punkte, bis ein dritter Punkt in der Mitte scharf wird.',
    anaglyph_explanation: 'Klassisches Anaglyphen-3D: Verwende eine Standard Rot-Cyan 3D-Brille (Rot links, Cyan rechts).',
    wigglegram_explanation: 'Animierter 3D-Wigglegram-Effekt: Schneller Disparitäts-Wechsel erzeugt lebendige Tiefenillusion.',
    parallax_explanation: 'Bewege dein iPhone im Raum oder ziehe mit dem Finger, um das Motiv aus verschiedenen Winkeln dreidimensional zu betrachten.',

    // Anaglyph Modes
    anaglyph_mode_pure: 'Rot-Cyan Rein',
    anaglyph_mode_dubois: 'Dubois Optimiert',
    anaglyph_mode_color: 'Farbe',
    anaglyph_mode_half_color: 'Halbfarbe',

    // Stereo Alignment & Calibration
    adjustments_title: 'Stereo-Justierung & Tiefe',
    horizontal_disparity: 'Horizontale Disparität (Tiefe / Null-Parallaxe)',
    vertical_offset: 'Vertikaler Ausgleich (Höhe)',
    rotation_angle: 'Kameraneigung (Drehung)',
    zoom_scale: 'Größenabgleich (Zoom)',
    invert_eyes: 'Augen tauschen (L / R)',
    reset_alignment: 'Justierung zurücksetzen',
    convergence_hint: 'Verschiebe den Schieberegler, um das Motiv aus dem Bildschirm herausragen oder in die Tiefe versinken zu lassen.',

    // Wigglegram Controls
    wiggle_speed: 'Wiggle-Geschwindigkeit',
    wiggle_amplitude: 'Parallax-Stärke',
    fps_label: 'FPS',

    // Cha-Cha Guided Camera
    camera_title: 'Stereoskopische 3D Kamera',
    camera_step_1_title: 'Schritt 1: Linkes Foto aufnehmen',
    camera_step_1_desc: 'Richte das Motiv zentriert aus, halte das iPhone waagerecht und drücke den Auslöser.',
    camera_step_2_title: 'Schritt 2: Nach links versetzen',
    camera_step_2_desc: 'Bewege dich seitlich nach links. Nutze das transparente Geisterbild (Onion Skin) zur perfekten Deckung.',
    camera_shutter_left: 'Foto 1 (Links)',
    camera_shutter_right: 'Foto 2 (Rechts)',
    camera_retake_step1: 'Neu starten',
    camera_ghost_opacity: 'Geisterbild-Transparenz (Onion Skin)',
    camera_level_warning: 'iPhone waagerecht halten',
    camera_level_perfect: 'Perfekt waagerecht!',
    camera_gyro_level: 'Horizont-Wasserwaage',

    // Stereobase & 1/30 Rule Guide
    stereobase_rule_title: 'Die 1/30-Basis-Regel',
    stereobase_rule_summary: 'Je weiter das Motiv entfernt ist, desto größer muss der seitliche Abstand zwischen den zwei Fotos sein.',
    subject_distance_label: 'Motiventfernung:',
    recommended_shift_label: 'Empfohlener Links-Versatz:',
    steps_approx_label: 'Schritte:',
    rule_explanation_mountain: 'Beispiel Berg: Ein Berggipfel in 1.5 km Entfernung benötigt ca. 50 m Versatz für gigantische Tiefenwirkung (Hyperstereo).',
    rule_explanation_portrait: 'Beispiel Porträt: Bei einer Person in 2 m Entfernung reichen 6.5 cm (natürlicher menschlicher Augenabstand).',
    rule_explanation_macro: 'Beispiel Nahaufnahme: Bei 25 cm Abstand reicht bereits 1 cm Versatz.',

    // Subject Presets
    preset_macro_name: 'Makro / Nah',
    preset_macro_desc: 'Sehr nah (10–30 cm). Versatz: ca. 0.5–1 cm.',
    preset_macro_example: 'Blumen, Insekten, Schmuck',

    preset_portrait_name: 'Porträt / Tisch',
    preset_portrait_desc: 'Menschlicher Augenabstand (1–2.5 m). Versatz: 6.5 cm.',
    preset_portrait_example: 'Personen, Haustiere, Produkte',

    preset_room_name: 'Innenraum',
    preset_room_desc: 'Raumbereich (3–6 m). Versatz: ca. 15 cm.',
    preset_room_example: 'Zimmer, Möbel, kleine Gruppen',

    preset_architecture_name: 'Architektur',
    preset_architecture_desc: 'Gebäude & Straßen (15–40 m). Versatz: ca. 85 cm (1 Schritt).',
    preset_architecture_example: 'Häuser, Plätze, Denkmäler',

    preset_mountain_name: 'Berg / Hyperstereo',
    preset_mountain_desc: 'Weite Landschaft (500 m–2 km+). Versatz: 30–50 m!',
    preset_mountain_example: 'Berggipfel, Skyline, Horizont',

    // Cha-Cha Review Modal
    review_title: '3D Stereopaar Überprüfung',
    review_subtitle: 'Links- und Rechts-Aufnahme erfolgreich kombiniert',
    review_save_button: 'In Galerie & Studio öffnen',
    review_retake_button: 'Verwerfen & Neu aufnehmen',

    // Media Importer
    import_title: 'Medien importieren',
    import_spatial_button: 'Räumliches Foto / SBS teilen',
    import_left_right_button: '2 Fotos wählen (Links + Rechts)',
    import_camera_roll: 'Aus Fotomediathek',
    import_files: 'Aus Dateien',
    importing_progress: 'Stereobild wird verarbeitet und getrennt...',

    // Export & Share
    export_button: 'Exportieren & Teilen',
    export_modal_title: '3D Export Studio',
    export_format_sbs_full: 'Side-by-Side (SBS Vollauflösung)',
    export_format_sbs_half: 'Side-by-Side (SBS Halbbreite VR)',
    export_format_anaglyph: 'Rot-Cyan Anaglyph Foto',
    export_format_cross_eye: 'Schielblick 3D-Karte',
    export_format_wiggle_gif: 'Animiertes 3D Wigglegram (GIF/Video)',
    export_left_only: 'Nur linkes Auge',
    export_right_only: 'Nur rechtes Auge',
    export_success: 'Erfolgreich gespeichert / geteilt!',
    export_save_library: 'In Mediathek sichern',
    export_share_sheet: 'Über iOS Teilen...',

    // Demo Showcases
    demo_showcases_title: '3D Beispiel-Szenen',
    demo_mountain_title: 'Matterhorn Alpengipfel',
    demo_mountain_desc: 'Hyperstereo (50m Basis) für dramatische Bergtiefe',
    demo_portrait_title: 'Klassisches Porträt',
    demo_portrait_desc: 'Standard Augenabstand (6.5cm Basis) für realistische Tiefe',
    demo_architecture_title: 'Historische Kathedrale',
    demo_architecture_desc: '1 Meter Basis für plastische Säulen und Portale',
    demo_macro_title: 'Orchideen-Blüte',
    demo_macro_desc: '1 Zentimeter Makro-Basis mit feinen Staubfäden',

    // Settings
    settings_title: 'Einstellungen & Hilfe',
    settings_language: 'Sprache / Language',
    settings_base_rule: 'Stereobasis-Berechnung',
    settings_rule_1_30: '1/30 Regel (Standard, starke Tiefe)',
    settings_rule_1_50: '1/50 Regel (Sanft, ermüdungsfrei)',
    settings_about_title: 'Über Spatial 3D Studio',
    settings_about_desc: 'Entwickelt für iOS mit Apple Spatial Media Splitting, Cha-Cha Stereofotografie und professionellen 3D-Ansichten.',
    settings_haptics: 'Haptisches Feedback',
    settings_grid: 'Rasterlinien in Vorschau',

    // General
    close: 'Schließen',
    save: 'Speichern',
    cancel: 'Abbrechen',
    done: 'Fertig',
    loading: 'Wird geladen...',
    error: 'Fehler',
    camera_permission_required: 'Kamerazugriff erforderlich',
    camera_permission_desc: 'Bitte erlaube den Kamerazugriff in den iOS-Einstellungen, um 3D-Fotos aufzunehmen.',
  },

  en: {
    // App & Navigation
    app_title: 'Spatial 3D Studio',
    app_subtitle: 'Spatial & Stereoscopic Photos & Videos',
    tab_studio: '3D Studio',
    tab_camera: '3D Camera',
    tab_gallery: 'Gallery',
    tab_settings: 'Settings',

    // View Modes
    view_mode_sbs: 'Split / SBS',
    view_mode_cross_eye: 'Cross-Eye',
    view_mode_anaglyph: 'Red-Cyan 3D',
    view_mode_wigglegram: 'Wiggle 3D',
    view_mode_parallax_tilt: '3D Gyro Tilt',

    // Mode Explanations
    sbs_explanation: 'Side-by-Side for VR Headsets (Vision Pro, Meta Quest, Cardboard) or parallel free-viewing.',
    cross_eye_explanation: 'Cross-Eye method: Gently cross your eyes until a 3rd image appears in the center in 3D.',
    cross_eye_guide_dot_left: '● Left guide',
    cross_eye_guide_dot_right: '● Right guide',
    cross_eye_tip: 'Tip: Focus on both dots until a third dot snaps sharp in the center.',
    anaglyph_explanation: 'Classic Anaglyph 3D: Use standard Red-Cyan 3D glasses (Red on left eye, Cyan on right).',
    wigglegram_explanation: 'Animated 3D Wigglegram: Rapid disparity oscillation generates a living 3D illusion.',
    parallax_explanation: 'Tilt your iPhone or drag with your finger to look around the scene in interactive 3D.',

    // Anaglyph Modes
    anaglyph_mode_pure: 'Pure Red-Cyan',
    anaglyph_mode_dubois: 'Dubois Optimized',
    anaglyph_mode_color: 'Color',
    anaglyph_mode_half_color: 'Half Color',

    // Stereo Alignment & Calibration
    adjustments_title: 'Stereo Calibration & Depth',
    horizontal_disparity: 'Horizontal Disparity (Depth / Zero-Parallax)',
    vertical_offset: 'Vertical Offset (Height)',
    rotation_angle: 'Camera Roll (Rotation)',
    zoom_scale: 'Scale Match (Zoom)',
    invert_eyes: 'Swap Left / Right Eyes',
    reset_alignment: 'Reset Calibration',
    convergence_hint: 'Adjust convergence to push the subject in front of the screen or sink it into deep space.',

    // Wigglegram Controls
    wiggle_speed: 'Wiggle Speed',
    wiggle_amplitude: 'Parallax Amplitude',
    fps_label: 'FPS',

    // Cha-Cha Guided Camera
    camera_title: 'Stereoscopic 3D Camera',
    camera_step_1_title: 'Step 1: Capture Left Photo',
    camera_step_1_desc: 'Center your subject, hold the iPhone level, and press the shutter.',
    camera_step_2_title: 'Step 2: Shift Left',
    camera_step_2_desc: 'Step sideways to the left. Align framing using the semi-transparent onion skin viewfinder.',
    camera_shutter_left: 'Photo 1 (Left)',
    camera_shutter_right: 'Photo 2 (Right)',
    camera_retake_step1: 'Restart',
    camera_ghost_opacity: 'Ghosting / Onion Skin Opacity',
    camera_level_warning: 'Hold iPhone level',
    camera_level_perfect: 'Level locked!',
    camera_gyro_level: 'Horizon Level',

    // Stereobase & 1/30 Rule Guide
    stereobase_rule_title: 'The 1/30th Baseline Rule',
    stereobase_rule_summary: 'The farther away the subject, the larger the sideways distance between the two shots must be.',
    subject_distance_label: 'Subject Distance:',
    recommended_shift_label: 'Recommended Left Shift:',
    steps_approx_label: 'Steps:',
    rule_explanation_mountain: 'Mountain example: A peak 1.5 km away needs ~50 m baseline shift for massive 3D depth (Hyperstereo).',
    rule_explanation_portrait: 'Portrait example: A person 2 m away needs 6.5 cm (natural human eye distance).',
    rule_explanation_macro: 'Macro example: A flower 25 cm away needs only 1 cm baseline.',

    // Subject Presets
    preset_macro_name: 'Macro / Close-up',
    preset_macro_desc: 'Very close (10–30 cm). Shift: ~0.5–1 cm.',
    preset_macro_example: 'Flowers, insects, jewelry',

    preset_portrait_name: 'Portrait / Table',
    preset_portrait_desc: 'Human eye distance (1–2.5 m). Shift: 6.5 cm.',
    preset_portrait_example: 'People, pets, products',

    preset_room_name: 'Interior / Room',
    preset_room_desc: 'Room range (3–6 m). Shift: ~15 cm.',
    preset_room_example: 'Rooms, furniture, groups',

    preset_architecture_name: 'Architecture',
    preset_architecture_desc: 'Buildings & streets (15–40 m). Shift: ~85 cm (1 big step).',
    preset_architecture_example: 'Buildings, squares, monuments',

    preset_mountain_name: 'Mountain / Hyperstereo',
    preset_mountain_desc: 'Distant landscape (500 m–2 km+). Shift: 30–50 m!',
    preset_mountain_example: 'Mountain peaks, skyline, horizon',

    // Cha-Cha Review Modal
    review_title: '3D Stereopair Review',
    review_subtitle: 'Left and Right shots combined successfully',
    review_save_button: 'Open in Studio & Gallery',
    review_retake_button: 'Discard & Retake',

    // Media Importer
    import_title: 'Import Media',
    import_spatial_button: 'Split Spatial / SBS Photo',
    import_left_right_button: 'Select 2 Photos (Left + Right)',
    import_camera_roll: 'From Photo Library',
    import_files: 'From Files',
    importing_progress: 'Processing and splitting stereo channels...',

    // Export & Share
    export_button: 'Export & Share',
    export_modal_title: '3D Export Studio',
    export_format_sbs_full: 'Side-by-Side (SBS Full Res)',
    export_format_sbs_half: 'Side-by-Side (SBS Half Width VR)',
    export_format_anaglyph: 'Red-Cyan Anaglyph Image',
    export_format_cross_eye: 'Cross-Eye 3D Card',
    export_format_wiggle_gif: 'Animated 3D Wigglegram',
    export_left_only: 'Left Eye Only',
    export_right_only: 'Right Eye Only',
    export_success: 'Successfully saved / shared!',
    export_save_library: 'Save to Camera Roll',
    export_share_sheet: 'Share via iOS...',

    // Demo Showcases
    demo_showcases_title: '3D Sample Scenes',
    demo_mountain_title: 'Matterhorn Alpine Peak',
    demo_mountain_desc: 'Hyperstereo (50m baseline) for dramatic mountain depth',
    demo_portrait_title: 'Studio Portrait',
    demo_portrait_desc: 'Standard human eye distance (6.5cm baseline)',
    demo_architecture_title: 'Historic Cathedral',
    demo_architecture_desc: '1 meter baseline for sculpted depth',
    demo_macro_title: 'Orchid Flower',
    demo_macro_desc: '1 centimeter macro baseline with delicate petals',

    // Settings
    settings_title: 'Settings & Guide',
    settings_language: 'Language / Sprache',
    settings_base_rule: 'Stereobase Calculation',
    settings_rule_1_30: '1/30th Rule (Standard, Deep 3D)',
    settings_rule_1_50: '1/50th Rule (Subtle, Comfortable)',
    settings_about_title: 'About Spatial 3D Studio',
    settings_about_desc: 'Engineered for iOS with Apple Spatial Media Splitting, Cha-Cha stereophotography, and pro 3D viewing.',
    settings_haptics: 'Haptic Feedback',
    settings_grid: 'Viewfinder Grid Lines',

    // General
    close: 'Close',
    save: 'Save',
    cancel: 'Cancel',
    done: 'Done',
    loading: 'Loading...',
    error: 'Error',
    camera_permission_required: 'Camera Access Required',
    camera_permission_desc: 'Please allow camera access in iOS Settings to capture 3D photos.',
  },
};

export type TranslationKey = keyof typeof TRANSLATIONS['de'];

let currentLanguage: LanguageCode = 'de';

export function setLanguage(lang: LanguageCode) {
  currentLanguage = lang;
}

export function getLanguage(): LanguageCode {
  return currentLanguage;
}

export function t(key: TranslationKey): string {
  const dict = TRANSLATIONS[currentLanguage] || TRANSLATIONS.de;
  return (dict as Record<string, string>)[key] || key;
}
