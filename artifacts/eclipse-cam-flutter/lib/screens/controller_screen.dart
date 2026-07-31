import 'dart:async';
import 'dart:io';
import 'package:camerawesome/camerawesome_plugin.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:gal/gal.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../models/models.dart';
import '../providers/app_state.dart';
import '../theme/app_colors.dart';
import '../widgets/countdown_ring.dart';

const _uuid = Uuid();

// ── Badge de mode de mise au point ────────────────────────────────────────────

class _FocusBadge extends StatelessWidget {
  final FocusMode mode;
  final bool large;
  const _FocusBadge({required this.mode, this.large = false});

  @override
  Widget build(BuildContext context) {
    final Color bg, fg;
    switch (mode) {
      case FocusMode.infinity:
        bg = const Color(0xFF1A2E1A); fg = AppColors.focusInfinity;
      case FocusMode.nearInfinity:
        bg = const Color(0xFF1A2536); fg = AppColors.focusNearInfinity;
      case FocusMode.hyperfocal:
        bg = const Color(0xFF2A1F1A); fg = AppColors.focusHyperfocal;
    }
    final fontSize = large ? 12.0 : 10.0;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.lock, size: large ? 11 : 9, color: fg),
          const SizedBox(width: 4),
          Text(mode.label, style: TextStyle(fontSize: fontSize, fontWeight: FontWeight.w600, color: fg)),
        ],
      ),
    );
  }
}

// ── Écran principal ───────────────────────────────────────────────────────────

class ControllerScreen extends StatefulWidget {
  const ControllerScreen({super.key});

  @override
  State<ControllerScreen> createState() => _ControllerScreenState();
}

class _ControllerScreenState extends State<ControllerScreen>
    with TickerProviderStateMixin {

  // ── Camera state (CameraAwesome ref, updated sans setState) ───────────────
  PhotoCameraState? _photoState;
  Size?  _previewSize;
  Rect?  _previewRect;

  // ── Capture async ─────────────────────────────────────────────────────────
  Completer<String?>? _captureCompleter;
  String? _nextCapturePath;

  // ── Séquence running state ────────────────────────────────────────────────
  bool   _isRunning      = false;
  int    _currentStepIdx = 0;
  int    _countdownMs    = 0;
  int    _totalCountdownMs = 0;
  int    _totalShotsFired  = 0;
  int    _simSpeed         = 1; // 1, 60, 300
  Timer? _countdownTimer;
  String? _sessionId;

  // ── Flash animation ───────────────────────────────────────────────────────
  late AnimationController _flashCtrl;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    _flashCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _flashCtrl.dispose();
    super.dispose();
  }

  // ── CameraAwesome callbacks ───────────────────────────────────────────────

  void _onMediaCaptureEvent(MediaCapture event) {
    final completer = _captureCompleter;
    if (completer == null || completer.isCompleted) return;

    if (event.status == MediaCaptureStatus.success) {
      String? path;
      try {
        event.captureRequest.when(
          single:   (s) => path = s.file?.path,
          multiple: (_) => path = _nextCapturePath,
        );
      } catch (_) {
        path = _nextCapturePath;
      }
      completer.complete(path ?? _nextCapturePath);
    } else if (event.status == MediaCaptureStatus.failure) {
      completer.complete(null);
    }
  }

  // ── Exposure & focus ──────────────────────────────────────────────────────

  Future<void> _applyExposure(ExposureStep step) async {
    final ps = _photoState;
    if (ps == null) return;
    try {
      // ISO réel via Camera2 SENSOR_SENSITIVITY
      await ps.sensorConfig.setISO(step.iso.toDouble());

      // Temps de pose réel via Camera2 SENSOR_EXPOSURE_TIME (nanosecondes)
      final ns = shutterToNanos(step.shutterSpeed);
      await CamerawesomePlugin.setSensorExposureTime(ns.toDouble());
    } catch (e) {
      debugPrint('[EclipseCam] Exposure control unavailable: $e');
    }
  }

  Future<void> _applyFocus(FocusMode mode) async {
    final ps  = _photoState;
    final sz  = _previewSize;
    final rc  = _previewRect;
    if (ps == null || sz == null || rc == null) return;
    try {
      if (mode == FocusMode.hyperfocal) {
        // Autofocus continu — point central
        await ps.sensorConfig.setFocusPoint(
          Offset(sz.width / 2, sz.height / 2),
          sz,
          rc,
        );
      } else {
        // Infini : coin supérieur (ciel/horizon)
        // Quasi-infini : tiers supérieur
        final yRatio = mode == FocusMode.infinity ? 0.08 : 0.25;
        await ps.sensorConfig.setFocusPoint(
          Offset(sz.width / 2, sz.height * yRatio),
          sz,
          rc,
        );
      }
    } catch (e) {
      debugPrint('[EclipseCam] Focus control unavailable: $e');
    }
  }

  // ── Photo capture ─────────────────────────────────────────────────────────

  Future<String?> _takePicture() async {
    final ps = _photoState;
    if (ps == null) return null;

    final dir = await getTemporaryDirectory();
    _nextCapturePath =
        '${dir.path}/eclipse_${DateTime.now().millisecondsSinceEpoch}.jpg';
    _captureCompleter = Completer<String?>();

    await ps.takePhoto();

    return _captureCompleter!.future.timeout(
      const Duration(seconds: 5),
      onTimeout: () => _nextCapturePath,
    );
  }

  // ── Countdown ────────────────────────────────────────────────────────────

  Future<void> _countdown(int ms) async {
    final completer = Completer<void>();
    final adjusted  = (ms / _simSpeed).round();

    if (adjusted <= 0) {
      if (mounted) setState(() { _countdownMs = 0; _totalCountdownMs = 0; });
      completer.complete();
      return completer.future;
    }

    var remaining = adjusted;
    if (mounted) {
      setState(() {
        _countdownMs      = remaining;
        _totalCountdownMs = adjusted;
      });
    }

    _countdownTimer?.cancel();
    _countdownTimer =
        Timer.periodic(const Duration(milliseconds: 100), (timer) {
      if (!_isRunning) {
        timer.cancel();
        if (!completer.isCompleted) completer.complete();
        return;
      }
      remaining -= 100;
      if (remaining <= 0) {
        timer.cancel();
        if (mounted) setState(() => _countdownMs = 0);
        if (!completer.isCompleted) completer.complete();
      } else {
        if (mounted) setState(() => _countdownMs = remaining);
      }
    });

    return completer.future;
  }

  // ── Séquence runner ───────────────────────────────────────────────────────

  Future<void> _runSequence() async {
    final appState = context.read<AppState>();
    final sequence = appState.selectedSequence;
    if (sequence == null) return;

    final sessionId = _uuid.v4();
    _sessionId = sessionId;

    setState(() {
      _isRunning       = true;
      _currentStepIdx  = 0;
      _totalShotsFired = 0;
    });

    appState.addSession(Session(
      id:           sessionId,
      sequenceId:   sequence.id,
      sequenceName: sequence.name,
      mode:         sequence.mode,
      startedAt:    DateTime.now().millisecondsSinceEpoch,
      shots:        const [],
      status:       SessionStatus.running,
      totalSteps:   sequence.steps.length,
      completedSteps: 0,
    ));

    final shots = <CapturedShot>[];

    for (int si = 0; si < sequence.steps.length; si++) {
      if (!_isRunning) break;
      final step = sequence.steps[si];

      if (mounted) setState(() => _currentStepIdx = si);

      // Appliquer l'exposition et le focus pour cette étape
      await _applyExposure(step);
      await _applyFocus(step.focusMode);

      for (int pi = 0; pi < step.shotCount; pi++) {
        if (!_isRunning) break;

        // Compte à rebours
        await _countdown(step.intervalMs);
        if (!_isRunning) break;

        // Déclenchement : haptic + flash visuel
        HapticFeedback.heavyImpact();
        _flashCtrl.forward(from: 1.0).then((_) => _flashCtrl.reverse());

        // Capture
        final filePath = await _takePicture();

        // Sauvegarde dans la galerie
        if (filePath != null && await File(filePath).exists()) {
          try {
            await Gal.putImage(filePath, album: 'Eclipse Cam');
          } catch (_) {}
        }

        shots.add(CapturedShot(
          id:           _uuid.v4(),
          stepName:     step.name,
          iso:          step.iso,
          shutterSpeed: step.shutterSpeed,
          aperture:     step.aperture,
          focusMode:    step.focusMode,
          timestamp:    DateTime.now().millisecondsSinceEpoch,
          filePath:     filePath,
        ));

        if (mounted) setState(() => _totalShotsFired++);
        appState.updateSession(sessionId,
            shots: [...shots], completedSteps: si);
      }
    }

    final finalStatus =
        _isRunning ? SessionStatus.completed : SessionStatus.cancelled;

    appState.updateSession(sessionId,
        shots:          shots,
        completedSteps: sequence.steps.length,
        status:         finalStatus,
        completedAt:    DateTime.now().millisecondsSinceEpoch);

    if (finalStatus == SessionStatus.completed) {
      HapticFeedback.heavyImpact();
    }

    if (mounted) {
      setState(() {
        _isRunning       = false;
        _currentStepIdx  = 0;
        _countdownMs     = 0;
        _totalShotsFired = 0;
      });
    }
  }

  void _stopSequence() {
    setState(() => _isRunning = false);
    _countdownTimer?.cancel();
  }

  // ── UI builders ───────────────────────────────────────────────────────────

  Widget _buildCameraOverlay(AppState appState) {
    final sequence   = appState.selectedSequence;
    final modeColor  = appState.activeMode == AppMode.eclipse
        ? AppColors.primary
        : AppColors.accent;
    final currentStep =
        sequence != null && _currentStepIdx < sequence.steps.length
            ? sequence.steps[_currentStepIdx]
            : null;

    return Stack(
      fit: StackFit.expand,
      children: [
        // ── Overlay séquence en cours ────────────────────────────────────
        if (_isRunning && currentStep != null)
          Container(
            color: Colors.black54,
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      currentStep.name,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    CountdownRing(
                      totalMs:     _totalCountdownMs,
                      remainingMs: _countdownMs,
                      size: 180,
                    ),
                    const SizedBox(height: 16),
                    // Réglages exposition
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _ExposureBox(label: 'ISO ✓', value: '${currentStep.iso}'),
                        const SizedBox(width: 8),
                        _ExposureBox(label: 'VITESSE ✓', value: currentStep.shutterSpeed),
                        const SizedBox(width: 8),
                        _ExposureBox(label: 'OUVERTURE ~', value: currentStep.aperture, muted: true),
                      ],
                    ),
                    const SizedBox(height: 10),
                    _FocusBadge(mode: currentStep.focusMode, large: true),
                    if (currentStep.notes != null) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF2A1F0A),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.corona.withOpacity(0.4)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.warning_amber_outlined, size: 14, color: AppColors.corona),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(currentStep.notes!,
                                  style: const TextStyle(
                                      fontSize: 12, color: AppColors.corona)),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    // Progression
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Étape ',
                          style: const TextStyle(
                              fontSize: 13, color: Colors.white54),
                        ),
                        Text(
                          '${_currentStepIdx + 1}',
                          style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: Colors.white),
                        ),
                        Text(
                          '/${sequence!.steps.length}',
                          style: const TextStyle(
                              fontSize: 13, color: Colors.white54),
                        ),
                        Container(
                          width: 4, height: 4,
                          margin: const EdgeInsets.symmetric(horizontal: 8),
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white30,
                          ),
                        ),
                        Text(
                          'Photo ',
                          style: const TextStyle(
                              fontSize: 13, color: Colors.white54),
                        ),
                        Text(
                          '$_totalShotsFired',
                          style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: modeColor),
                        ),
                        Text(
                          '/${sequence.totalShots}',
                          style: const TextStyle(
                              fontSize: 13, color: Colors.white54),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),

        // ── Réticule (repos) ─────────────────────────────────────────────
        if (!_isRunning) ...[
          Center(
            child: SizedBox(
              width: 60, height: 60,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Container(width: 60, height: 1, color: modeColor.withOpacity(0.6)),
                  Container(width: 1, height: 60, color: modeColor.withOpacity(0.6)),
                ],
              ),
            ),
          ),
          if (sequence != null)
            Positioned(
              bottom: 14, left: 14, right: 14,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 14),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.6),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: modeColor.withOpacity(0.4)),
                ),
                child: Text(
                  '${sequence.name} • ${sequence.totalShots} photos',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: modeColor),
                ),
              ),
            ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState   = context.watch<AppState>();
    final sequence   = appState.selectedSequence;
    final modeColor  = appState.activeMode == AppMode.eclipse
        ? AppColors.primary
        : AppColors.accent;
    final insets     = MediaQuery.of(context).padding;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // ── Viseur plein écran (CameraAwesome) ──────────────────────────
          Positioned.fill(
            child: CameraAwesomeBuilder.custom(
              sensorConfig: SensorConfig.single(
                sensor:      Sensor.position(SensorPosition.back),
                flashMode:   FlashMode.none,
                aspectRatio: CameraAspectRatios.ratio_4_3,
                zoom:        0.0,
              ),
              saveConfig: SaveConfig.photo(
                pathBuilder: (sensors) async {
                  final path = _nextCapturePath ??
                      '${(await getTemporaryDirectory()).path}/eclipse_temp.jpg';
                  return SingleCaptureRequest(path, sensors.first);
                },
              ),
              onMediaCaptureEvent: _onMediaCaptureEvent,
              builder: (cameraState, preview) {
                // Stocker le state sans déclencher de rebuild
                if (cameraState is PhotoCameraState) {
                  _photoState  = cameraState;
                  _previewSize = preview.previewSize;
                  _previewRect = preview.previewRect;
                }
                return _buildCameraOverlay(appState);
              },
            ),
          ),

          // ── Flash de déclenchement ───────────────────────────────────────
          Positioned.fill(
            child: IgnorePointer(
              child: AnimatedBuilder(
                animation: _flashCtrl,
                builder: (_, __) => Container(
                  color: AppColors.primary.withOpacity(_flashCtrl.value * 0.9),
                ),
              ),
            ),
          ),

          // ── Header ───────────────────────────────────────────────────────
          Positioned(
            top: insets.top + 8,
            left: 16, right: 16,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Mode toggle
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.secondary,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      for (final m in AppMode.values)
                        GestureDetector(
                          onTap: _isRunning
                              ? null
                              : () => appState.setActiveMode(m),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 7),
                            decoration: BoxDecoration(
                              color: appState.activeMode == m
                                  ? (m == AppMode.eclipse
                                      ? AppColors.primary
                                      : AppColors.accent)
                                      .withOpacity(0.13)
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(9),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  m == AppMode.eclipse
                                      ? Icons.wb_sunny
                                      : Icons.nightlight_round,
                                  size: 14,
                                  color: appState.activeMode == m
                                      ? (m == AppMode.eclipse
                                          ? AppColors.primary
                                          : AppColors.accent)
                                      : AppColors.mutedForeground,
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  m == AppMode.eclipse ? 'ÉCLIPSE' : 'LUNE',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: appState.activeMode == m
                                        ? (m == AppMode.eclipse
                                            ? AppColors.primary
                                            : AppColors.accent)
                                        : AppColors.mutedForeground,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),

                // Vitesse / EN COURS
                if (!_isRunning)
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.secondary,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      children: [
                        for (final spd in [1, 60, 300])
                          GestureDetector(
                            onTap: () =>
                                setState(() => _simSpeed = spd),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 7),
                              decoration: BoxDecoration(
                                color: _simSpeed == spd
                                    ? AppColors.muted
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(9),
                              ),
                              child: Text(
                                spd == 1
                                    ? '1×'
                                    : spd == 60
                                        ? '60×'
                                        : '300×',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: _simSpeed == spd
                                      ? AppColors.foreground
                                      : AppColors.mutedForeground,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: AppColors.primary.withOpacity(0.5)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 7, height: 7,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Text('EN COURS',
                            style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                                letterSpacing: 1)),
                      ],
                    ),
                  ),
              ],
            ),
          ),

          // ── Séquence sélectionnée (repos) ────────────────────────────────
          if (!_isRunning && sequence != null)
            Positioned(
              top: insets.top + 60,
              left: 16, right: 16,
              child: GestureDetector(
                onTap: () => DefaultTabController.of(context),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppColors.card.withOpacity(0.92),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        appState.activeMode == AppMode.eclipse
                            ? Icons.wb_sunny
                            : Icons.nightlight_round,
                        size: 20, color: modeColor,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(sequence.name,
                                style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.foreground)),
                            Text(
                              '${sequence.steps.length} étapes • '
                              '${sequence.totalShots} photos • '
                              '${formatDuration(sequence.totalTimeMs)}'
                              '${_simSpeed > 1 ? ' (${formatDuration(sequence.totalTimeMs ~/ _simSpeed)} à ${_simSpeed}×)' : ''}',
                              style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.mutedForeground),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.keyboard_arrow_down,
                          size: 16, color: AppColors.mutedForeground),
                    ],
                  ),
                ),
              ),
            ),

          // ── Bouton démarrer / arrêter ─────────────────────────────────────
          Positioned(
            bottom: insets.bottom + 16,
            left: 16, right: 16,
            child: !_isRunning
                ? GestureDetector(
                    onTap: sequence != null ? _runSequence : null,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      decoration: BoxDecoration(
                        color: sequence != null
                            ? modeColor
                            : AppColors.muted,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.play_arrow,
                            size: 22,
                            color: sequence != null
                                ? Colors.white
                                : AppColors.mutedForeground,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'DÉMARRER LA SÉQUENCE',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: sequence != null
                                  ? Colors.white
                                  : AppColors.mutedForeground,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : GestureDetector(
                    onTap: _stopSequence,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      decoration: BoxDecoration(
                        color: AppColors.destructive,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.stop, size: 20, color: Colors.white),
                          SizedBox(width: 6),
                          Text('ARRÊTER',
                              style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white)),
                        ],
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

// ── Widget boîte d'exposition ─────────────────────────────────────────────────

class _ExposureBox extends StatelessWidget {
  final String label;
  final String value;
  final bool muted;
  const _ExposureBox({required this.label, required this.value, this.muted = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: muted
            ? Colors.black26
            : Colors.black.withOpacity(0.6),
        borderRadius: BorderRadius.circular(10),
        border: muted
            ? Border.all(color: Colors.white12)
            : Border.all(color: Colors.white24),
      ),
      child: Column(
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  color: Colors.white54,
                  letterSpacing: 0.5)),
          const SizedBox(height: 2),
          Text(value,
              style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: Colors.white)),
        ],
      ),
    );
  }
}
