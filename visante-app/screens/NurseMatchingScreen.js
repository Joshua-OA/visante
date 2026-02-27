import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Polyline, Circle, Path } from 'react-native-svg';
import { subscribeToAppointment } from '../services/firestoreService';

// ─── Colors ─────────────────────────────────────────────────────────────────
const PRIMARY_RED = '#bb5454';
const TEXT_DARK = '#111827';
const TEXT_GRAY = '#64748b';
const TEXT_LIGHT = '#94a3b8';
const STATUS_GREEN = '#10b981';
const GREEN_SOFT = '#ecfdf5';
const GREEN_BORDER = '#a7f3d0';
const STAR_GOLD = '#f59e0b';
const TIP_BG = '#fdf8f3';
const TIP_BORDER = '#f9ede0';
const TIP_ICON = '#e28e46';
const ORANGE = '#f47b2a';
const BLUE = '#3b82f6';
const CARD_BG = '#ffffff';
const BG_MAIN = '#fcfcfc';

// ─── Icons ───────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke="#475569" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="19" y1="12" x2="5" y2="12" />
    <Polyline points="12 19 5 12 12 5" />
  </Svg>
);

const SearchIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"
    stroke={PRIMARY_RED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="11" cy="11" r="8" />
    <Line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Svg>
);

const CheckCircleIcon = ({ color = STATUS_GREEN, size = 48 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <Polyline points="22 4 12 14.01 9 11.01" />
  </Svg>
);

const ActivityIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none"
    stroke={BLUE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </Svg>
);

const BulbIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke={TIP_ICON} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="9" y1="18" x2="15" y2="18" />
    <Line x1="10" y1="22" x2="14" y2="22" />
    <Path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
  </Svg>
);

const HomeIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <Polyline points="9 22 9 12 15 12 15 22" />
  </Svg>
);

// ─── Status config ───────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  searching: {
    title: 'Finding a nurse near you',
    subtitle: 'We\'re matching you with the best available nurse...',
    headerLabel: 'SEARCHING',
    color: PRIMARY_RED,
  },
  nurse_accepted: {
    title: 'Nurse is on the way!',
    subtitle: 'Your nurse has accepted and is heading to your location.',
    headerLabel: 'NURSE MATCHED',
    color: ORANGE,
  },
  vitals_in_progress: {
    title: 'Taking your vitals',
    subtitle: 'The nurse is measuring your vitals right now.',
    headerLabel: 'IN PROGRESS',
    color: BLUE,
  },
  vitals_complete: {
    title: 'Vitals recorded!',
    subtitle: 'Your vitals are ready. You can now consult a doctor.',
    headerLabel: 'VITALS READY',
    color: STATUS_GREEN,
  },
  consultation_ready: {
    title: 'Ready to consult',
    subtitle: 'A doctor is available to review your vitals and symptoms.',
    headerLabel: 'READY',
    color: STATUS_GREEN,
  },
  confirmed: {
    title: 'Appointment confirmed',
    subtitle: 'Head to the pharmacy for your vitals check.',
    headerLabel: 'CONFIRMED',
    color: STATUS_GREEN,
  },
};

// ─── Pulsing animation ──────────────────────────────────────────────────────
function PulsingCircle({ color }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });

  return (
    <View style={styles.pulseContainer}>
      <Animated.View style={[styles.pulseRing, { borderColor: color, transform: [{ scale }], opacity }]} />
      <Animated.View style={[styles.pulseRing2, { borderColor: color, transform: [{ scale: Animated.add(scale, 0.15) }], opacity }]} />
      <View style={[styles.pulseCenter, { backgroundColor: color + '18', borderColor: color + '40' }]}>
        <SearchIcon />
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function NurseMatchingScreen({
  onBack,
  onCancel,
  onGoToDashboard,
  onConsultDoctor,
  appointmentId,
  provider,
  serviceType,
}) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState(
    serviceType === 'nurse' ? 'searching' : 'confirmed'
  );
  const [appointment, setAppointment] = useState(null);

  // Real-time Firestore listener
  useEffect(() => {
    if (!appointmentId) return;
    const unsub = subscribeToAppointment(appointmentId, (appt) => {
      setAppointment(appt);
      if (appt.status && STATUS_CONFIG[appt.status]) {
        setStatus(appt.status);
      }
      if (appt.status === 'cancelled') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onCancel && onCancel();
      }
      if (appt.status === 'nurse_accepted' || appt.status === 'vitals_complete') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    });
    return unsub;
  }, [appointmentId]);

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.searching;
  const displayName = appointment?.providerName ?? provider?.name ?? 'Your Provider';
  const displayRole = serviceType === 'pharmacy'
    ? 'Pharmacy'
    : (provider?.specialty ?? 'Home Care Nurse');
  const displayAvatar = provider?.avatarUrl ?? null;
  const displayRating = provider?.rating ?? '4.9';

  const isSearching = status === 'searching';
  const isVitalsComplete = status === 'vitals_complete' || status === 'consultation_ready';

  function handleCancel() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancel && onCancel();
  }

  function handleGoToDashboard() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onGoToDashboard && onGoToDashboard();
  }

  function handleConsultDoctor() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConsultDoctor && onConsultDoctor();
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.iconBtn}>
          <BackIcon />
        </TouchableOpacity>
        <View style={[styles.headerBadge, { backgroundColor: config.color + '18' }]}>
          <View style={[styles.headerDot, { backgroundColor: config.color }]} />
          <Text style={[styles.headerLabel, { color: config.color }]}>{config.headerLabel}</Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      {/* Content */}
      <View style={styles.content}>

        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.subtitle}>{config.subtitle}</Text>

        {/* Searching animation or status icon */}
        {isSearching ? (
          <PulsingCircle color={config.color} />
        ) : (
          <View style={styles.statusIconWrapper}>
            {isVitalsComplete ? (
              <View style={[styles.statusCircle, { backgroundColor: STATUS_GREEN + '18', borderColor: STATUS_GREEN + '40' }]}>
                <CheckCircleIcon color={STATUS_GREEN} size={48} />
              </View>
            ) : status === 'vitals_in_progress' ? (
              <View style={[styles.statusCircle, { backgroundColor: BLUE + '18', borderColor: BLUE + '40' }]}>
                <ActivityIcon />
              </View>
            ) : null}
          </View>
        )}

        {/* Provider profile card — after matching */}
        {!isSearching && (
          <View style={[styles.profileCard, { borderTopColor: config.color + '80' }]}>
            <View style={styles.avatarContainer}>
              {displayAvatar ? (
                <Image source={{ uri: displayAvatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>
                    {displayName.split(' ').map(w => w[0]).join('').substring(0, 2)}
                  </Text>
                </View>
              )}
              <View style={[styles.dotIndicator, { backgroundColor: config.color }]} />
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileRole}>{displayRole}</Text>
              <View style={styles.profileRating}>
                <Text style={styles.starIcon}>★</Text>
                <Text style={styles.ratingText}>{displayRating} </Text>
                <Text style={styles.reviewCount}>(verified)</Text>
              </View>
            </View>

            <View style={[styles.statusPill, { backgroundColor: config.color + '18' }]}>
              <View style={[styles.statusPillDot, { backgroundColor: config.color }]} />
              <Text style={[styles.statusPillText, { color: config.color }]}>
                {status === 'nurse_accepted' ? 'En route' :
                 status === 'vitals_in_progress' ? 'Active' :
                 isVitalsComplete ? 'Done' : 'Ready'}
              </Text>
            </View>
          </View>
        )}

        {/* Vitals card — when complete */}
        {isVitalsComplete && appointment?.vitals && (
          <View style={styles.vitalsCard}>
            <Text style={styles.vitalsTitle}>Your Vitals</Text>
            <View style={styles.vitalsGrid}>
              {appointment.vitals.blood_pressure && (
                <View style={styles.vitalChip}>
                  <Text style={styles.vitalValue}>{appointment.vitals.blood_pressure}</Text>
                  <Text style={styles.vitalLabel}>Blood Pressure</Text>
                </View>
              )}
              {appointment.vitals.heart_rate && (
                <View style={styles.vitalChip}>
                  <Text style={styles.vitalValue}>{appointment.vitals.heart_rate}</Text>
                  <Text style={styles.vitalLabel}>Heart Rate</Text>
                </View>
              )}
              {appointment.vitals.temperature && (
                <View style={styles.vitalChip}>
                  <Text style={styles.vitalValue}>{appointment.vitals.temperature}</Text>
                  <Text style={styles.vitalLabel}>Temperature</Text>
                </View>
              )}
              {appointment.vitals.spo2 && (
                <View style={styles.vitalChip}>
                  <Text style={styles.vitalValue}>{appointment.vitals.spo2}</Text>
                  <Text style={styles.vitalLabel}>SpO2</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Tip card — while searching/waiting */}
        {!isVitalsComplete && (
          <View style={styles.tipCard}>
            <View style={styles.tipIconWrapper}>
              <BulbIcon />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>While you wait</Text>
              <Text style={styles.tipText}>
                {isSearching
                  ? 'We\'re finding the best nurse near you. This usually takes a moment.'
                  : 'Please relax and stay comfortable. The nurse will take care of everything.'}
              </Text>
            </View>
          </View>
        )}

      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {isVitalsComplete ? (
          <TouchableOpacity style={styles.btnConsult} onPress={handleConsultDoctor} activeOpacity={0.85}>
            <Text style={styles.btnConsultText}>Consult a Doctor</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btnDashboard} onPress={handleGoToDashboard} activeOpacity={0.85}>
            <HomeIcon />
            <Text style={styles.btnDashboardText}>Go to Dashboard</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.btnCancel} onPress={handleCancel} activeOpacity={0.7}>
          <Text style={styles.btnCancelText}>Cancel Appointment</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_MAIN },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 10,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerDot: { width: 6, height: 6, borderRadius: 3 },
  headerLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },

  // Content
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 20 },
  title: { fontSize: 22, fontWeight: '700', color: TEXT_DARK, marginBottom: 8, marginTop: 10, textAlign: 'center' },
  subtitle: { fontSize: 14, color: TEXT_GRAY, marginBottom: 30, textAlign: 'center', lineHeight: 20 },

  // Pulse animation
  pulseContainer: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  pulseRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 2 },
  pulseRing2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 1.5 },
  pulseCenter: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },

  // Status icon
  statusIconWrapper: { marginBottom: 24 },
  statusCircle: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },

  // Profile card
  profileCard: {
    width: '100%', backgroundColor: CARD_BG, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#f1f5f9', borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 15, elevation: 2,
  },
  avatarContainer: { position: 'relative', marginRight: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#e2e8f0' },
  avatarPlaceholder: { width: 52, height: 52, borderRadius: 26, backgroundColor: PRIMARY_RED + '18', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 16, fontWeight: '700', color: PRIMARY_RED },
  dotIndicator: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: CARD_BG },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 15, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 },
  profileRole: { fontSize: 12, color: TEXT_GRAY, marginBottom: 3 },
  profileRating: { flexDirection: 'row', alignItems: 'center' },
  starIcon: { fontSize: 13, color: STAR_GOLD, marginRight: 3 },
  ratingText: { fontSize: 12, fontWeight: '600', color: TEXT_DARK },
  reviewCount: { fontSize: 11, fontWeight: '400', color: TEXT_LIGHT },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusPillDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusPillText: { fontSize: 11, fontWeight: '600' },

  // Vitals card
  vitalsCard: { width: '100%', backgroundColor: GREEN_SOFT, borderWidth: 1, borderColor: GREEN_BORDER, borderRadius: 14, padding: 16, marginBottom: 16 },
  vitalsTitle: { fontSize: 13, fontWeight: '700', color: STATUS_GREEN, letterSpacing: 0.3, marginBottom: 12, textTransform: 'uppercase' },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vitalChip: { width: '47%', backgroundColor: CARD_BG, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  vitalValue: { fontSize: 17, fontWeight: '700', color: TEXT_DARK },
  vitalLabel: { fontSize: 10, color: TEXT_LIGHT, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },

  // Tip card
  tipCard: { width: '100%', backgroundColor: TIP_BG, borderWidth: 1, borderColor: TIP_BORDER, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tipIconWrapper: { marginTop: 2, flexShrink: 0 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  tipText: { fontSize: 12, color: TEXT_GRAY, lineHeight: 18 },

  // Footer
  footer: { paddingHorizontal: 24, paddingTop: 16 },
  btnConsult: {
    width: '100%', backgroundColor: STATUS_GREEN, borderRadius: 12, paddingVertical: 18,
    alignItems: 'center', marginBottom: 12,
    shadowColor: STATUS_GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 4,
  },
  btnConsultText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  btnDashboard: {
    width: '100%', backgroundColor: PRIMARY_RED, borderRadius: 12, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12,
    shadowColor: PRIMARY_RED, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 4,
  },
  btnDashboardText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  btnCancel: { width: '100%', paddingVertical: 10, alignItems: 'center' },
  btnCancelText: { color: TEXT_GRAY, fontSize: 14, fontWeight: '600' },
});
