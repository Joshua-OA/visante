import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Polyline, Circle, Path, Rect } from 'react-native-svg';

// ─── Colors (mirrors waitng_screen.html) ─────────────────────────────────────
const PRIMARY_RED   = '#bb5454';
const TEXT_DARK     = '#111827';
const TEXT_GRAY     = '#64748b';
const TEXT_LIGHT    = '#94a3b8';
const STATUS_GREEN  = '#10b981';
const STAR_GOLD     = '#f59e0b';
const TIP_BG        = '#fdf8f3';
const TIP_BORDER    = '#f9ede0';
const TIP_ICON      = '#e28e46';
const CARD_BG       = '#ffffff';
const BG_MAIN       = '#fcfcfc';

// ─── Icons ───────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke="#475569" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="19" y1="12" x2="5" y2="12" />
    <Polyline points="12 19 5 12 12 5" />
  </Svg>
);

const DotsIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke="#475569" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="1" />
    <Circle cx="19" cy="12" r="1" />
    <Circle cx="5" cy="12" r="1" />
  </Svg>
);

const VideoIcon = () => (
  <Svg width={8} height={8} viewBox="0 0 24 24" fill="white"
    stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M23 7l-7 5 7 5V7z" />
    <Rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </Svg>
);

const InfoIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke={TEXT_LIGHT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Line x1="12" y1="16" x2="12" y2="12" />
    <Line x1="12" y1="8" x2="12.01" y2="8" />
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

// ─── Screen ──────────────────────────────────────────────────────────────────
const INITIAL_WAIT = 5;

export default function WaitingScreen({ onBack, onCheckConnection, onCancel, onJoin }) {
  const insets = useSafeAreaInsets();
  const [wait, setWait] = useState(INITIAL_WAIT);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setWait(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (wait === 0) {
      onJoin && onJoin();
    }
  }, [wait]);

  function handleCheckConnection() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCheckConnection && onCheckConnection();
  }

  function handleCancel() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancel && onCancel();
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.iconBtn}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WAITING ROOM</Text>
        <View style={styles.iconBtn}>
          <DotsIcon />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>

        <Text style={styles.title}>You're up next</Text>
        <Text style={styles.subtitle}>We are connecting you to a specialist.</Text>

        {/* Timer circle */}
        <View style={styles.timerWrapper}>
          <Text style={styles.estWait}>EST. WAIT</Text>
          <View style={styles.timeValue}>
            <Text style={styles.timeNumber}>{wait}</Text>
            <Text style={styles.timeUnit}>sec</Text>
          </View>
        </View>

        {/* Doctor profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=150&h=150' }}
              style={styles.avatar}
            />
            <View style={styles.statusDot}>
              <VideoIcon />
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Kwame Ansah</Text>
            <Text style={styles.profileRole}>Physician Assistant</Text>
            <View style={styles.profileRating}>
              <Text style={styles.starIcon}>★</Text>
              <Text style={styles.ratingText}>4.9 </Text>
              <Text style={styles.reviewCount}>(120+ reviews)</Text>
            </View>
          </View>

          <View style={styles.infoIconWrapper}>
            <InfoIcon />
          </View>
        </View>

        {/* Tip card */}
        <View style={styles.tipCard}>
          <View style={styles.tipIconWrapper}>
            <BulbIcon />
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>While you wait</Text>
            <Text style={styles.tipText}>
              Please relax and feel comfortable there is nothing to be afraid of.{'\n'}
              ensure you are in a quiet, well-lit place for the consultation.
            </Text>
          </View>
        </View>

      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.btnPrimary} onPress={handleCheckConnection} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>Check Connection</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={handleCancel} activeOpacity={0.7}>
          <Text style={styles.btnSecondaryText}>Cancel Appointment</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_MAIN,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: TEXT_GRAY,
    textTransform: 'uppercase',
  },

  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 8,
    marginTop: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: TEXT_GRAY,
    marginBottom: 40,
    textAlign: 'center',
  },

  // Timer circle
  timerWrapper: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 12,
    borderColor: PRIMARY_RED,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    backgroundColor: '#fbfbfb',
  },
  estWait: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_LIGHT,
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  timeValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  timeNumber: {
    fontSize: 42,
    fontWeight: '700',
    color: TEXT_DARK,
    lineHeight: 50,
  },
  timeUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: TEXT_GRAY,
  },

  // Profile card
  profileCard: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderTopWidth: 3,
    borderTopColor: '#fed7aa',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 15,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e2e8f0',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: STATUS_GREEN,
    borderWidth: 2,
    borderColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 13,
    color: TEXT_GRAY,
    marginBottom: 4,
  },
  profileRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 14,
    color: STAR_GOLD,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  reviewCount: {
    fontSize: 12,
    fontWeight: '400',
    color: TEXT_LIGHT,
  },
  infoIconWrapper: {
    paddingLeft: 8,
  },

  // Tip card
  tipCard: {
    width: '100%',
    backgroundColor: TIP_BG,
    borderWidth: 1,
    borderColor: TIP_BORDER,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipIconWrapper: {
    marginTop: 2,
    flexShrink: 0,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12,
    color: TEXT_GRAY,
    lineHeight: 18,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 0,
  },
  btnPrimary: {
    width: '100%',
    backgroundColor: PRIMARY_RED,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: PRIMARY_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 4,
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  btnSecondary: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: TEXT_GRAY,
    fontSize: 14,
    fontWeight: '600',
  },
});
