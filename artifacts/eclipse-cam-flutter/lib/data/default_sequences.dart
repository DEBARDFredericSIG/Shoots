import '../models/models.dart';

/// Séquence Éclipse Totale par défaut — 15 étapes du C1 au C4.
const eclipseSequence = Sequence(
  id: 'default-eclipse-totality',
  name: 'Éclipse Totale',
  mode: AppMode.eclipse,
  description:
      'Séquence complète du 1er au 4e contact — phases partielles, totalité et perles de Baily',
  isDefault: true,
  createdAt: 0,
  steps: [
    ExposureStep(
      id: 'e1', name: '1er Contact (C1)',
      iso: 100, shutterSpeed: '1/1000', aperture: 'f/8',
      shotCount: 3, intervalMs: 120000,
      focusMode: FocusMode.infinity,
      notes: 'Début phase partielle — filtre solaire requis',
    ),
    ExposureStep(
      id: 'e2', name: 'Phase partielle 25%',
      iso: 100, shutterSpeed: '1/750', aperture: 'f/8',
      shotCount: 3, intervalMs: 180000,
      focusMode: FocusMode.infinity,
    ),
    ExposureStep(
      id: 'e3', name: 'Phase partielle 50%',
      iso: 100, shutterSpeed: '1/500', aperture: 'f/8',
      shotCount: 3, intervalMs: 180000,
      focusMode: FocusMode.infinity,
    ),
    ExposureStep(
      id: 'e4', name: 'Phase partielle 75%',
      iso: 100, shutterSpeed: '1/250', aperture: 'f/8',
      shotCount: 3, intervalMs: 120000,
      focusMode: FocusMode.infinity,
    ),
    ExposureStep(
      id: 'e5', name: 'Phase partielle 90%',
      iso: 100, shutterSpeed: '1/125', aperture: 'f/8',
      shotCount: 3, intervalMs: 60000,
      focusMode: FocusMode.nearInfinity,
    ),
    ExposureStep(
      id: 'e6', name: 'Perles de Baily',
      iso: 100, shutterSpeed: '1/2000', aperture: 'f/8',
      shotCount: 10, intervalMs: 2000,
      focusMode: FocusMode.nearInfinity,
      notes: '⚠️ Retirer le filtre solaire maintenant !',
    ),
    ExposureStep(
      id: 'e7', name: 'Anneau de Diamant',
      iso: 100, shutterSpeed: '1/500', aperture: 'f/8',
      shotCount: 10, intervalMs: 1500,
      focusMode: FocusMode.nearInfinity,
    ),
    ExposureStep(
      id: 'e8', name: 'Totalité — Couronne large',
      iso: 400, shutterSpeed: '1/250', aperture: 'f/5.6',
      shotCount: 5, intervalMs: 5000,
      focusMode: FocusMode.infinity,
    ),
    ExposureStep(
      id: 'e9', name: 'Totalité — Protubérances',
      iso: 400, shutterSpeed: '1/1000', aperture: 'f/5.6',
      shotCount: 5, intervalMs: 4000,
      focusMode: FocusMode.nearInfinity,
    ),
    ExposureStep(
      id: 'e10', name: 'Couronne étendue',
      iso: 800, shutterSpeed: '1/30', aperture: 'f/5.6',
      shotCount: 5, intervalMs: 8000,
      focusMode: FocusMode.infinity,
    ),
    ExposureStep(
      id: 'e11', name: 'Lumière cendrée',
      iso: 3200, shutterSpeed: '2s', aperture: 'f/4',
      shotCount: 3, intervalMs: 15000,
      focusMode: FocusMode.hyperfocal,
      notes: 'Trépied essentiel — mise au point hyperfocale',
    ),
    ExposureStep(
      id: 'e12', name: '2e Anneau de Diamant',
      iso: 100, shutterSpeed: '1/500', aperture: 'f/8',
      shotCount: 10, intervalMs: 1500,
      focusMode: FocusMode.nearInfinity,
      notes: 'Fin de totalité',
    ),
    ExposureStep(
      id: 'e13', name: '2es Perles de Baily',
      iso: 100, shutterSpeed: '1/2000', aperture: 'f/8',
      shotCount: 8, intervalMs: 2000,
      focusMode: FocusMode.nearInfinity,
      notes: '⚠️ Remettre le filtre solaire !',
    ),
    ExposureStep(
      id: 'e14', name: '3e Contact (C3)',
      iso: 100, shutterSpeed: '1/500', aperture: 'f/8',
      shotCount: 3, intervalMs: 120000,
      focusMode: FocusMode.infinity,
    ),
    ExposureStep(
      id: 'e15', name: '4e Contact (C4)',
      iso: 100, shutterSpeed: '1/1000', aperture: 'f/8',
      shotCount: 3, intervalMs: 60000,
      focusMode: FocusMode.infinity,
      notes: "Fin de l'éclipse",
    ),
  ],
);

/// Séquence Entraînement Lunaire par défaut — 9 étapes.
const moonSequence = Sequence(
  id: 'default-moon-training',
  name: 'Entraînement Lunaire',
  mode: AppMode.moon,
  description:
      "Entraînement nocturne sur la pleine lune — pratique idéale avant l'éclipse",
  isDefault: true,
  createdAt: 0,
  steps: [
    ExposureStep(
      id: 'm1', name: 'Référence pleine lune',
      iso: 100, shutterSpeed: '1/500', aperture: 'f/8',
      shotCount: 5, intervalMs: 10000,
      focusMode: FocusMode.infinity,
    ),
    ExposureStep(
      id: 'm2', name: 'Terminateur (détails)',
      iso: 200, shutterSpeed: '1/250', aperture: 'f/8',
      shotCount: 5, intervalMs: 12000,
      focusMode: FocusMode.nearInfinity,
      notes: 'Contraste maximal au terminateur',
    ),
    ExposureStep(
      id: 'm3', name: 'Bords lunaires',
      iso: 100, shutterSpeed: '1/1000', aperture: 'f/8',
      shotCount: 5, intervalMs: 10000,
      focusMode: FocusMode.infinity,
    ),
    ExposureStep(
      id: 'm4', name: 'Hautes ISO (sim. totalité)',
      iso: 1600, shutterSpeed: '1/2000', aperture: 'f/5.6',
      shotCount: 5, intervalMs: 10000,
      focusMode: FocusMode.nearInfinity,
      notes: 'Simule les conditions de la totalité',
    ),
    ExposureStep(
      id: 'm5', name: 'Bracketing −1 EV',
      iso: 100, shutterSpeed: '1/1000', aperture: 'f/8',
      shotCount: 3, intervalMs: 8000,
      focusMode: FocusMode.infinity,
    ),
    ExposureStep(
      id: 'm6', name: 'Bracketing 0 EV',
      iso: 100, shutterSpeed: '1/500', aperture: 'f/8',
      shotCount: 3, intervalMs: 8000,
      focusMode: FocusMode.infinity,
    ),
    ExposureStep(
      id: 'm7', name: 'Bracketing +1 EV',
      iso: 100, shutterSpeed: '1/250', aperture: 'f/8',
      shotCount: 3, intervalMs: 8000,
      focusMode: FocusMode.infinity,
    ),
    ExposureStep(
      id: 'm8', name: 'Pose longue — cratères',
      iso: 200, shutterSpeed: '1/60', aperture: 'f/8',
      shotCount: 5, intervalMs: 20000,
      focusMode: FocusMode.nearInfinity,
    ),
    ExposureStep(
      id: 'm9', name: 'Hyperfocale test',
      iso: 400, shutterSpeed: '1/30', aperture: 'f/4',
      shotCount: 3, intervalMs: 15000,
      focusMode: FocusMode.hyperfocal,
      notes: 'Trépied requis',
    ),
  ],
);

/// Liste des deux séquences par défaut.
const defaultSequences = [eclipseSequence, moonSequence];
