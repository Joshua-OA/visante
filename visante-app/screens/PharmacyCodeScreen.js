import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Polyline, Circle, Path, Rect } from 'react-native-svg';
import { subscribeToAppointment } from '../services/firestoreService';

// ─── Colors ─────────────────────────────────────────────────────────────────
const BG = '#FEF8F5';
const WHITE = '#FFFFFF';
const ACCENT = '#B8595A';
const ACCENT_SOFT = '#FAEDED';
const ACCENT_TEXT = '#B25A5E';
const TEXT_DARK = '#1F2937';
const TEXT_MUTED = '#6B7280';
const TEXT_LIGHT = '#94a3b8';
const GREEN = '#10b981';
const GREEN_SOFT = '#ecfdf5';
const GREEN_BORDER = '#a7f3d0';
const BORDER_SOFT = '#FDF0E9';

// ─── Icons ──────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#0D1C2E" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="19" y1="12" x2="5" y2="12" />
    <Polyline points="12 19 5 12 12 5" />
  </Svg>
);

const PharmacyIcon = ({ size = 48 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 3h18v4H3z" />
    <Path d="M3 7v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7" />
    <Line x1="12" y1="11" x2="12" y2="17" />
    <Line x1="9" y1="14" x2="15" y2="14" />
  </Svg>
);

const MapPinIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <Circle cx="12" cy="10" r="3" />
  </Svg>
);

const ClockIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Polyline points="12 6 12 12 16 14" />
  </Svg>
);

const CheckIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="20 6 9 17 4 12" />
  </Svg>
);

const HomeIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <Polyline points="9 22 9 12 15 12 15 22" />
  </Svg>
);

// ─── Generate a 6-character code ────────────────────────────────────────────
function generateCode(appointmentId) {
  if (appointmentId) {
    // Derive a deterministic code from appointment ID
    return appointmentId.slice(-6).toUpperCase();
  }
  // Fallback random code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function PharmacyCodeScreen({
  onBack,
  onGoToDashboard,
  onVitalsComplete,
  pharmacy,
  appointmentId,
}) {
  const insets = useSafeAreaInsets();
  const code = useRef(generateCode(appointmentId)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const [vitalsReady, setVitalsReady] = useState(false);
  const [appointment, setAppointment] = useState(null);

  const pharmacyName = pharmacy?.name ?? 'Your Pharmacy';
  const pharmacyAddress = pharmacy?.address ?? 'Nearby location';
  const pharmacyHours = pharmacy?.operating_hours ?? 'Open now';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  // Listen for vitals_complete from Firestore (MCA submits vitals)
  useEffect(() => {
    if (!appointmentId) return;
    const unsub = subscribeToAppointment(appointmentId, (appt) => {
      setAppointment(appt);
      if (appt.status === 'vitals_complete' || appt.status === 'consultation_ready') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setVitalsReady(true);
      }
    });
    return unsub;
  }, [appointmentId]);

  function handleGoToDashboard() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onGoToDashboard && onGoToDashboard();
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack} activeOpacity={0.7}>
          <BackIcon />
        </TouchableOpacity>
        <Image source={require('../assets/visante-blue.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.iconBtn} />
      </View>

      {/* Content */}
      <View style={styles.content}>

        {/* Pharmacy icon */}
        <Animated.View style={[styles.pharmacyIconCircle, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <PharmacyIcon size={48} />
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>Head to the pharmacy</Text>
        <Text style={styles.subtitle}>
          Give this code to the MCA{'\n'}once you arrive
        </Text>

        {/* Code card */}
        <Animated.View style={[styles.codeCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.codeLabel}>YOUR VISIT CODE</Text>
          <View style={styles.codeRow}>
            {code.split('').map((char, i) => (
              <View key={i} style={styles.codeCharBox}>
                <Text style={styles.codeChar}>{char}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.codeHint}>Show this to the pharmacist or MCA</Text>
        </Animated.View>

        {/* Pharmacy info card */}
        <View style={styles.pharmacyCard}>
          <View style={styles.pharmacyCardHeader}>
            <View style={styles.pharmacyCardIcon}>
              <PharmacyIcon size={24} />
            </View>
            <View style={styles.pharmacyCardInfo}>
              <Text style={styles.pharmacyName}>{pharmacyName}</Text>
              <View style={styles.pharmacyDetail}>
                <MapPinIcon />
                <Text style={styles.pharmacyDetailText}>{pharmacyAddress}</Text>
              </View>
              <View style={styles.pharmacyDetail}>
                <ClockIcon />
                <Text style={styles.pharmacyDetailText}>{pharmacyHours}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Free vitals badge */}
        <View style={styles.freeBadge}>
          <CheckIcon />
          <Text style={styles.freeBadgeText}>FREE vitals check — no payment required</Text>
        </View>

      </View>

      {/* Vitals ready banner */}
      {vitalsReady && appointment?.vitals && (
        <View style={styles.vitalsReadyBanner}>
          <CheckIcon />
          <Text style={styles.vitalsReadyText}>Vitals recorded — ready for doctor</Text>
        </View>
      )}

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {vitalsReady ? (
          <TouchableOpacity style={styles.btnProceed} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onVitalsComplete && onVitalsComplete(); }} activeOpacity={0.85}>
            <Text style={styles.btnProceedText}>Proceed to Waiting Room</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btnDashboard} onPress={handleGoToDashboard} activeOpacity={0.85}>
            <HomeIcon />
            <Text style={styles.btnDashboardText}>Go to Dashboard</Text>
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
}

// ─── Responsive helpers ─────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const CODE_BOX_SIZE = Math.floor((SCREEN_W - 48 - 48 - 40) / 6); // 6 boxes with gaps and padding
const ICON_CIRCLE = Math.min(SCREEN_W * 0.25, 100);

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  // Header
  header: {
    height: '8%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    height: 28,
    width: 130,
  },

  // Content
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  // Pharmacy icon circle
  pharmacyIconCircle: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: ICON_CIRCLE / 2,
    backgroundColor: ACCENT_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  // Title
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },

  // Code card
  codeCard: {
    width: '100%',
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: BORDER_SOFT,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_MUTED,
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  codeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  codeCharBox: {
    width: CODE_BOX_SIZE,
    height: CODE_BOX_SIZE * 1.27,
    borderRadius: 12,
    backgroundColor: ACCENT_SOFT,
    borderWidth: 1.5,
    borderColor: ACCENT + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeChar: {
    fontSize: 24,
    fontWeight: '800',
    color: ACCENT_TEXT,
    letterSpacing: 1,
  },
  codeHint: {
    fontSize: 12,
    color: TEXT_LIGHT,
    fontWeight: '500',
  },

  // Pharmacy card
  pharmacyCard: {
    width: '100%',
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    marginBottom: 16,
  },
  pharmacyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pharmacyCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: ACCENT_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pharmacyCardInfo: {
    flex: 1,
    gap: 4,
  },
  pharmacyName: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 2,
  },
  pharmacyDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pharmacyDetailText: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: '500',
  },

  // Free badge
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: GREEN_SOFT,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  freeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: GREEN,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  btnDashboard: {
    width: '100%',
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  btnDashboardText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Vitals ready banner
  vitalsReadyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: GREEN_SOFT,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginHorizontal: 24,
    marginBottom: 8,
  },
  vitalsReadyText: {
    fontSize: 14,
    fontWeight: '600',
    color: GREEN,
  },

  // Proceed button
  btnProceed: {
    width: '100%',
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  btnProceedText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
