import 'dart:math';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Anneau SVG de compte à rebours animé — équivalent du CountdownRing React Native.
class CountdownRing extends StatelessWidget {
  final int totalMs;
  final int remainingMs;
  final double size;

  const CountdownRing({
    super.key,
    required this.totalMs,
    required this.remainingMs,
    this.size = 180,
  });

  @override
  Widget build(BuildContext context) {
    final progress =
        totalMs > 0 ? (remainingMs / totalMs).clamp(0.0, 1.0) : 1.0;
    final ratio = totalMs > 0 ? remainingMs / totalMs : 1.0;

    final Color ringColor;
    if (ratio < 0.15) {
      ringColor = AppColors.shootFlash;
    } else if (ratio < 0.35) {
      ringColor = AppColors.corona;
    } else {
      ringColor = AppColors.primary;
    }

    final seconds = (remainingMs / 1000).ceil().clamp(0, 9999);
    final displayText = remainingMs <= 0
        ? '!'
        : seconds >= 60
            ? '${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')}'
            : '$seconds';
    final subText = remainingMs <= 0
        ? 'DÉCLENCHEZ'
        : seconds >= 60
            ? 'min'
            : 'sec';

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: Size(size, size),
            painter: _RingPainter(
              progress: progress,
              trackColor: AppColors.border,
              progressColor: ringColor,
              strokeWidth: size * 0.044,
            ),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                displayText,
                style: TextStyle(
                  fontSize: size * 0.28,
                  fontWeight: FontWeight.w700,
                  color: AppColors.foreground,
                  height: 1.1,
                  letterSpacing: -2,
                ),
              ),
              Text(
                subText,
                style: TextStyle(
                  fontSize: size * 0.065,
                  fontWeight: FontWeight.w600,
                  color: AppColors.mutedForeground,
                  letterSpacing: 2,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  final double progress;
  final Color trackColor;
  final Color progressColor;
  final double strokeWidth;

  const _RingPainter({
    required this.progress,
    required this.trackColor,
    required this.progressColor,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;
    final rect   = Rect.fromCircle(center: center, radius: radius);

    final trackPaint = Paint()
      ..color      = trackColor
      ..strokeWidth = strokeWidth
      ..style       = PaintingStyle.stroke
      ..strokeCap   = StrokeCap.round;
    canvas.drawCircle(center, radius, trackPaint);

    if (progress > 0) {
      final progressPaint = Paint()
        ..color      = progressColor
        ..strokeWidth = strokeWidth
        ..style       = PaintingStyle.stroke
        ..strokeCap   = StrokeCap.round;
      canvas.drawArc(rect, -pi / 2, 2 * pi * progress, false, progressPaint);
    }
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.progress != progress || old.progressColor != progressColor;
}
