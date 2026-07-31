import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../models/models.dart';
import '../providers/app_state.dart';
import '../theme/app_colors.dart';

const _uuid = Uuid();

class SequenceEditorScreen extends StatefulWidget {
  final Sequence? initial;
  final AppMode   defaultMode;

  const SequenceEditorScreen({
    super.key,
    this.initial,
    this.defaultMode = AppMode.eclipse,
  });

  @override
  State<SequenceEditorScreen> createState() => _SequenceEditorScreenState();
}

class _SequenceEditorScreenState extends State<SequenceEditorScreen> {
  late TextEditingController _nameCtrl;
  late TextEditingController _descCtrl;
  late AppMode _mode;
  late List<ExposureStep> _steps;

  @override
  void initState() {
    super.initState();
    final s = widget.initial;
    _nameCtrl = TextEditingController(text: s?.name ?? '');
    _descCtrl = TextEditingController(text: s?.description ?? '');
    _mode     = s?.mode ?? widget.defaultMode;
    _steps    = s?.steps.map((e) => e).toList() ?? [_defaultStep()];
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  ExposureStep _defaultStep() => ExposureStep(
        id:           _uuid.v4(),
        name:         'Étape',
        iso:          400,
        shutterSpeed: '1/500',
        aperture:     'f/8',
        shotCount:    1,
        intervalMs:   5000,
        focusMode:    FocusMode.infinity,
      );

  void _save() {
    if (_nameCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Le nom est requis'),
        backgroundColor: AppColors.destructive,
      ));
      return;
    }
    if (_steps.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Ajoutez au moins une étape'),
        backgroundColor: AppColors.destructive,
      ));
      return;
    }

    final appState = context.read<AppState>();
    final existing = widget.initial;

    final seq = Sequence(
      id:          existing?.id ?? _uuid.v4(),
      name:        _nameCtrl.text.trim(),
      description: _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
      mode:        _mode,
      steps:       _steps,
      isDefault:   false,
      createdAt:   existing?.createdAt ?? DateTime.now().millisecondsSinceEpoch,
    );

    if (existing != null) {
      appState.updateSequence(existing.id, seq);
    } else {
      appState.addSequence(seq);
    }
    Navigator.pop(context);
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.initial != null;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.close, color: AppColors.mutedForeground),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          isEditing ? 'Modifier la séquence' : 'Nouvelle séquence',
          style: const TextStyle(
              fontSize: 17, fontWeight: FontWeight.w700,
              color: AppColors.foreground),
        ),
        actions: [
          TextButton(
            onPressed: _save,
            child: const Text('Enregistrer',
                style: TextStyle(
                    color: AppColors.primary, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: [
          // ── Infos générales ─────────────────────────────────────────────
          _Section(
            title: 'INFORMATIONS',
            child: Column(
              children: [
                _Field(
                  label: 'Nom',
                  child: TextField(
                    controller: _nameCtrl,
                    style: const TextStyle(color: AppColors.foreground),
                    decoration: _inputDeco('ex: Éclipse Partielle'),
                  ),
                ),
                const SizedBox(height: 10),
                _Field(
                  label: 'Description (optionnel)',
                  child: TextField(
                    controller: _descCtrl,
                    maxLines: 2,
                    style: const TextStyle(color: AppColors.foreground),
                    decoration: _inputDeco('Notes sur la séquence'),
                  ),
                ),
                const SizedBox(height: 10),
                _Field(
                  label: 'Mode',
                  child: Row(
                    children: [
                      for (final m in AppMode.values)
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() => _mode = m),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 150),
                              margin: const EdgeInsets.only(right: 6),
                              padding: const EdgeInsets.symmetric(
                                  vertical: 10),
                              decoration: BoxDecoration(
                                color: _mode == m
                                    ? (m == AppMode.eclipse
                                            ? AppColors.primary
                                            : AppColors.accent)
                                        .withOpacity(0.12)
                                    : AppColors.muted,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: _mode == m
                                      ? (m == AppMode.eclipse
                                              ? AppColors.primary
                                              : AppColors.accent)
                                          .withOpacity(0.5)
                                      : Colors.transparent,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    m == AppMode.eclipse
                                        ? Icons.wb_sunny
                                        : Icons.nightlight_round,
                                    size: 14,
                                    color: _mode == m
                                        ? (m == AppMode.eclipse
                                            ? AppColors.primary
                                            : AppColors.accent)
                                        : AppColors.mutedForeground,
                                  ),
                                  const SizedBox(width: 5),
                                  Text(
                                    m == AppMode.eclipse
                                        ? 'Éclipse'
                                        : 'Lune',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: _mode == m
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
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── Étapes ──────────────────────────────────────────────────────
          _Section(
            title: 'ÉTAPES (${_steps.length})',
            trailing: TextButton.icon(
              onPressed: () {
                setState(() => _steps.add(_defaultStep()));
              },
              icon: const Icon(Icons.add, size: 14, color: AppColors.primary),
              label: const Text('Ajouter',
                  style: TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                      fontSize: 12)),
              style: TextButton.styleFrom(
                  padding: EdgeInsets.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap),
            ),
            child: Column(
              children: [
                for (int i = 0; i < _steps.length; i++) ...[
                  _StepCard(
                    step: _steps[i],
                    index: i,
                    total: _steps.length,
                    onChanged: (updated) {
                      setState(() => _steps[i] = updated);
                    },
                    onMoveUp: i > 0
                        ? () => setState(() {
                              final tmp   = _steps[i - 1];
                              _steps[i - 1] = _steps[i];
                              _steps[i]   = tmp;
                            })
                        : null,
                    onMoveDown: i < _steps.length - 1
                        ? () => setState(() {
                              final tmp     = _steps[i + 1];
                              _steps[i + 1] = _steps[i];
                              _steps[i]     = tmp;
                            })
                        : null,
                    onDelete: _steps.length > 1
                        ? () => setState(() => _steps.removeAt(i))
                        : null,
                  ),
                  if (i < _steps.length - 1) const SizedBox(height: 8),
                ],
              ],
            ),
          ),

          const SizedBox(height: 30),
        ],
      ),
    );
  }

  InputDecoration _inputDeco(String hint) => InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: AppColors.mutedForeground),
        filled: true,
        fillColor: AppColors.muted,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      );
}

// ── Carte d'étape ─────────────────────────────────────────────────────────────

class _StepCard extends StatelessWidget {
  final ExposureStep step;
  final int index;
  final int total;
  final ValueChanged<ExposureStep> onChanged;
  final VoidCallback? onMoveUp;
  final VoidCallback? onMoveDown;
  final VoidCallback? onDelete;

  const _StepCard({
    required this.step,
    required this.index,
    required this.total,
    required this.onChanged,
    this.onMoveUp,
    this.onMoveDown,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header : numéro + nom + actions ───────────────────────────
          Row(
            children: [
              Container(
                width: 24, height: 24,
                decoration: BoxDecoration(
                  color: AppColors.muted,
                  borderRadius: BorderRadius.circular(8),
                ),
                alignment: Alignment.center,
                child: Text('${index + 1}',
                    style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.mutedForeground)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _InlineText(
                  value: step.name,
                  hint: 'Nom de l\'étape',
                  style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      color: AppColors.foreground),
                  onChanged: (v) => onChanged(step.copyWith(name: v)),
                ),
              ),
              // Réordonner + supprimer
              Row(
                children: [
                  _IconBtn(
                    icon: Icons.keyboard_arrow_up,
                    enabled: onMoveUp != null,
                    onTap: onMoveUp,
                  ),
                  _IconBtn(
                    icon: Icons.keyboard_arrow_down,
                    enabled: onMoveDown != null,
                    onTap: onMoveDown,
                  ),
                  if (onDelete != null)
                    _IconBtn(
                      icon: Icons.delete_outline,
                      enabled: true,
                      color: AppColors.destructive,
                      onTap: onDelete,
                    ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          // ── Expo row ──────────────────────────────────────────────────
          Row(
            children: [
              Expanded(
                child: _NumericField(
                  label: 'ISO',
                  value: step.iso.toString(),
                  onChanged: (v) {
                    final n = int.tryParse(v);
                    if (n != null && n > 0) onChanged(step.copyWith(iso: n));
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _NumericField(
                  label: 'Vitesse',
                  value: step.shutterSpeed,
                  onChanged: (v) => onChanged(step.copyWith(shutterSpeed: v)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _NumericField(
                  label: 'Ouv.',
                  value: step.aperture,
                  onChanged: (v) => onChanged(step.copyWith(aperture: v)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // ── Photos + intervalle ───────────────────────────────────────
          Row(
            children: [
              Expanded(
                child: _NumericField(
                  label: 'Nb photos',
                  value: step.shotCount.toString(),
                  onChanged: (v) {
                    final n = int.tryParse(v);
                    if (n != null && n > 0) onChanged(step.copyWith(shotCount: n));
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _NumericField(
                  label: 'Intervalle (ms)',
                  value: step.intervalMs.toString(),
                  onChanged: (v) {
                    final n = int.tryParse(v);
                    if (n != null && n >= 0) onChanged(step.copyWith(intervalMs: n));
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // ── Focus mode ────────────────────────────────────────────────
          _FocusPicker(
            value: step.focusMode,
            onChanged: (m) => onChanged(step.copyWith(focusMode: m)),
          ),
          // ── Notes ─────────────────────────────────────────────────────
          const SizedBox(height: 8),
          _InlineText(
            value: step.notes ?? '',
            hint: 'Notes (ex: lunette solaire)',
            style: const TextStyle(
                fontSize: 12, color: AppColors.mutedForeground),
            onChanged: (v) => onChanged(step.copyWith(notes: v.isEmpty ? null : v)),
          ),
        ],
      ),
    );
  }
}

// ── Sélecteur mode focus ──────────────────────────────────────────────────────

class _FocusPicker extends StatelessWidget {
  final FocusMode value;
  final ValueChanged<FocusMode> onChanged;
  const _FocusPicker({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) => Row(
        children: [
          const Text('Focus:',
              style: TextStyle(
                  fontSize: 11,
                  color: AppColors.mutedForeground,
                  fontWeight: FontWeight.w600)),
          const SizedBox(width: 8),
          for (final m in FocusMode.values) ...[
            GestureDetector(
              onTap: () => onChanged(m),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 120),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                margin: const EdgeInsets.only(right: 6),
                decoration: BoxDecoration(
                  color: value == m ? _focusColor(m).withOpacity(0.12) : AppColors.muted,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                      color: value == m
                          ? _focusColor(m).withOpacity(0.5)
                          : Colors.transparent),
                ),
                child: Text(m.label,
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: value == m
                            ? _focusColor(m)
                            : AppColors.mutedForeground)),
              ),
            ),
          ],
        ],
      );

  Color _focusColor(FocusMode m) => switch (m) {
        FocusMode.infinity     => AppColors.focusInfinity,
        FocusMode.nearInfinity => AppColors.focusNearInfinity,
        FocusMode.hyperfocal   => AppColors.focusHyperfocal,
      };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

class _Section extends StatelessWidget {
  final String title;
  final Widget child;
  final Widget? trailing;
  const _Section({required this.title, required this.child, this.trailing});

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.mutedForeground,
                        letterSpacing: 1)),
                if (trailing != null) trailing!,
              ],
            ),
          ),
          child,
        ],
      );
}

class _Field extends StatelessWidget {
  final String label;
  final Widget child;
  const _Field({required this.label, required this.child});

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.mutedForeground,
                  fontWeight: FontWeight.w600)),
          const SizedBox(height: 5),
          child,
        ],
      );
}

class _NumericField extends StatefulWidget {
  final String label;
  final String value;
  final ValueChanged<String> onChanged;
  const _NumericField({required this.label, required this.value, required this.onChanged});

  @override
  State<_NumericField> createState() => _NumericFieldState();
}

class _NumericFieldState extends State<_NumericField> {
  late TextEditingController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.value);
  }

  @override
  void didUpdateWidget(_NumericField old) {
    super.didUpdateWidget(old);
    if (old.value != widget.value && _ctrl.text != widget.value) {
      _ctrl.text = widget.value;
    }
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(widget.label,
              style: const TextStyle(
                  fontSize: 10,
                  color: AppColors.mutedForeground,
                  fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          TextField(
            controller: _ctrl,
            onChanged: widget.onChanged,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.foreground),
            decoration: InputDecoration(
              filled: true,
              fillColor: AppColors.muted,
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide.none),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            ),
          ),
        ],
      );
}

class _InlineText extends StatefulWidget {
  final String value;
  final String hint;
  final TextStyle style;
  final ValueChanged<String> onChanged;
  const _InlineText({required this.value, required this.hint, required this.style, required this.onChanged});

  @override
  State<_InlineText> createState() => _InlineTextState();
}

class _InlineTextState extends State<_InlineText> {
  late TextEditingController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.value);
  }

  @override
  void didUpdateWidget(_InlineText old) {
    super.didUpdateWidget(old);
    if (old.value != widget.value && _ctrl.text != widget.value) {
      _ctrl.text = widget.value;
    }
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => TextField(
        controller: _ctrl,
        onChanged: widget.onChanged,
        style: widget.style,
        decoration: InputDecoration(
          hintText: widget.hint,
          hintStyle: const TextStyle(color: AppColors.mutedForeground),
          border: InputBorder.none,
          isDense: true,
          contentPadding: EdgeInsets.zero,
        ),
      );
}

class _IconBtn extends StatelessWidget {
  final IconData icon;
  final bool enabled;
  final Color? color;
  final VoidCallback? onTap;
  const _IconBtn({required this.icon, required this.enabled, this.color, this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: enabled ? onTap : null,
        child: Padding(
          padding: const EdgeInsets.all(4),
          child: Icon(icon,
              size: 18,
              color: enabled
                  ? (color ?? AppColors.mutedForeground)
                  : AppColors.muted),
        ),
      );
}
