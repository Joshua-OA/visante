import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Polyline, Circle, Path, Rect } from 'react-native-svg';
import { subscribeToAppointment } from '../services/firestoreService';
import { showErrorToast } from '../utils/toast';

// ─── Colors (mirrors waitng_screen.html) ─────────────────────────────────────
const PRIMARY_RED = '#bb5454';
const TEXT_DARK = '#111827';
const TEXT_GRAY = '#64748b';
const TEXT_LIGHT = '#94a3b8';
const STATUS_GREEN = '#10b981';
const STAR_GOLD = '#f59e0b';
const TIP_BG = '#fdf8f3';
const TIP_BORDER = '#f9ede0';
const TIP_ICON = '#e28e46';
const CARD_BG = '#ffffff';
const BG_MAIN = '#fcfcfc';
const BLUE = '#3b82f6';
const ORANGE = '#f59e0b';

// ─── Icons ───────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke="#475569" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="19" y1="12" x2="5" y2="12" />
    <Polyline points="12 19 5 12 12 5" />
  </Svg>
);

const CloseIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke="#475569" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="18" y1="6" x2="6" y2="18" />
    <Line x1="6" y1="6" x2="18" y2="18" />
  </Svg>
);

const VideoIcon = () => (
  <Svg width={8} height={8} viewBox="0 0 24 24" fill="white"
    stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M23 7l-7 5 7 5V7z" />
    <Rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </Svg>
);

const VideoLargeIcon = ({ color = '#fff' }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M23 7l-7 5 7 5V7z" />
    <Rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </Svg>
);

const ChatIcon = ({ color = '#fff' }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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

const AlertIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke={ORANGE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Line x1="12" y1="8" x2="12" y2="12" />
    <Line x1="12" y1="16" x2="12.01" y2="16" />
  </Svg>
);

// ─── Screen ──────────────────────────────────────────────────────────────────
const INITIAL_WAIT = 8; // seconds to simulate waiting
const DOCTOR_UNAVAILABLE_AFTER = 5; // after 5 seconds, simulate doctor unavailable

export default function WaitingScreen({
  onBack,
  onJoinVideo,
  onJoinChat,
  onCancel,
  appointmentId,
  provider,
  serviceType,
  userProfile,
  triageSummary,
}) {
  const insets = useSafeAreaInsets();
  const [wait, setWait] = useState(INITIAL_WAIT);
  const [doctorAvailable, setDoctorAvailable] = useState(null); // null = checking, true = available, false = unavailable
  const intervalRef = useRef(null);

  // In waiting room, we show the doctor (not the nurse/pharmacy)
  const displayName = 'Dr. Sarah Mitchell';
  const displayRole = 'General Practitioner';
  const displayAvatar = null;
  const displayRating = '4.9';

  // Countdown timer — after countdown, determine doctor availability
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

  // When countdown finishes, simulate doctor availability check
  useEffect(() => {
    if (wait === 0 && doctorAvailable === null) {
      // Simulate: 50% chance doctor is available for video, otherwise text chat
      // In production, this would check Firestore for doctor's online status
      const isAvailable = Math.random() > 0.5;
      setDoctorAvailable(isAvailable);
      Haptics.notificationAsync(
        isAvailable
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
    }
  }, [wait, doctorAvailable]);

  // Real-time Firestore listener for appointment status
  useEffect(() => {
    if (!appointmentId) return;
    const unsub = subscribeToAppointment(appointmentId, (appt) => {
      if (appt.status === 'cancelled') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onCancel && onCancel();
      }
      // If doctor explicitly comes online in Firestore
      if (appt.status === 'doctor_online') {
        setDoctorAvailable(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    });
    return unsub;
  }, [appointmentId]);

  function handleJoinVideo() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onJoinVideo && onJoinVideo();
  }

  function handleJoinChat() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onJoinChat && onJoinChat();
  }

  function handleCancel() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancel && onCancel();
  }

  const isWaiting = wait > 0;
  const showOptions = !isWaiting && doctorAvailable !== null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.iconBtn}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WAITING ROOM</Text>
        <TouchableOpacity onPress={handleCancel} activeOpacity={0.7} style={styles.iconBtn}>
          <CloseIcon />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>

        {isWaiting ? (
          <>
            <Text style={styles.title}>You're up next</Text>
            <Text style={styles.subtitle}>Connecting you to a doctor...</Text>

            {/* Timer circle */}
            <View style={styles.timerWrapper}>
              <Text style={styles.estWait}>EST. WAIT</Text>
              <View style={styles.timeValue}>
                <Text style={styles.timeNumber}>{wait}</Text>
                <Text style={styles.timeUnit}>sec</Text>
              </View>
            </View>
          </>
        ) : doctorAvailable ? (
          <>
            <Text style={styles.title}>Doctor is available!</Text>
            <Text style={styles.subtitle}>Dr. Sarah Mitchell is ready for your video consultation.</Text>

            {/* Green status indicator */}
            <View style={[styles.statusCircle, { backgroundColor: STATUS_GREEN + '18', borderColor: STATUS_GREEN + '40' }]}>
              <VideoLargeIcon color={STATUS_GREEN} />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>Doctor is busy</Text>
            <Text style={styles.subtitle}>
              Dr. Sarah Mitchell is currently with another patient.{'\n'}
              You can start a text chat — send voice notes and the doctor will reply when available.
            </Text>

            {/* Orange status indicator */}
            <View style={[styles.statusCircle, { backgroundColor: ORANGE + '18', borderColor: ORANGE + '40' }]}>
              <AlertIcon />
            </View>
          </>
        )}

        {/* Doctor profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            ) : (
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=150&h=150' }}
                style={styles.avatar}
              />
            )}
            <View style={[styles.statusDot, { backgroundColor: doctorAvailable ? STATUS_GREEN : ORANGE }]}>
              {doctorAvailable !== false && <VideoIcon />}
            </View>
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

          <View style={styles.infoIconWrapper}>
            <InfoIcon />
          </View>
        </View>

        {/* Tip card */}
        {isWaiting && (
          <View style={styles.tipCard}>
            <View style={styles.tipIconWrapper}>
              <BulbIcon />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>While you wait</Text>
              <Text style={styles.tipText}>
                Please relax and feel comfortable.{'\n'}
                Ensure you are in a quiet, well-lit place for the consultation.
              </Text>
            </View>
          </View>
        )}

        {/* Unavailable info card */}
        {showOptions && !doctorAvailable && (
          <View style={styles.unavailableCard}>
            <View style={styles.tipIconWrapper}>
              <ChatIcon color={BLUE} />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>How text chat works</Text>
              <Text style={styles.tipText}>
                Send text messages or voice notes describing your symptoms.{'\n'}
                The doctor will review and respond as soon as they're free.
              </Text>
            </View>
          </View>
        )}

      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {showOptions && doctorAvailable ? (
          <>
            <TouchableOpacity style={styles.btnVideo} onPress={handleJoinVideo} activeOpacity={0.85}>
              <VideoLargeIcon color="#fff" />
              <Text style={styles.btnVideoText}>Join Video Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnChatAlt} onPress={handleJoinChat} activeOpacity={0.7}>
              <Text style={styles.btnChatAltText}>Prefer text chat instead</Text>
            </TouchableOpacity>
          </>
        ) : showOptions && !doctorAvailable ? (
          <>
            <TouchableOpacity style={styles.btnChat} onPress={handleJoinChat} activeOpacity={0.85}>
              <ChatIcon color="#fff" />
              <Text style={styles.btnChatText}>Start Text Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleCancel} activeOpacity={0.7}>
              <Text style={styles.btnSecondaryText}>Return to Dashboard</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.btnWaiting}>
              <Text style={styles.btnWaitingText}>Checking doctor availability...</Text>
            </View>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleCancel} activeOpacity={0.7}>
              <Text style={styles.btnSecondaryText}>Cancel & Return to Dashboard</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

    </View>
  );
}

// ─── Responsive helpers ─────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const TIMER_SIZE = Math.min(SCREEN_W * 0.48, 190);
const STATUS_SIZE = Math.min(SCREEN_W * 0.26, 100);
const AVATAR_SIZE = Math.min(SCREEN_W * 0.15, 56);

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
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Timer circle
  timerWrapper: {
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    borderRadius: TIMER_SIZE / 2,
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

  // Status circle (for doctor available/unavailable)
  statusCircle: {
    width: STATUS_SIZE,
    height: STATUS_SIZE,
    borderRadius: STATUS_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
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
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#e2e8f0',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
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

  // Unavailable info card
  unavailableCard: {
    width: '100%',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  btnVideo: {
    width: '100%',
    backgroundColor: STATUS_GREEN,
    borderRadius: 12,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
    shadowColor: STATUS_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 4,
  },
  btnVideoText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnChat: {
    width: '100%',
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 4,
  },
  btnChatText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnChatAlt: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnChatAltText: {
    color: BLUE,
    fontSize: 14,
    fontWeight: '600',
  },
  btnWaiting: {
    width: '100%',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnWaitingText: {
    color: TEXT_GRAY,
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
