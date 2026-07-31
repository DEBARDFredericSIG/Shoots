import 'dart:convert';
import 'package:collection/collection.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../models/models.dart';
import '../data/default_sequences.dart';

const _uuid = Uuid();

const _kSequences = '@eclipse_sequences_v1';
const _kSessions  = '@eclipse_sessions_v1';
const _kSelectedId = '@eclipse_selected_v1';
const _kMode      = '@eclipse_mode_v1';

class AppState extends ChangeNotifier {
  // ── State ──────────────────────────────────────────────────────────────────
  List<Sequence>   _sequences = List.from(defaultSequences);
  List<Session>    _sessions  = [];
  String?          _selectedSequenceId = defaultSequences.first.id;
  AppMode          _activeMode         = AppMode.eclipse;
  bool             _loaded             = false;

  // ── Getters ────────────────────────────────────────────────────────────────
  List<Sequence> get sequences => List.unmodifiable(_sequences);
  List<Session>  get sessions  => List.unmodifiable(_sessions);
  AppMode        get activeMode => _activeMode;
  String?        get selectedSequenceId => _selectedSequenceId;
  bool           get loaded => _loaded;

  Sequence? get selectedSequence =>
      _sequences.firstWhereOrNull((s) => s.id == _selectedSequenceId);

  List<Sequence> sequencesForMode(AppMode mode) =>
      _sequences.where((s) => s.mode == mode).toList();

  // ── Init ───────────────────────────────────────────────────────────────────
  AppState() {
    _load();
  }

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Séquences personnalisées
      final seqRaw = prefs.getString(_kSequences);
      if (seqRaw != null) {
        final custom = (jsonDecode(seqRaw) as List)
            .map((j) => Sequence.fromJson(j as Map<String, dynamic>))
            .where((s) => !s.isDefault)
            .toList();
        _sequences = [...defaultSequences, ...custom];
      }

      // Sessions (jusqu'à 200)
      final sesRaw = prefs.getString(_kSessions);
      if (sesRaw != null) {
        _sessions = (jsonDecode(sesRaw) as List)
            .map((j) => Session.fromJson(j as Map<String, dynamic>))
            .toList();
      }

      // Sélection et mode
      final selId  = prefs.getString(_kSelectedId);
      final modeRaw = prefs.getString(_kMode);
      if (selId != null && _sequences.any((s) => s.id == selId)) {
        _selectedSequenceId = selId;
      }
      if (modeRaw != null) {
        _activeMode = AppMode.values.firstWhere(
          (m) => m.name == modeRaw,
          orElse: () => AppMode.eclipse,
        );
      }
    } catch (e) {
      debugPrint('AppState._load error: $e');
    }
    _loaded = true;
    notifyListeners();
  }

  Future<void> _persist() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final customOnly = _sequences.where((s) => !s.isDefault).toList();
      await prefs.setString(
          _kSequences, jsonEncode(customOnly.map((s) => s.toJson()).toList()));
      await prefs.setString(
          _kSessions,
          jsonEncode(_sessions.take(200).map((s) => s.toJson()).toList()));
      if (_selectedSequenceId != null) {
        await prefs.setString(_kSelectedId, _selectedSequenceId!);
      }
      await prefs.setString(_kMode, _activeMode.name);
    } catch (e) {
      debugPrint('AppState._persist error: $e');
    }
  }

  // ── Séquences ─────────────────────────────────────────────────────────────

  void setActiveMode(AppMode mode) {
    _activeMode = mode;
    // Sélectionner automatiquement la première séquence du mode
    final first = _sequences.firstWhereOrNull((s) => s.mode == mode);
    if (first != null) _selectedSequenceId = first.id;
    notifyListeners();
    _persist();
  }

  void setSelectedSequenceId(String? id) {
    _selectedSequenceId = id;
    notifyListeners();
    _persist();
  }

  String addSequence(Sequence seq) {
    final id = _uuid.v4();
    final newSeq = seq.copyWith(id: id, createdAt: DateTime.now().millisecondsSinceEpoch);
    _sequences = [..._sequences, newSeq];
    _selectedSequenceId = id;
    notifyListeners();
    _persist();
    return id;
  }

  void updateSequence(String id, Sequence updated) {
    _sequences = [
      for (final s in _sequences) s.id == id ? updated : s,
    ];
    notifyListeners();
    _persist();
  }

  void deleteSequence(String id) {
    _sequences = _sequences.where((s) => s.id != id).toList();
    if (_selectedSequenceId == id) {
      final first = _sequences.firstWhereOrNull((s) => s.mode == _activeMode);
      _selectedSequenceId = first?.id;
    }
    notifyListeners();
    _persist();
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  void addSession(Session session) {
    _sessions = [session, ..._sessions];
    notifyListeners();
  }

  void updateSession(
    String id, {
    List<CapturedShot>? shots,
    int? completedSteps,
    SessionStatus? status,
    int? completedAt,
  }) {
    _sessions = [
      for (final s in _sessions)
        s.id == id
            ? s.copyWith(
                shots:          shots          ?? s.shots,
                completedSteps: completedSteps ?? s.completedSteps,
                status:         status         ?? s.status,
                completedAt:    completedAt    ?? s.completedAt,
              )
            : s,
    ];
    notifyListeners();
    if (status == SessionStatus.completed || status == SessionStatus.cancelled) {
      _persist();
    }
  }

  void clearHistory() {
    _sessions = [];
    notifyListeners();
    _persist();
  }
}
