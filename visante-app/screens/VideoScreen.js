import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Line, Polyline, Path, Rect, Circle,
} from 'react-native-svg';

// ─── Colors (mirrors video_Screen.html) ──────────────────────────────────────
const BG_TOP        = '#6b8c8a';
const BG_BOTTOM     = '#94b2af';
const RED_END       = '#ff3b30';
const GREEN_CONN    = '#4cd964';
const FOOTER_BG     = '#e8eded';
const WHITE         = '#ffffff';
const TEXT_DARK     = '#555555';
const TEXT_WHITE    = '#ffffff';

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const ChevronLeft = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="15 18 9 12 15 6" />
  </Svg>
);

const MicOffIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke={TEXT_DARK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="1" y1="1" x2="23" y2="23" />
    <Path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <Path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <Line x1="12" y1="19" x2="12" y2="23" />
    <Line x1="8" y1="23" x2="16" y2="23" />
  </Svg>
);

const VideoOnIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke={TEXT_DARK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M23 7l-7 5 7 5V7z" />
    <Rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </Svg>
);

const PhoneSlashIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none"
    stroke={WHITE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="1" y1="1" x2="23" y2="23" />
    <Path d="M16.5 16.5L19.59 13.41A2 2 0 0 0 20 12.18V9.5a2 2 0 0 0-1.5-1.94M9.17 4.24A2 2 0 0 1 9.5 4h2.68a2 2 0 0 1 1.41.59l2.13 2.13" />
    <Path d="M14.05 14.05L9.58 9.58M4.47 4.47L3.41 3.41A2 2 0 0 0 2 5v2.18a2 2 0 0 0 .41 1.23L4.5 10.5a2 2 0 0 0 1.5.68h1.18" />
  </Svg>
);

const ChatIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke={TEXT_DARK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Svg>
);

const MoreIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke={TEXT_DARK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="1" />
    <Circle cx="19" cy="12" r="1" />
    <Circle cx="5" cy="12" r="1" />
  </Svg>
);

const WifiIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
    stroke={GREEN_CONN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <Path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <Path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <Line x1="12" y1="20" x2="12.01" y2="20" />
  </Svg>
);

const VideoSlashIcon = () => (
  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none"
    stroke={WHITE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="1" y1="1" x2="23" y2="23" />
    <Path d="M15 9.34V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3.34" />
    <Path d="M23 7l-7 5 7 5V7z" />
  </Svg>
);

// ─── Call timer helper ────────────────────────────────────────────────────────
function formatCallTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function VideoScreen({ onEnd }) {
  const insets = useSafeAreaInsets();
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [videoOn, setVideoOn] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed(t => t + 1);
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  function handleEnd() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onEnd && onEnd();
  }

  function toggleMute() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMuted(v => !v);
  }

  function toggleVideo() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVideoOn(v => !v);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Full-screen gradient background */}
      <View style={styles.bgGradient} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onEnd} activeOpacity={0.8}>
          <ChevronLeft />
        </TouchableOpacity>

        <View style={styles.callInfo}>
          <View style={styles.timerContainer}>
            <View style={styles.recordingDot} />
            <Text style={styles.timerText}>{formatCallTime(elapsed)}</Text>
          </View>
          <Text style={styles.doctorName}>Dr. Sarah Mitchell</Text>
        </View>
      </View>

      {/* Patient self-view PIP */}
      <View style={[styles.patientView, { top: insets.top + 76 }]}>
        {/* Placeholder face oval */}
        <View style={styles.patientFace} />
        <Text style={styles.patientText}>PATIENT{'\n'}SELF VIEW</Text>
        <View style={styles.pipCameraIcon}>
          <VideoSlashIcon />
        </View>
      </View>

      {/* Connection status */}
      <View style={styles.connectionStatus}>
        <WifiIcon />
        <Text style={styles.connectionText}>Connection stable</Text>
      </View>

      {/* Controls footer */}
      <View style={[styles.controlsFooter, { marginBottom: insets.bottom + 8 }]}>

        <View style={styles.controlItem}>
          <TouchableOpacity
            style={[styles.controlBtn, muted && styles.controlBtnActive]}
            onPress={toggleMute}
            activeOpacity={0.8}
          >
            <MicOffIcon />
          </TouchableOpacity>
          <Text style={styles.controlLabel}>MUTE</Text>
        </View>

        <View style={styles.controlItem}>
          <TouchableOpacity
            style={[styles.controlBtn, !videoOn && styles.controlBtnActive]}
            onPress={toggleVideo}
            activeOpacity={0.8}
          >
            <VideoOnIcon />
          </TouchableOpacity>
          <Text style={styles.controlLabel}>VIDEO ON</Text>
        </View>

        <View style={[styles.controlItem, styles.endCallContainer]}>
          <TouchableOpacity style={[styles.controlBtn, styles.endCallBtn]} onPress={handleEnd} activeOpacity={0.8}>
            <PhoneSlashIcon />
          </TouchableOpacity>
          <Text style={styles.controlLabel}>END</Text>
        </View>

        <View style={styles.controlItem}>
          <TouchableOpacity style={styles.controlBtn} activeOpacity={0.8}>
            <ChatIcon />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
          <Text style={styles.controlLabel}>CHAT</Text>
        </View>

        <View style={styles.controlItem}>
          <TouchableOpacity style={styles.controlBtn} activeOpacity={0.8}>
            <MoreIcon />
          </TouchableOpacity>
          <Text style={styles.controlLabel}>MORE</Text>
        </View>

      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_TOP,
  },

  bgGradient: {
    ...StyleSheet.absoluteFillObject,
    // Simulate the teal gradient from top to bottom
    backgroundColor: BG_BOTTOM,
    // Top half override via a positioned overlay
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callInfo: {
    alignItems: 'flex-end',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: RED_END,
    marginRight: 8,
  },
  timerText: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: '500',
  },
  doctorName: {
    color: TEXT_WHITE,
    fontSize: 18,
    fontWeight: '600',
  },

  // Patient PIP
  patientView: {
    position: 'absolute',
    right: 20,
    width: 90,
    height: 130,
    backgroundColor: '#8faaa7',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  patientFace: {
    width: 45,
    height: 65,
    backgroundColor: '#fadbd1',
    borderRadius: 30,
    marginBottom: 10,
  },
  patientText: {
    fontSize: 7,
    color: TEXT_WHITE,
    textAlign: 'center',
    lineHeight: 10,
    fontWeight: '600',
  },
  pipCameraIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Connection status
  connectionStatus: {
    position: 'absolute',
    bottom: 130,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 12,
    zIndex: 10,
  },
  connectionText: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: '500',
  },

  // Controls footer
  controlsFooter: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: FOOTER_BG,
    borderRadius: 40,
    paddingVertical: 15,
    paddingHorizontal: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 30,
  },
  controlItem: {
    alignItems: 'center',
  },
  endCallContainer: {
    marginBottom: -5,
  },
  controlBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  controlBtnActive: {
    backgroundColor: '#f1f5f9',
  },
  endCallBtn: {
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: RED_END,
    shadowColor: RED_END,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  controlLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  notificationDot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: RED_END,
    borderWidth: 2,
    borderColor: WHITE,
  },
});
