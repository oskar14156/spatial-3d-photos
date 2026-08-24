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

    // Studio shell
    studio_eyebrow_photo: 'STEREOFOTO',
    studio_eyebrow_video: 'RÄUMLICHES VIDEO',
    studio_untitled: 'Ohne Titel',
    library_title: 'Mediathek',
    library_count_one: '1 Projekt',
    library_count_other: '{count} Projekte',
    library_empty_title: 'Noch keine Aufnahmen',
    library_empty_body: 'Nimm ein Stereopaar auf oder importiere ein räumliches Foto.',
    capture_stereo: 'Stereo aufnehmen',
    action_import: 'Importieren',
    action_export: 'Exportieren',
    action_settings: 'Einstellungen',
    action_delete: 'Löschen',
    action_adjust: 'Justierung',
    badge_photo: 'FOTO',
    badge_video: 'VIDEO',
    badge_demo: 'DEMO',
    badge_captured: 'AUFGENOMMEN',
    badge_spatial: 'SPATIAL',
    badge_stereo: 'STEREO',
    source_built_in: 'Mitgeliefertes Beispiel',
    source_hold_options: 'Halten für Optionen',

    // Viewer controls
    viewer_vr_mode: 'VR-Modus',
    viewer_ipd: 'Augenabstand',
    viewer_play: 'Abspielen',
    viewer_pause: 'Pause',
    viewer_mute: 'Ton aus',
    viewer_unmute: 'Ton an',
    viewer_speed: 'Tempo',
    viewer_no_video_3d: 'Für Videos stehen Split und Schielblick zur Verfügung.',

    // Capture guidance
    guide_step_left: 'LINKS · 1 VON 2',
    guide_step_right: 'RECHTS · 2 VON 2',
    guide_move_right: 'Nach rechts bewegen',
    guide_move_left: 'Nach links bewegen',
    guide_remaining: 'noch {value}',
    guide_ready: 'Position erreicht — auslösen',
    guide_overshoot: 'Etwas zu weit — zurück',
    guide_hold_level: 'iPhone gerade halten',
    guide_tracking_unavailable: 'Bewegungsverfolgung nicht verfügbar',
    guide_tracking_hint: 'Schätze den Abstand mit den Schritt-Hinweisen ab.',
    guide_target: 'Ziel',
    guide_moved: 'Bewegt',
    guide_auto_capture: 'Auto-Auslöser',
    capture_retake: 'Neu beginnen',
    capture_left_hint: 'Motiv mittig, iPhone waagerecht, auslösen.',

    // LiDAR
    lidar_title: 'LiDAR-ABSTAND',
    lidar_measure: 'Mit LiDAR messen',
    lidar_back_to_camera: 'Zurück zur Kamera',
    lidar_unavailable: 'LiDAR nicht verfügbar',
    lidar_unavailable_hint: 'Wähle einen Abstand über die Voreinstellungen.',
    lidar_aim: 'Auf Motiv zielen',
    lidar_use_distance: 'Abstand übernehmen',
    lidar_confidence_low: 'GERINGE GENAUIGKEIT',
    lidar_confidence_medium: 'MITTLERE GENAUIGKEIT',
    lidar_confidence_high: 'HOHE GENAUIGKEIT',
    subject_label: 'Motiv',
    stereo_base_label: 'STEREOBASIS',

    // Import
    import_sheet_subtitle: 'Wähle das tatsächliche Quellformat',
    import_apple_title: 'Apple Spatial Foto oder Video',
    import_apple_detail: 'HEIC-Stereopaar oder MV-HEVC vom iPhone',
    import_sbs_title: 'Side-by-Side-Bild',
    import_sbs_detail: 'Ein Bild mit linker und rechter Ansicht',
    import_dual_title: 'Zwei Fotos',
    import_dual_detail: 'Erst linkes, dann rechtes Bild wählen',
    import_note: 'Medien werden vor dem Import geprüft. Normale Fotos werden nicht stillschweigend als Side-by-Side behandelt.',
    import_inspecting: 'Räumliche Medien werden geprüft…',
    import_extracting_photo: 'Linkes und rechtes Bild werden extrahiert…',
    import_decoding_video: 'MV-HEVC wird in zwei Videospuren dekodiert…',
    import_splitting_sbs: 'Side-by-Side-Bild wird geteilt…',
    import_processing: 'Wird verarbeitet',
    import_not_spatial_title: 'Kein Apple-Spatial-Medium',
    import_not_spatial_body: 'Nutze „Side-by-Side-Bild“ für ein SBS-Foto oder „Zwei Fotos“ für ein Stereopaar.',
    import_failed: 'Import fehlgeschlagen',
    import_photos_permission: 'Zugriff auf Fotos erforderlich',
    import_photos_permission_body: 'Erlaube den Zugriff, um räumliche und stereoskopische Medien zu importieren.',
    import_wide_warning_title: 'Vermutlich kein Side-by-Side',
    import_wide_warning_body: 'Das Bild ist nicht besonders breit. Es kann trotzdem geteilt werden — prüfe das Ergebnis.',

    // Export
    export_sheet_title: 'Exportieren',
    export_saved_title: 'Gesichert',
    export_saved_body: 'Der Export wurde zu „Fotos“ hinzugefügt.',
    export_failed: 'Export fehlgeschlagen',
    export_demo_blocked_title: 'Beispielszene',
    export_demo_blocked_body: 'Mitgelieferte Beispiele sind Vektorgrafiken und lassen sich nicht exportieren. Nimm ein Stereopaar auf oder importiere eines.',
    export_video_note: 'Räumliche MV-HEVC-Videos werden beim Import in echte Augenspuren zerlegt. Exportiert wird die jeweils gewählte Spur.',
    export_save_library_short: 'In Fotos sichern',
    export_share_short: 'Teilen',

    // Review
    review_name_placeholder: 'Name der 3D-Aufnahme',

    // Settings
    settings_capture_section: 'AUFNAHME',
    settings_language_section: 'SPRACHE',
    settings_about_section: 'ÜBER',
    settings_auto_capture: 'Auto-Auslöser bei Zielposition',
    settings_level_tolerance: 'Waagerecht-Toleranz',
    settings_lidar_row: 'LiDAR-Abstand',
    settings_lidar_value: 'Automatisch, wenn verfügbar',
    settings_stereo_base_row: 'Stereobasis',
    settings_stereo_base_value: 'Automatisch',
    settings_open_ios: 'iOS-Einstellungen öffnen',
    settings_footnote: 'Der Stereoabstand ist eine Komfortempfehlung, kein festes Gesetz. Nahe Motive werden begrenzt, weite Szenen dürfen bewusst Hyperstereo nutzen.',

    // Camera permission
    tab_studio_short: 'Studio',
    tab_library_short: 'Mediathek',
    meta_baseline: 'Stereobasis',
    meta_distance: 'Motivabstand',
    meta_created: 'Aufgenommen',
    meta_source: 'Quelle',
    meta_unknown: '—',
    library_import_cta: 'Medien importieren',
    library_grid_hint: 'Tippen zum Öffnen, halten für Optionen.',
    studio_open_in_library: 'In der Mediathek zeigen',
    source_imported_spatial: 'Apple Spatial',
    source_imported_sbs: 'Side-by-Side',
    source_imported_dual: 'Zwei Fotos',
    source_camera: 'Kamera-Aufnahme',
    guide_unreliable: 'Bewegungsverfolgung unsicher',
    guide_unreliable_hint: 'Mehr Licht oder mehr Struktur im Bild hilft.',
    import_transcoded_title: 'Original nicht verfügbar',
    import_transcoded_body: 'iOS hat eine konvertierte Kopie geliefert, dabei gehen die Spatial-Daten verloren. Erlaube in den Einstellungen den vollen Fotozugriff („Alle Fotos“) und versuche es erneut.',
    camera_permission_allow: 'Kamera erlauben',
    camera_permission_body: 'Spatial3D benötigt die rückseitige Kamera für stereoskopische Aufnahmen.',
    camera_error_title: 'Kamerafehler',
    camera_error_body: 'Das Foto konnte nicht aufgenommen werden.',
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

    // Studio shell
    studio_eyebrow_photo: 'STEREO PHOTO',
    studio_eyebrow_video: 'SPATIAL VIDEO',
    studio_untitled: 'Untitled',
    library_title: 'Library',
    library_count_one: '1 project',
    library_count_other: '{count} projects',
    library_empty_title: 'No captures yet',
    library_empty_body: 'Capture a stereo pair or import a spatial photo.',
    capture_stereo: 'Capture Stereo',
    action_import: 'Import',
    action_export: 'Export',
    action_settings: 'Settings',
    action_delete: 'Delete',
    action_adjust: 'Alignment',
    badge_photo: 'PHOTO',
    badge_video: 'VIDEO',
    badge_demo: 'DEMO',
    badge_captured: 'CAPTURED',
    badge_spatial: 'SPATIAL',
    badge_stereo: 'STEREO',
    source_built_in: 'Built-in sample',
    source_hold_options: 'Hold for options',

    // Viewer controls
    viewer_vr_mode: 'VR mode',
    viewer_ipd: 'Eye separation',
    viewer_play: 'Play',
    viewer_pause: 'Pause',
    viewer_mute: 'Mute',
    viewer_unmute: 'Unmute',
    viewer_speed: 'Speed',
    viewer_no_video_3d: 'Videos support split and cross-eye viewing.',

    // Capture guidance
    guide_step_left: 'LEFT · 1 OF 2',
    guide_step_right: 'RIGHT · 2 OF 2',
    guide_move_right: 'Move right',
    guide_move_left: 'Move left',
    guide_remaining: '{value} to go',
    guide_ready: 'In position — take the shot',
    guide_overshoot: 'Slightly too far — come back',
    guide_hold_level: 'Hold iPhone level',
    guide_tracking_unavailable: 'Motion tracking unavailable',
    guide_tracking_hint: 'Estimate the distance using the step hints.',
    guide_target: 'Target',
    guide_moved: 'Moved',
    guide_auto_capture: 'Auto shutter',
    capture_retake: 'Start over',
    capture_left_hint: 'Centre the subject, hold level, shoot.',

    // LiDAR
    lidar_title: 'LiDAR DISTANCE',
    lidar_measure: 'Measure with LiDAR',
    lidar_back_to_camera: 'Back to camera',
    lidar_unavailable: 'LiDAR unavailable',
    lidar_unavailable_hint: 'Pick a distance from the presets instead.',
    lidar_aim: 'Aim at the subject',
    lidar_use_distance: 'Use this distance',
    lidar_confidence_low: 'LOW CONFIDENCE',
    lidar_confidence_medium: 'MEDIUM CONFIDENCE',
    lidar_confidence_high: 'HIGH CONFIDENCE',
    subject_label: 'subject',
    stereo_base_label: 'STEREO BASE',

    // Import
    import_sheet_subtitle: 'Choose the actual source format',
    import_apple_title: 'Apple spatial photo or video',
    import_apple_detail: 'HEIC stereo pair or MV-HEVC from iPhone',
    import_sbs_title: 'Side-by-side image',
    import_sbs_detail: 'One image containing left and right views',
    import_dual_title: 'Two photos',
    import_dual_detail: 'Select the left image, then the right',
    import_note: 'Media is inspected before import. Ordinary photos are not silently treated as side-by-side.',
    import_inspecting: 'Inspecting spatial media…',
    import_extracting_photo: 'Extracting left and right images…',
    import_decoding_video: 'Decoding MV-HEVC into two eye tracks…',
    import_splitting_sbs: 'Splitting side-by-side image…',
    import_processing: 'Processing',
    import_not_spatial_title: 'Not Apple spatial media',
    import_not_spatial_body: 'Choose “Side-by-side image” for an SBS photo, or “Two photos” for a stereo pair.',
    import_failed: 'Import failed',
    import_photos_permission: 'Photos access required',
    import_photos_permission_body: 'Allow access to import spatial and stereo media.',
    import_wide_warning_title: 'This may not be side-by-side',
    import_wide_warning_body: 'The image is not especially wide. It can still be split — verify the result.',

    // Export
    export_sheet_title: 'Export',
    export_saved_title: 'Saved',
    export_saved_body: 'The export was added to Photos.',
    export_failed: 'Export failed',
    export_demo_blocked_title: 'Sample scene',
    export_demo_blocked_body: 'Built-in samples are vector graphics and cannot be exported. Capture or import a stereo pair instead.',
    export_video_note: 'Spatial MV-HEVC is decoded into real eye tracks on import. The selected track is what gets exported.',
    export_save_library_short: 'Save to Photos',
    export_share_short: 'Share',

    // Review
    review_name_placeholder: 'Name this 3D capture',

    // Settings
    settings_capture_section: 'CAPTURE',
    settings_language_section: 'LANGUAGE',
    settings_about_section: 'ABOUT',
    settings_auto_capture: 'Auto shutter at target position',
    settings_level_tolerance: 'Level tolerance',
    settings_lidar_row: 'LiDAR distance',
    settings_lidar_value: 'Automatic when available',
    settings_stereo_base_row: 'Stereo base',
    settings_stereo_base_value: 'Automatic',
    settings_open_ios: 'Open iOS Settings',
    settings_footnote: 'The stereo base is a comfort recommendation, not a fixed law. Near subjects are clamped; distant scenes may intentionally use hyperstereo.',

    // Camera permission
    tab_studio_short: 'Studio',
    tab_library_short: 'Library',
    meta_baseline: 'Stereo base',
    meta_distance: 'Subject distance',
    meta_created: 'Captured',
    meta_source: 'Source',
    meta_unknown: '—',
    library_import_cta: 'Import media',
    library_grid_hint: 'Tap to open, hold for options.',
    studio_open_in_library: 'Show in library',
    source_imported_spatial: 'Apple spatial',
    source_imported_sbs: 'Side-by-side',
    source_imported_dual: 'Two photos',
    source_camera: 'Camera capture',
    guide_unreliable: 'Motion tracking unreliable',
    guide_unreliable_hint: 'More light or more texture in frame will help.',
    import_transcoded_title: 'Original not available',
    import_transcoded_body: 'iOS handed over a converted copy, which loses the spatial data. Allow full photo access ("All Photos") in Settings and try again.',
    camera_permission_allow: 'Allow camera',
    camera_permission_body: 'Spatial3D needs the rear camera for stereoscopic capture.',
    camera_error_title: 'Camera error',
    camera_error_body: 'The photo could not be captured.',
  },
};

export type TranslationKey = keyof typeof TRANSLATIONS['de'];

let currentLanguage: LanguageCode = 'de';

const listeners = new Set<() => void>();

export function setLanguage(lang: LanguageCode) {
  if (lang === currentLanguage) return;
  currentLanguage = lang;
  listeners.forEach((listener) => listener());
}

export function getLanguage(): LanguageCode {
  return currentLanguage;
}

/** Subscription plumbing for `useTranslation`, which drives re-renders. */
export function subscribeToLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Resolves a key in the active language, falling back to German. Values may
 * contain `{name}` placeholders that are substituted from `params`.
 */
export function t(
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  const dict = TRANSLATIONS[currentLanguage] ?? TRANSLATIONS.de;
  const fallback = TRANSLATIONS.de as Record<string, string>;
  let value = (dict as Record<string, string>)[key] ?? fallback[key] ?? key;

  if (params) {
    for (const [name, replacement] of Object.entries(params)) {
      value = value.replace(`{${name}}`, String(replacement));
    }
  }

  return value;
}
