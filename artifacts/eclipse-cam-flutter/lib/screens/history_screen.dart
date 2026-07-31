import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import '../models/models.dart';
import '../providers/app_state.dart';
import '../theme/app_colors.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final sessions = appState.sessions; // newest-first

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        surfaceTintColor: Colors.transparent,
        title: const Text('Historique',
            style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.foreground)),
        actions: [
          if (sessions.isNotEmpty)
            TextButton(
              onPressed: () => _confirmClear(context, appState),
              child: const Text('Effacer',
                  style: TextStyle(
                      color: AppColors.destructive,
                      fontWeight: FontWeight.w600)),
            ),
        ],
      ),
      body: sessions.isEmpty
          ? _EmptyState()
          : ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: sessions.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (ctx, i) => _SessionCard(session: sessions[i]),
            ),
    );
  }

  void _confirmClear(BuildContext context, AppState appState) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Effacer tout ?',
            style: TextStyle(
                fontWeight: FontWeight.w700, color: AppColors.foreground)),
        content: const Text(
            "Toutes les sessions seront supprimées de l'historique.",
            style: TextStyle(color: AppColors.mutedForeground)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler',
                  style: TextStyle(color: AppColors.mutedForeground))),
          TextButton(
              onPressed: () {
                appState.clearHistory();
                Navigator.pop(ctx);
              },
              child: const Text('Effacer',
                  style: TextStyle(
                      color: AppColors.destructive,
                      fontWeight: FontWeight.w700))),
        ],
      ),
    );
  }
}

// ── Session card ──────────────────────────────────────────────────────────────

class _SessionCard extends StatefulWidget {
  final Session session;
  const _SessionCard({required this.session});

  @override
  State<_SessionCard> createState() => _SessionCardState();
}

class _SessionCardState extends State<_SessionCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final s          = widget.session;
    final modeColor  = s.mode == AppMode.eclipse
        ? AppColors.primary
        : AppColors.accent;
    final statusIcon = _statusIcon(s.status);
    final statusColor = _statusColor(s.status);

    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          // ── Header ────────────────────────────────────────────────────────
          GestureDetector(
            onTap: () => setState(() => _expanded = !_expanded),
            behavior: HitTestBehavior.opaque,
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(9),
                    decoration: BoxDecoration(
                      color: modeColor.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      s.mode == AppMode.eclipse
                          ? Icons.wb_sunny
                          : Icons.nightlight_round,
                      color: modeColor, size: 18,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(s.sequenceName,
                                  style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.foreground)),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: statusColor.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                children: [
                                  Icon(statusIcon,
                                      size: 10, color: statusColor),
                                  const SizedBox(width: 4),
                                  Text(_statusLabel(s.status),
                                      style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          color: statusColor)),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 3),
                        Text(_formatDate(s.startedAt),
                            style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.mutedForeground)),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            _InfoChip(
                                icon: Icons.photo_camera,
                                text: '${s.shots.length} photos'),
                            const SizedBox(width: 6),
                            _InfoChip(
                                icon: Icons.list,
                                text:
                                    '${s.completedSteps}/${s.totalSteps} étapes'),
                            if (s.completedAt != null) ...[
                              const SizedBox(width: 6),
                              _InfoChip(
                                  icon: Icons.timer,
                                  text: _elapsed(s.startedAt, s.completedAt!)),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    _expanded
                        ? Icons.keyboard_arrow_up
                        : Icons.keyboard_arrow_down,
                    size: 18, color: AppColors.mutedForeground,
                  ),
                ],
              ),
            ),
          ),

          // ── Détails (expandable) ─────────────────────────────────────────
          if (_expanded) ...[
            Divider(height: 1, color: AppColors.border),
            // Miniatures
            if (s.shots.isNotEmpty)
              SizedBox(
                height: 80,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 10),
                  itemCount: s.shots.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (ctx, i) {
                    final shot = s.shots[i];
                    return _ThumbnailTile(shot: shot);
                  },
                ),
              ),
            // Bouton partager
            if (s.shots.any((sh) => sh.filePath != null && File(sh.filePath!).existsSync()))
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                child: OutlinedButton.icon(
                  onPressed: () => _share(s),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.border),
                    foregroundColor: AppColors.foreground,
                  ),
                  icon: const Icon(Icons.share, size: 16),
                  label: const Text('Partager les photos',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                ),
              ),
          ],
        ],
      ),
    );
  }

  Future<void> _share(Session s) async {
    final paths = s.shots
        .where((sh) =>
            sh.filePath != null && File(sh.filePath!).existsSync())
        .map((sh) => XFile(sh.filePath!))
        .toList();
    if (paths.isNotEmpty) {
      await Share.shareXFiles(paths,
          subject: 'Eclipse Cam — ${s.sequenceName}');
    }
  }

  IconData _statusIcon(SessionStatus st) => switch (st) {
        SessionStatus.running   => Icons.radio_button_checked,
        SessionStatus.completed => Icons.check_circle,
        SessionStatus.cancelled => Icons.cancel,
      };

  Color _statusColor(SessionStatus st) => switch (st) {
        SessionStatus.running   => AppColors.primary,
        SessionStatus.completed => AppColors.success,
        SessionStatus.cancelled => AppColors.destructive,
      };

  String _statusLabel(SessionStatus st) => switch (st) {
        SessionStatus.running   => 'EN COURS',
        SessionStatus.completed => 'TERMINÉ',
        SessionStatus.cancelled => 'ANNULÉ',
      };

  String _formatDate(int ms) {
    final dt = DateTime.fromMillisecondsSinceEpoch(ms);
    return '${_pad(dt.day)}/${_pad(dt.month)}/${dt.year}  '
        '${_pad(dt.hour)}:${_pad(dt.minute)}';
  }

  String _elapsed(int startMs, int endMs) {
    final diff = Duration(milliseconds: endMs - startMs);
    if (diff.inMinutes < 1) return '${diff.inSeconds}s';
    return '${diff.inMinutes}min ${diff.inSeconds % 60}s';
  }

  String _pad(int v) => v.toString().padLeft(2, '0');
}

// ── Miniature ─────────────────────────────────────────────────────────────────

class _ThumbnailTile extends StatelessWidget {
  final CapturedShot shot;
  const _ThumbnailTile({required this.shot});

  @override
  Widget build(BuildContext context) {
    final hasFile = shot.filePath != null && File(shot.filePath!).existsSync();
    return Container(
      width: 60,
      decoration: BoxDecoration(
        color: AppColors.muted,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: hasFile
          ? Image.file(File(shot.filePath!), fit: BoxFit.cover)
          : Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: const [
                Icon(Icons.photo, size: 20, color: AppColors.mutedForeground),
              ],
            ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoChip({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Icon(icon, size: 10, color: AppColors.mutedForeground),
          const SizedBox(width: 3),
          Text(text,
              style: const TextStyle(
                  fontSize: 10, color: AppColors.mutedForeground)),
        ],
      );
}

// ── Empty state ───────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: const [
              Icon(Icons.history, size: 56, color: AppColors.mutedForeground),
              SizedBox(height: 16),
              Text('Aucune session',
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.foreground)),
              SizedBox(height: 8),
              Text(
                  "Démarrez une séquence depuis l'onglet Contrôleur pour voir l'historique ici.",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: 13, color: AppColors.mutedForeground)),
            ],
          ),
        ),
      );
}
