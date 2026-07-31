import 'package:flutter/material.dart';

/// Palette dark space — miroir du thème React Native original.
class AppColors {
  // ── Fond ──────────────────────────────────────────────────────────────────
  static const background    = Color(0xFF08090E);
  static const card          = Color(0xFF0E1020);
  static const secondary     = Color(0xFF11131E);
  static const muted         = Color(0xFF1A1D2E);
  static const border        = Color(0xFF1E2130);

  // ── Texte ─────────────────────────────────────────────────────────────────
  static const foreground        = Color(0xFFF0F4FF);
  static const mutedForeground   = Color(0xFF8892A4);
  static const primaryForeground = Color(0xFFFFFFFF);

  // ── Modes ─────────────────────────────────────────────────────────────────
  static const primary    = Color(0xFFE8813F); // orange éclipse
  static const accent     = Color(0xFF60B4F8); // bleu lune
  static const corona     = Color(0xFFF5C842); // jaune corona
  static const shootFlash = Color(0xFFEF4444); // rouge déclenchement

  // ── Focus ─────────────────────────────────────────────────────────────────
  static const focusInfinity     = Color(0xFF4ADE80); // vert
  static const focusNearInfinity = Color(0xFF60B4F8); // bleu
  static const focusHyperfocal   = Color(0xFFF5C842); // jaune

  // ── Danger / Succès ───────────────────────────────────────────────────────
  static const destructive = Color(0xFFDC2626);
  static const success     = Color(0xFF4ADE80); // vert succès
}
