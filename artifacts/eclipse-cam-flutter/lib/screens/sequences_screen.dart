import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../providers/app_state.dart';
import '../theme/app_colors.dart';
import 'sequence_editor_screen.dart';

class SequencesScreen extends StatelessWidget {
  const SequencesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        surfaceTintColor: Colors.transparent,
        title: const Text('Séquences',
            style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.foreground)),
        actions: [
          TextButton.icon(
            onPressed: () => _openEditor(context, null, appState.activeMode),
            icon: const Icon(Icons.add, color: AppColors.primary, size: 18),
            label: const Text('Nouvelle',
                style: TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                    fontSize: 14)),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: [
          for (final mode in AppMode.values) ...[
            _ModeSection(mode: mode),
          ],
        ],
      ),
    );
  }

  void _openEditor(BuildContext context, Sequence? seq, AppMode defaultMode) {
    Navigator.push(
      context,
      MaterialPageRoute(
          builder: (_) => SequenceEditorScreen(
                initial: seq,
                defaultMode: defaultMode,
              )),
    );
  }
}

// ── Section par mode ──────────────────────────────────────────────────────────

class _ModeSection extends StatelessWidget {
  final AppMode mode;
  const _ModeSection({required this.mode});

  @override
  Widget build(BuildContext context) {
    final appState    = context.watch<AppState>();
    final sequences   = appState.sequencesForMode(mode);
    final modeColor   = mode == AppMode.eclipse ? AppColors.primary : AppColors.accent;
    final modeLabel   = mode == AppMode.eclipse ? 'ÉCLIPSE SOLAIRE' : 'ENTRAÎNEMENT LUNAIRE';
    final modeIcon    = mode == AppMode.eclipse ? Icons.wb_sunny : Icons.nightlight_round;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 8, bottom: 10),
          child: Row(
            children: [
              Icon(modeIcon, size: 14, color: modeColor),
              const SizedBox(width: 6),
              Text(modeLabel,
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: modeColor,
                      letterSpacing: 1.2)),
            ],
          ),
        ),
        for (final seq in sequences)
          _SequenceCard(sequence: seq),
        const SizedBox(height: 8),
      ],
    );
  }
}

// ── Carte séquence ────────────────────────────────────────────────────────────

class _SequenceCard extends StatelessWidget {
  final Sequence sequence;
  const _SequenceCard({required this.sequence});

  @override
  Widget build(BuildContext context) {
    final appState   = context.watch<AppState>();
    final isSelected = appState.selectedSequenceId == sequence.id;
    final modeColor  = sequence.mode == AppMode.eclipse
        ? AppColors.primary
        : AppColors.accent;

    return GestureDetector(
      onTap: () {
        appState.setActiveMode(sequence.mode);
        appState.setSelectedSequenceId(sequence.id);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected ? modeColor.withOpacity(0.07) : AppColors.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? modeColor.withOpacity(0.5) : AppColors.border,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            // Indicateur sélection
            Container(
              width: 4, height: 40,
              margin: const EdgeInsets.only(right: 12),
              decoration: BoxDecoration(
                color: isSelected ? modeColor : Colors.transparent,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(sequence.name,
                            style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: isSelected
                                    ? modeColor
                                    : AppColors.foreground)),
                      ),
                      if (sequence.isDefault)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.muted,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text('DÉFAUT',
                              style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.mutedForeground,
                                  letterSpacing: 0.5)),
                        ),
                    ],
                  ),
                  if (sequence.description != null) ...[
                    const SizedBox(height: 2),
                    Text(sequence.description!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.mutedForeground)),
                  ],
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      _Chip('${sequence.steps.length} étapes'),
                      const SizedBox(width: 6),
                      _Chip('${sequence.totalShots} photos'),
                      const SizedBox(width: 6),
                      _Chip(formatDuration(sequence.totalTimeMs)),
                    ],
                  ),
                ],
              ),
            ),
            // Actions
            if (!sequence.isDefault) ...[
              const SizedBox(width: 8),
              Column(
                children: [
                  GestureDetector(
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) =>
                              SequenceEditorScreen(initial: sequence)),
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(7),
                      decoration: BoxDecoration(
                        color: AppColors.muted,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.edit, size: 14,
                          color: AppColors.mutedForeground),
                    ),
                  ),
                  const SizedBox(height: 6),
                  GestureDetector(
                    onTap: () => _confirmDelete(context, appState),
                    child: Container(
                      padding: const EdgeInsets.all(7),
                      decoration: BoxDecoration(
                        color: AppColors.destructive.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.delete_outline, size: 14,
                          color: AppColors.destructive),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _confirmDelete(BuildContext context, AppState appState) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Supprimer ?',
            style: TextStyle(
                fontWeight: FontWeight.w700, color: AppColors.foreground)),
        content: Text(
          'Supprimer "${sequence.name}" définitivement ?',
          style: const TextStyle(color: AppColors.mutedForeground),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler',
                style: TextStyle(color: AppColors.mutedForeground)),
          ),
          TextButton(
            onPressed: () {
              appState.deleteSequence(sequence.id);
              Navigator.pop(ctx);
            },
            child: const Text('Supprimer',
                style: TextStyle(color: AppColors.destructive,
                    fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String text;
  const _Chip(this.text);

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: AppColors.muted,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(text,
            style: const TextStyle(
                fontSize: 10,
                color: AppColors.mutedForeground,
                fontWeight: FontWeight.w500)),
      );
}
