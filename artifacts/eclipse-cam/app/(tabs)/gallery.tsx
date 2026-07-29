import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import {
  FOCUS_LABELS,
  formatDuration,
  useAppContext,
  type Session,
} from '@/context/AppContext';

function PhotoGrid({ shots, colors }: { shots: Session['shots']; colors: ReturnType<typeof useColors> }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const withUri = shots.filter(s => s.uri);
  if (withUri.length === 0) return null;

  const sharePhoto = async (uri: string) => {
    setSaving(true);
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Partage indisponible', 'Le partage n\'est pas disponible sur cet appareil.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Partager la photo Eclipse',
      });
    } catch {
      // L'utilisateur a annulé ou erreur silencieuse
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.photoStrip, { borderTopColor: colors.border }]}
        contentContainerStyle={styles.photoStripContent}
      >
        {withUri.map(shot => (
          <Pressable key={shot.id} onPress={() => setSelected(shot.uri!)}>
            <Image source={{ uri: shot.uri }} style={styles.thumb} />
            <View style={styles.thumbLabel}>
              <Text style={styles.thumbLabelText} numberOfLines={1}>{shot.stepName}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBg}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          {selected && (
            <Image
              source={{ uri: selected }}
              style={styles.fullImg}
              resizeMode="contain"
            />
          )}
          <View style={styles.modalActions}>
            <Pressable
              style={[styles.saveBtn, { backgroundColor: saving ? '#444' : '#f09220' }]}
              onPress={() => selected && sharePhoto(selected)}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Partage…' : '↑ Partager'}</Text>
            </Pressable>
            <Pressable style={styles.closeBtn} onPress={() => setSelected(null)}>
              <Text style={styles.closeBtnText}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function SessionItem({ session }: { session: Session }) {
  const colors = useColors();
  const modeColor =
    session.mode === 'eclipse' ? colors.primary : colors.accent;
  const duration =
    session.completedAt
      ? session.completedAt - session.startedAt
      : Date.now() - session.startedAt;

  const statusColor =
    session.status === 'completed'
      ? '#4ade80'
      : session.status === 'cancelled'
      ? colors.destructive
      : colors.primary;
  const statusLabel =
    session.status === 'completed'
      ? 'Terminée'
      : session.status === 'cancelled'
      ? 'Annulée'
      : 'En cours';

  const date = new Date(session.startedAt);
  const dateStr = date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View
      style={[
        styles.sessionCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <MaterialCommunityIcons
            name={
              session.mode === 'eclipse'
                ? 'weather-sunny-alert'
                : 'moon-waning-crescent'
            }
            size={16}
            color={modeColor}
            style={{ marginRight: 8 }}
          />
          <View>
            <Text style={[styles.sessionName, { color: colors.foreground }]}>
              {session.sequenceName}
            </Text>
            <Text style={[styles.sessionDate, { color: colors.mutedForeground }]}>
              {dateStr} à {timeStr}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor + '22' },
          ]}
        >
          <View
            style={[styles.statusDot, { backgroundColor: statusColor }]}
          />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        {[
          { icon: 'camera-outline' as const, value: `${session.shots.length} photos` },
          { icon: 'layers-outline' as const, value: `${session.completedSteps}/${session.totalSteps} étapes` },
          { icon: 'time-outline' as const, value: formatDuration(duration) },
        ].map(item => (
          <View key={item.icon} style={styles.statItem}>
            <Ionicons
              name={item.icon}
              size={12}
              color={colors.mutedForeground}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.statText, { color: colors.mutedForeground }]}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>

      {/* Photo thumbnails (URI disponible même sans galerie) */}
      <PhotoGrid shots={session.shots} colors={colors} />

      {/* Shot log */}
      {session.shots.length > 0 && (
        <View style={[styles.shotLog, { borderTopColor: colors.border }]}>
          {session.shots.slice(0, 5).map(shot => (
            <View
              key={shot.id}
              style={[styles.shotRow, { borderBottomColor: colors.border }]}
            >
              <Text
                style={[styles.shotStep, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {shot.stepName}
              </Text>
              <View style={styles.shotSettings}>
                <Text style={[styles.shotParam, { color: colors.foreground }]}>
                  ISO {shot.iso}
                </Text>
                <Text style={[styles.shotParam, { color: colors.foreground }]}>
                  {shot.shutterSpeed}s
                </Text>
                <Text style={[styles.shotParam, { color: colors.foreground }]}>
                  {shot.aperture}
                </Text>
                <View
                  style={[
                    styles.focusMini,
                    {
                      backgroundColor:
                        shot.focusMode === 'infinity'
                          ? '#1a2e1a'
                          : shot.focusMode === 'near-infinity'
                          ? '#1a2536'
                          : '#2a1f1a',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.focusMiniText,
                      {
                        color:
                          shot.focusMode === 'infinity'
                            ? '#4ade80'
                            : shot.focusMode === 'near-infinity'
                            ? '#60b4f8'
                            : '#f5c842',
                      },
                    ]}
                  >
                    {shot.focusMode === 'infinity'
                      ? '∞'
                      : shot.focusMode === 'near-infinity'
                      ? '∞−'
                      : '⊕'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
          {session.shots.length > 5 && (
            <Text
              style={[styles.moreShots, { color: colors.mutedForeground }]}
            >
              +{session.shots.length - 5} photos supplémentaires
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function GalleryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sessions } = useAppContext();

  const webTopPad = Platform.OS === 'web' ? 67 : 0;
  const webBottomPad = Platform.OS === 'web' ? 34 : 0;

  const totalPhotos = sessions.reduce((a, s) => a + s.shots.length, 0);
  const completedSessions = sessions.filter(s => s.status === 'completed').length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + webTopPad + 8,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          Historique
        </Text>
        {sessions.length > 0 && (
          <View style={styles.headerStats}>
            <View style={[styles.headerStat, { backgroundColor: colors.card }]}>
              <Text style={[styles.headerStatVal, { color: colors.primary }]}>
                {completedSessions}
              </Text>
              <Text style={[styles.headerStatLabel, { color: colors.mutedForeground }]}>
                sessions
              </Text>
            </View>
            <View style={[styles.headerStat, { backgroundColor: colors.card }]}>
              <Text style={[styles.headerStatVal, { color: colors.accent }]}>
                {totalPhotos}
              </Text>
              <Text style={[styles.headerStatLabel, { color: colors.mutedForeground }]}>
                photos
              </Text>
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={sessions}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + webBottomPad + 20 },
        ]}
        scrollEnabled={sessions.length > 0}
        renderItem={({ item }) => <SessionItem session={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="time-outline"
              size={48}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Aucune session
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Lancez une séquence depuis l'onglet Contrôleur pour voir l'historique ici.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 26, fontWeight: '700' },
  headerStats: { flexDirection: 'row', gap: 10 },
  headerStat: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 54,
  },
  headerStatVal: { fontSize: 18, fontWeight: '700' },
  headerStatLabel: { fontSize: 10, fontWeight: '500' },
  list: { padding: 14, gap: 14 },
  sessionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sessionName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  sessionDate: { fontSize: 12 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statText: { fontSize: 11 },
  shotLog: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  shotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  shotStep: { fontSize: 12, flex: 1, marginRight: 8 },
  shotSettings: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shotParam: { fontSize: 11, fontWeight: '600' },
  focusMini: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusMiniText: { fontSize: 10, fontWeight: '700' },
  moreShots: { fontSize: 11, textAlign: 'center', paddingVertical: 8 },

  // Photo strip
  photoStrip: { borderTopWidth: 1 },
  photoStripContent: { padding: 10, gap: 8, flexDirection: 'row' },
  thumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#111' },
  thumbLabel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
    paddingHorizontal: 4, paddingVertical: 2,
  },
  thumbLabelText: { fontSize: 9, color: '#fff', fontWeight: '600' },

  // Fullscreen modal
  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center', justifyContent: 'center',
  },
  fullImg: { width: '100%', height: '75%' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  saveBtn: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  saveBtnText: { color: '#08090e', fontWeight: '700', fontSize: 14 },
  closeBtn: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  closeBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
