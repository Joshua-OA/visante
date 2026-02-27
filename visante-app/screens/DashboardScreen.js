import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Line, Polyline, Path, Circle, Rect, Polygon,
} from 'react-native-svg';
import { fetchLatestAppointment, subscribeToActiveBookings } from '../services/firestoreService';
import { showErrorToast } from '../utils/toast';

// ─── Design tokens (mirrors app-wide system) ─────────────────────────────────
const PRIMARY_RED = '#bb5454';
const TEXT_DARK = '#1e293b';
const TEXT_GRAY = '#64748b';
const TEXT_LIGHT = '#94a3b8';
const BG_MAIN = '#f7f9fa';
const CARD_BG = '#ffffff';
const ORANGE = '#f47b2a';
const ORANGE_LIGHT = '#fff7ed';
const ORANGE_BORDER = '#ffedd5';
const GREEN = '#10b981';
const GREEN_LIGHT = '#ecfdf5';
const GREEN_BORDER = '#a7f3d0';
const RED_LIGHT = '#fef2f2';
const RED_BORDER = '#fecaca';
const STAR_GOLD = '#f59e0b';
const BORDER_SOFT = '#f1f5f9';

// ─── Icons ────────────────────────────────────────────────────────────────────
const HeartIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke={PRIMARY_RED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </Svg>
);

const CalendarIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke={ORANGE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <Line x1="16" y1="2" x2="16" y2="6" />
    <Line x1="8" y1="2" x2="8" y2="6" />
    <Line x1="3" y1="10" x2="21" y2="10" />
  </Svg>
);

const ClockIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"
    stroke={TEXT_LIGHT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Polyline points="12 6 12 12 16 14" />
  </Svg>
);

const ActivityIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke={GREEN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </Svg>
);

const MicIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none"
    stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <Line x1="12" y1="19" x2="12" y2="23" />
    <Line x1="8" y1="23" x2="16" y2="23" />
  </Svg>
);

const ArrowRightIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="5" y1="12" x2="19" y2="12" />
    <Polyline points="12 5 19 12 12 19" />
  </Svg>
);

const CheckIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none"
    stroke={GREEN} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="20 6 9 17 4 12" />
  </Svg>
);

const StethoscopeIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"
    stroke={TEXT_LIGHT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
    <Path d="M8 15v1a6 6 0 0 0 6 6h0a6 6 0 0 0 6-6v-4" />
    <Circle cx="20" cy="10" r="2" />
  </Svg>
);

// ─── Vital chip ───────────────────────────────────────────────────────────────
function VitalChip({ label, value, unit }) {
  return (
    <View style={styles.vitalChip}>
      <Text style={styles.vitalValue}>{value}</Text>
      {unit ? <Text style={styles.vitalUnit}>{unit}</Text> : null}
      <Text style={styles.vitalLabel}>{label}</Text>
    </View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, color }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconBox, { backgroundColor: color + '18' }]}>
        {icon}
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Status labels for active bookings ────────────────────────────────────────
const STATUS_LABELS = {
  searching: { label: 'Searching for nurse', color: '#f47b2a', bg: '#fff7ed' },
  nurse_accepted: { label: 'Nurse on the way', color: '#f47b2a', bg: '#fff7ed' },
  vitals_in_progress: { label: 'Vitals in progress', color: '#3b82f6', bg: '#eff6ff' },
  vitals_complete: { label: 'Vitals ready', color: '#10b981', bg: '#ecfdf5' },
  consultation_ready: { label: 'Ready for doctor', color: '#10b981', bg: '#ecfdf5' },
  confirmed: { label: 'Confirmed', color: '#10b981', bg: '#ecfdf5' },
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DashboardScreen({ onStartTriage, onViewActiveBooking, userProfile, phoneNumber }) {
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // ── Firestore data ──
  const [latestAppt, setLatestAppt] = useState(null);
  const [activeBookings, setActiveBookings] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const displayName = userProfile?.name ?? 'there';
  const initials = userProfile?.name
    ? userProfile.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
    : '?';

  // Get greeting based on time of day
  const hour = new Date().getHours();
  const greetingText = hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,';

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const latest = await fetchLatestAppointment();
        setLatestAppt(latest);
      } catch (e) {
        console.warn('Dashboard Firestore load error:', e);
        showErrorToast(e, 'Could Not Load Dashboard');
      } finally {
        setLoadingData(false);
      }
    }
    loadDashboardData();
  }, []);

  // Real-time active bookings listener
  useEffect(() => {
    if (!phoneNumber) return;
    const unsub = subscribeToActiveBookings(phoneNumber, (bookings) => {
      setActiveBookings(bookings);
    });
    return unsub;
  }, [phoneNumber]);

  function handlePressTriage() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start(() => onStartTriage && onStartTriage());
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greetingText}</Text>
          <Text style={styles.patientName}>{displayName}</Text>
        </View>
        <View style={styles.avatarBadge}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Active Bookings ── */}
        {activeBookings.map((booking) => {
          const statusInfo = STATUS_LABELS[booking.status] || STATUS_LABELS.confirmed;
          const isVitalsReady = booking.status === 'vitals_complete' || booking.status === 'consultation_ready';
          return (
            <TouchableOpacity
              key={booking.id}
              style={[styles.card, styles.pendingCard]}
              onPress={() => onViewActiveBooking && onViewActiveBooking(booking)}
              activeOpacity={0.8}
            >
              <SectionHeader
                icon={<CalendarIcon />}
                title="Active Booking"
                color={ORANGE}
              />

              <View style={styles.apptRow}>
                <View style={styles.docAvatar} />
                <View style={styles.apptInfo}>
                  <Text style={styles.docName}>{booking.providerName ?? 'Provider'}</Text>
                  <View style={styles.metaRow}>
                    <StethoscopeIcon />
                    <Text style={styles.metaText}>
                      {booking.providerType === 'pharmacy' ? 'Pharmacy' : 'Home Care Nurse'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                <View style={[styles.statusBadgeDot, { backgroundColor: statusInfo.color }]} />
                <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              </View>

              {isVitalsReady && (
                <View style={styles.consultBanner}>
                  <Text style={styles.consultBannerText}>Tap to consult a doctor</Text>
                  <ArrowRightIcon />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* ── Last Vitals ── */}
        <View style={styles.card}>
          <SectionHeader
            icon={<ActivityIcon />}
            title="Last Vitals"
            color={GREEN}
          />
          <Text style={styles.recordDate}>
            {latestAppt?.vitals ? 'From your most recent appointment' : 'Recorded at last pharmacy visit'}
          </Text>

          <View style={styles.vitalsGrid}>
            <VitalChip label="Blood Pressure" value={latestAppt?.vitals?.blood_pressure ?? '—'} unit="mmHg" />
            <VitalChip label="Heart Rate" value={latestAppt?.vitals?.heart_rate ?? '—'} unit="bpm" />
            <VitalChip label="Temperature" value={latestAppt?.vitals?.temperature ?? '—'} />
            <VitalChip label="SpO2" value={latestAppt?.vitals?.spo2 ?? '—'} />
          </View>
        </View>

        {/* ── Last Appointment ── */}
        {latestAppt && (
          <View style={styles.card}>
            <SectionHeader
              icon={<HeartIcon />}
              title="Last Appointment"
              color={PRIMARY_RED}
            />

            <View style={styles.apptRow}>
              <View style={styles.docAvatar} />
              <View style={styles.apptInfo}>
                <Text style={styles.docName}>{latestAppt.providerName ?? 'Provider'}</Text>
                <View style={styles.metaRow}>
                  <StethoscopeIcon />
                  <Text style={styles.metaText}>
                    {latestAppt.providerType === 'pharmacy' ? 'Pharmacy' : 'Home Care Nurse'}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <ClockIcon />
                  <Text style={styles.metaText}>
                    {latestAppt.date ?? '—'} · {latestAppt.time ?? '—'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.diagnosisPill}>
              <Text style={styles.diagnosisLabel}>SERVICE TYPE</Text>
              <Text style={styles.diagnosisText}>
                {latestAppt.providerType === 'pharmacy' ? 'Vitals Check at Pharmacy' : 'Nurse Home Visit'}
              </Text>
            </View>
          </View>
        )}

        {/* ── Loading / empty strip ── */}
        {loadingData && (
          <View style={[styles.card, { alignItems: 'center', paddingVertical: 24 }]}>
            <Text style={{ color: TEXT_GRAY, fontSize: 13 }}>Loading your health records…</Text>
          </View>
        )}

      </ScrollView>

      {/* ── Floating Triage Button ── */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + 24 }]}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={styles.fabBtn}
            onPress={handlePressTriage}
            activeOpacity={1}
          >
            <View style={styles.fabInner}>
              <MicIcon />
              <View style={styles.fabTextCol}>
                <Text style={styles.fabTitle}>Start New Consultation</Text>
                <Text style={styles.fabSub}>Describe your symptoms to the AI</Text>
              </View>
              <ArrowRightIcon />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_MAIN,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 18,
  },
  greeting: {
    fontSize: 13,
    color: TEXT_GRAY,
    fontWeight: '500',
  },
  patientName: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_DARK,
    marginTop: 2,
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY_RED + '18',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: PRIMARY_RED + '30',
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIMARY_RED,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 16,
  },

  // Card
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  pendingCard: {
    borderTopWidth: 3,
    borderTopColor: '#fed7aa',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  sectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
    letterSpacing: 0.1,
  },

  // Vitals
  recordDate: {
    fontSize: 11,
    color: TEXT_LIGHT,
    fontWeight: '500',
    marginBottom: 14,
    marginTop: -8,
    letterSpacing: 0.3,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  vitalChip: {
    width: '47%',
    backgroundColor: GREEN_LIGHT,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  vitalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  vitalUnit: {
    fontSize: 11,
    color: TEXT_GRAY,
    fontWeight: '500',
    marginTop: 1,
  },
  vitalLabel: {
    fontSize: 11,
    color: TEXT_LIGHT,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Appointment shared
  apptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  docAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e2e8f0',
  },
  apptInfo: {
    flex: 1,
    gap: 4,
  },
  docName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: TEXT_LIGHT,
    fontWeight: '500',
  },

  // Last appointment diagnosis pill
  diagnosisPill: {
    backgroundColor: RED_LIGHT,
    borderWidth: 1,
    borderColor: RED_BORDER,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  diagnosisLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: PRIMARY_RED,
    letterSpacing: 0.8,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  diagnosisText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_DARK,
  },

  // Active booking status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  consultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 4,
  },
  consultBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  fabBtn: {
    backgroundColor: PRIMARY_RED,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: PRIMARY_RED,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  fabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  fabTextCol: {
    flex: 1,
  },
  fabTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  fabSub: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.75,
  },
});
