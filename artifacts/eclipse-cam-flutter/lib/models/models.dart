import 'dart:convert';

// ── Enums ────────────────────────────────────────────────────────────────────

enum FocusMode { infinity, nearInfinity, hyperfocal }
enum AppMode { eclipse, moon }
enum SessionStatus { running, completed, cancelled }

extension FocusModeExt on FocusMode {
  String get label {
    switch (this) {
      case FocusMode.infinity:     return '∞ Infini';
      case FocusMode.nearInfinity: return '∞− Quasi-infini';
      case FocusMode.hyperfocal:   return '⊕ Hyperfocale';
    }
  }

  String get description {
    switch (this) {
      case FocusMode.infinity:
        return "Mise au point à l'infini — étoiles, soleil, lune";
      case FocusMode.nearInfinity:
        return "Légèrement en deçà de l'infini — corona / protubérances";
      case FocusMode.hyperfocal:
        return 'Distance hyperfocale — profondeur de champ maximale';
    }
  }
}

// ── ExposureStep ─────────────────────────────────────────────────────────────

class ExposureStep {
  final String id;
  final String name;
  final int iso;
  final String shutterSpeed; // ex. '1/1000', '2s'
  final String aperture;     // ex. 'f/8'
  final int shotCount;
  final int intervalMs;      // délai entre déclenchements (ms)
  final FocusMode focusMode;
  final String? notes;

  const ExposureStep({
    required this.id,
    required this.name,
    required this.iso,
    required this.shutterSpeed,
    required this.aperture,
    required this.shotCount,
    required this.intervalMs,
    required this.focusMode,
    this.notes,
  });

  ExposureStep copyWith({
    String? id,
    String? name,
    int? iso,
    String? shutterSpeed,
    String? aperture,
    int? shotCount,
    int? intervalMs,
    FocusMode? focusMode,
    String? notes,
    bool clearNotes = false,
  }) =>
      ExposureStep(
        id:           id           ?? this.id,
        name:         name         ?? this.name,
        iso:          iso          ?? this.iso,
        shutterSpeed: shutterSpeed ?? this.shutterSpeed,
        aperture:     aperture     ?? this.aperture,
        shotCount:    shotCount    ?? this.shotCount,
        intervalMs:   intervalMs   ?? this.intervalMs,
        focusMode:    focusMode    ?? this.focusMode,
        notes:        clearNotes ? null : (notes ?? this.notes),
      );

  Map<String, dynamic> toJson() => {
        'id':           id,
        'name':         name,
        'iso':          iso,
        'shutterSpeed': shutterSpeed,
        'aperture':     aperture,
        'shotCount':    shotCount,
        'intervalMs':   intervalMs,
        'focusMode':    focusMode.name,
        'notes':        notes,
      };

  static ExposureStep fromJson(Map<String, dynamic> j) => ExposureStep(
        id:           j['id'] as String,
        name:         j['name'] as String,
        iso:          j['iso'] as int,
        shutterSpeed: j['shutterSpeed'] as String,
        aperture:     j['aperture'] as String,
        shotCount:    j['shotCount'] as int,
        intervalMs:   j['intervalMs'] as int,
        focusMode: FocusMode.values.firstWhere(
          (f) => f.name == j['focusMode'],
          orElse: () => FocusMode.infinity,
        ),
        notes: j['notes'] as String?,
      );
}

// ── Sequence ─────────────────────────────────────────────────────────────────

class Sequence {
  final String id;
  final String name;
  final AppMode mode;
  final String description;
  final List<ExposureStep> steps;
  final int createdAt;
  final bool isDefault;

  const Sequence({
    required this.id,
    required this.name,
    required this.mode,
    required this.description,
    required this.steps,
    required this.createdAt,
    this.isDefault = false,
  });

  int get totalShots  => steps.fold(0, (s, e) => s + e.shotCount);
  int get totalTimeMs => steps.fold(0, (s, e) => s + e.shotCount * e.intervalMs);

  Sequence copyWith({
    String? id,
    String? name,
    AppMode? mode,
    String? description,
    List<ExposureStep>? steps,
    int? createdAt,
    bool? isDefault,
  }) =>
      Sequence(
        id:          id          ?? this.id,
        name:        name        ?? this.name,
        mode:        mode        ?? this.mode,
        description: description ?? this.description,
        steps:       steps       ?? this.steps,
        createdAt:   createdAt   ?? this.createdAt,
        isDefault:   isDefault   ?? this.isDefault,
      );

  Map<String, dynamic> toJson() => {
        'id':          id,
        'name':        name,
        'mode':        mode.name,
        'description': description,
        'steps':       steps.map((s) => s.toJson()).toList(),
        'createdAt':   createdAt,
        'isDefault':   isDefault,
      };

  static Sequence fromJson(Map<String, dynamic> j) => Sequence(
        id:          j['id'] as String,
        name:        j['name'] as String,
        mode:        AppMode.values.firstWhere(
          (m) => m.name == j['mode'],
          orElse: () => AppMode.eclipse,
        ),
        description: j['description'] as String,
        steps: (j['steps'] as List)
            .map((s) => ExposureStep.fromJson(s as Map<String, dynamic>))
            .toList(),
        createdAt: j['createdAt'] as int,
        isDefault: j['isDefault'] as bool? ?? false,
      );
}

// ── CapturedShot ─────────────────────────────────────────────────────────────

class CapturedShot {
  final String id;
  final String stepName;
  final int iso;
  final String shutterSpeed;
  final String aperture;
  final FocusMode focusMode;
  final int timestamp;
  final String? filePath;

  const CapturedShot({
    required this.id,
    required this.stepName,
    required this.iso,
    required this.shutterSpeed,
    required this.aperture,
    required this.focusMode,
    required this.timestamp,
    this.filePath,
  });

  Map<String, dynamic> toJson() => {
        'id':           id,
        'stepName':     stepName,
        'iso':          iso,
        'shutterSpeed': shutterSpeed,
        'aperture':     aperture,
        'focusMode':    focusMode.name,
        'timestamp':    timestamp,
        'filePath':     filePath,
      };

  static CapturedShot fromJson(Map<String, dynamic> j) => CapturedShot(
        id:           j['id'] as String,
        stepName:     j['stepName'] as String,
        iso:          j['iso'] as int,
        shutterSpeed: j['shutterSpeed'] as String,
        aperture:     j['aperture'] as String,
        focusMode: FocusMode.values.firstWhere(
          (f) => f.name == j['focusMode'],
          orElse: () => FocusMode.infinity,
        ),
        timestamp: j['timestamp'] as int,
        filePath:  j['filePath'] as String?,
      );
}

// ── Session ───────────────────────────────────────────────────────────────────

class Session {
  final String id;
  final String sequenceId;
  final String sequenceName;
  final AppMode mode;
  final int startedAt;
  final int? completedAt;
  final List<CapturedShot> shots;
  final SessionStatus status;
  final int totalSteps;
  final int completedSteps;

  const Session({
    required this.id,
    required this.sequenceId,
    required this.sequenceName,
    required this.mode,
    required this.startedAt,
    this.completedAt,
    required this.shots,
    required this.status,
    required this.totalSteps,
    required this.completedSteps,
  });

  Session copyWith({
    String? id,
    String? sequenceId,
    String? sequenceName,
    AppMode? mode,
    int? startedAt,
    int? completedAt,
    List<CapturedShot>? shots,
    SessionStatus? status,
    int? totalSteps,
    int? completedSteps,
  }) =>
      Session(
        id:             id             ?? this.id,
        sequenceId:     sequenceId     ?? this.sequenceId,
        sequenceName:   sequenceName   ?? this.sequenceName,
        mode:           mode           ?? this.mode,
        startedAt:      startedAt      ?? this.startedAt,
        completedAt:    completedAt    ?? this.completedAt,
        shots:          shots          ?? this.shots,
        status:         status         ?? this.status,
        totalSteps:     totalSteps     ?? this.totalSteps,
        completedSteps: completedSteps ?? this.completedSteps,
      );

  Map<String, dynamic> toJson() => {
        'id':             id,
        'sequenceId':     sequenceId,
        'sequenceName':   sequenceName,
        'mode':           mode.name,
        'startedAt':      startedAt,
        'completedAt':    completedAt,
        'shots':          shots.map((s) => s.toJson()).toList(),
        'status':         status.name,
        'totalSteps':     totalSteps,
        'completedSteps': completedSteps,
      };

  static Session fromJson(Map<String, dynamic> j) => Session(
        id:           j['id'] as String,
        sequenceId:   j['sequenceId'] as String,
        sequenceName: j['sequenceName'] as String,
        mode:         AppMode.values.firstWhere(
          (m) => m.name == j['mode'],
          orElse: () => AppMode.eclipse,
        ),
        startedAt:   j['startedAt'] as int,
        completedAt: j['completedAt'] as int?,
        shots: (j['shots'] as List)
            .map((s) => CapturedShot.fromJson(s as Map<String, dynamic>))
            .toList(),
        status: SessionStatus.values.firstWhere(
          (s) => s.name == j['status'],
          orElse: () => SessionStatus.cancelled,
        ),
        totalSteps:     j['totalSteps'] as int,
        completedSteps: j['completedSteps'] as int,
      );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

String formatDuration(int ms) {
  final h = ms ~/ 3600000;
  final m = (ms % 3600000) ~/ 60000;
  final s = (ms % 60000) ~/ 1000;
  if (h > 0) return '${h}h ${m}min';
  if (m > 0) return s > 0 ? '${m}min ${s}s' : '${m}min';
  return '${s}s';
}

/// "1/1000" → 1 000 000 ns  |  "2s" → 2 000 000 000 ns
int shutterToNanos(String shutter) {
  final s = shutter.trim();
  if (s.contains('/')) {
    final parts = s.split('/');
    final n = double.tryParse(parts[0]) ?? 1.0;
    final d = double.tryParse(parts[1]) ?? 1000.0;
    if (d == 0) return 1000000;
    return ((n / d) * 1e9).round();
  }
  final val = double.tryParse(s.replaceAll(RegExp(r's$', caseSensitive: false), ''));
  return (((val ?? 0.008) * 1e9)).round();
}

// ignore: unused_element — needed by fromJson helpers above
final _jsonCodec = const JsonCodec();
