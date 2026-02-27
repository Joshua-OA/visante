import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Polyline, Path, Circle } from 'react-native-svg';
import { subscribeToAppointment } from '../services/firestoreService';
import { showErrorToast, showInfoToast } from '../utils/toast';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Colors ──────────────────────────────────────────────────────────────────
const RED_END    = '#ff3b30';
const WHITE      = '#ffffff';
const TEXT_WHITE = '#ffffff';
const GREEN      = '#10b981';
const GREEN_SOFT = '#ecfdf5';
const GREEN_BORDER = '#a7f3d0';
const BLUE       = '#3b82f6';

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const PhoneSlashIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none"
    stroke={WHITE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="1" y1="1" x2="23" y2="23" />
    <Path d="M16.5 16.5L19.59 13.41A2 2 0 0 0 20 12.18V9.5a2 2 0 0 0-1.5-1.94M9.17 4.24A2 2 0 0 1 9.5 4h2.68a2 2 0 0 1 1.41.59l2.13 2.13" />
    <Path d="M14.05 14.05L9.58 9.58M4.47 4.47L3.41 3.41A2 2 0 0 0 2 5v2.18a2 2 0 0 0 .41 1.23L4.5 10.5a2 2 0 0 0 1.5.68h1.18" />
  </Svg>
);

const ChevronLeft = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="15 18 9 12 15 6" />
  </Svg>
);

const HeartIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"
    stroke={GREEN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </Svg>
);

const ChevronDown = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"
    stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="6 9 12 15 18 9" />
  </Svg>
);

const ChevronUp = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"
    stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="18 15 12 9 6 15" />
  </Svg>
);

// ─── Call timer helper ──────────────────────────────────────────────────────
function formatCallTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Generate a unique room name from appointmentId ─────────────────────────
function getRoomName(appointmentId) {
  const base = appointmentId || `visante-${Date.now()}`;
  return `visante-${base}`.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function VideoScreen({ onEnd, appointmentId, userProfile, triageSummary }) {
  const insets = useSafeAreaInsets();
  const [elapsed, setElapsed] = useState(0);
  const [webviewReady, setWebviewReady] = useState(false);
  const [vitals, setVitals] = useState(null);
  const [vitalsExpanded, setVitalsExpanded] = useState(false);
  const [vitalsSentToDoctor, setVitalsSentToDoctor] = useState(false);
  const intervalRef = useRef(null);
  const webviewRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const patientName = userProfile?.name || 'Patient';
  const roomName = getRoomName(appointmentId);

  // Jitsi Meet URL
  const jitsiUrl = `https://meet.jit.si/${roomName}#config.prejoinConfig.enabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.disableDeepLinking=true&config.toolbarButtons=["microphone","camera","hangup","chat"]&userInfo.displayName=${encodeURIComponent(patientName)}`;

  // Call timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed(t => t + 1);
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Subscribe to appointment for vitals data
  useEffect(() => {
    if (!appointmentId) return;
    const unsub = subscribeToAppointment(appointmentId, (appt) => {
      if (appt.vitals) {
        setVitals(appt.vitals);
      }
    });
    return unsub;
  }, [appointmentId]);

  // Animate vitals panel
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: vitalsExpanded ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [vitalsExpanded]);

  // Send vitals to doctor via Jitsi chat when they become available
  useEffect(() => {
    if (!vitals || !webviewRef.current || vitalsSentToDoctor) return;

    try {
      const vitalsMsg = `📋 Patient Vitals — ${patientName}\n` +
        `━━━━━━━━━━━━━━━\n` +
        (vitals.blood_pressure ? `🩸 BP: ${vitals.blood_pressure}\n` : '') +
        (vitals.heart_rate ? `❤️ HR: ${vitals.heart_rate}\n` : '') +
        (vitals.temperature ? `🌡️ Temp: ${vitals.temperature}\n` : '') +
        (vitals.spo2 ? `💨 SpO2: ${vitals.spo2}\n` : '') +
        `━━━━━━━━━━━━━━━\n` +
        (triageSummary?.chief_complaint ? `Chief complaint: ${triageSummary.chief_complaint}\n` : '') +
        (triageSummary?.urgency_level ? `Urgency: ${triageSummary.urgency_level}\n` : '') +
        `Sent via Visante`;

      // Inject a chat message into the Jitsi iframe
      const injectChatMessage = `
        (function() {
          try {
            // Try to send via Jitsi's internal API
            var checkApi = setInterval(function() {
              if (window.APP && window.APP.conference && window.APP.conference._room) {
                clearInterval(checkApi);
                window.APP.conference._room.sendTextMessage(${JSON.stringify(vitalsMsg)});
              }
            }, 1000);
            // Clear after 10s if API not found
            setTimeout(function() { clearInterval(checkApi); }, 10000);
          } catch(e) {}
          true;
        })();
      `;

      webviewRef.current.injectJavaScript(injectChatMessage);
      setVitalsSentToDoctor(true);
      showInfoToast('Vitals Shared', 'Your vitals have been sent to the doctor in the chat.');
    } catch (e) {
      console.warn('[VideoScreen] Could not send vitals to doctor:', e);
    }
  }, [vitals, webviewReady, vitalsSentToDoctor]);

  function handleEnd() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'End Consultation',
      'Are you sure you want to end this video consultation?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End Call', style: 'destructive', onPress: () => onEnd && onEnd() },
      ]
    );
  }

  function handleWebViewMessage(event) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'hangup' || data.event === 'videoConferenceLeft') {
        onEnd && onEnd();
      }
    } catch {
      // Not JSON — ignore
    }
  }

  function handleWebViewError() {
    showErrorToast(
      'video connection',
      'Video Connection Issue'
    );
  }

  const injectedJS = `
    (function() {
      window.addEventListener('location-change', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'hangup' }));
      });
      var checkApi = setInterval(function() {
        if (window.JitsiMeetExternalAPI || window.APP) {
          clearInterval(checkApi);
          try {
            if (window.APP && window.APP.conference) {
              window.APP.conference._room.on('conference.left', function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'hangup' }));
              });
            }
          } catch(e) {}
        }
      }, 2000);
      true;
    })();
  `;

  const hasVitals = vitals && (vitals.blood_pressure || vitals.heart_rate || vitals.temperature || vitals.spo2);
  const vitalsCount = hasVitals ? [vitals.blood_pressure, vitals.heart_rate, vitals.temperature, vitals.spo2].filter(Boolean).length : 0;

  // Animated panel height
  const panelHeight = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.min(vitalsCount * 36 + 16, 170)],
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Jitsi Meet WebView — full screen */}
      <WebView
        ref={webviewRef}
        source={{ uri: jitsiUrl }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        mediaCapturePermissionGrantType="grant"
        injectedJavaScript={injectedJS}
        onMessage={handleWebViewMessage}
        onLoad={() => setWebviewReady(true)}
        onError={handleWebViewError}
        onHttpError={handleWebViewError}
        allowsFullscreenVideo
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>Connecting to video call...</Text>
            <Text style={styles.loadingSubtext}>Room: {roomName}</Text>
          </View>
        )}
      />

      {/* Floating header overlay */}
      <View style={[styles.header, { top: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleEnd} activeOpacity={0.8}>
          <ChevronLeft />
        </TouchableOpacity>

        <View style={styles.callInfo}>
          <View style={styles.timerContainer}>
            <View style={styles.recordingDot} />
            <Text style={styles.timerText}>{formatCallTime(elapsed)}</Text>
          </View>
        </View>
      </View>

      {/* Vitals floating panel — shows patient vitals to share with doctor */}
      {hasVitals && (
        <View style={[styles.vitalsFloating, { top: insets.top + 56 }]}>
          <TouchableOpacity
            style={styles.vitalsToggle}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setVitalsExpanded(!vitalsExpanded);
            }}
            activeOpacity={0.8}
          >
            <HeartIcon />
            <Text style={styles.vitalsToggleText}>
              Vitals {vitalsSentToDoctor ? '(shared)' : ''}
            </Text>
            {vitalsExpanded ? <ChevronUp /> : <ChevronDown />}
          </TouchableOpacity>

          <Animated.View style={[styles.vitalsPanel, { height: panelHeight }]}>
            <View style={styles.vitalsPanelInner}>
              {vitals.blood_pressure && (
                <View style={styles.vitalRow}>
                  <Text style={styles.vitalLabel}>BP</Text>
                  <Text style={styles.vitalValue}>{vitals.blood_pressure}</Text>
                </View>
              )}
              {vitals.heart_rate && (
                <View style={styles.vitalRow}>
                  <Text style={styles.vitalLabel}>HR</Text>
                  <Text style={styles.vitalValue}>{vitals.heart_rate}</Text>
                </View>
              )}
              {vitals.temperature && (
                <View style={styles.vitalRow}>
                  <Text style={styles.vitalLabel}>Temp</Text>
                  <Text style={styles.vitalValue}>{vitals.temperature}</Text>
                </View>
              )}
              {vitals.spo2 && (
                <View style={styles.vitalRow}>
                  <Text style={styles.vitalLabel}>SpO2</Text>
                  <Text style={styles.vitalValue}>{vitals.spo2}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </View>
      )}

      {/* Floating end call button */}
      <View style={[styles.endCallFloating, { bottom: insets.bottom + 20 }]}>
        <TouchableOpacity style={styles.endCallBtn} onPress={handleEnd} activeOpacity={0.8}>
          <PhoneSlashIcon />
        </TouchableOpacity>
        <Text style={styles.endLabel}>END CALL</Text>
      </View>

      {/* Room info banner (for doctor to join) */}
      {webviewReady && (
        <View style={[styles.roomBanner, { bottom: insets.bottom + 100 }]}>
          <Text style={styles.roomBannerText}>Doctor joins at: meet.jit.si/{roomName}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },

  webview: {
    flex: 1,
  },

  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: TEXT_WHITE,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  loadingSubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },

  // Floating header
  header: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callInfo: {
    alignItems: 'flex-end',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
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

  // Vitals floating panel
  vitalsFloating: {
    position: 'absolute',
    left: 16,
    zIndex: 15,
    maxWidth: SCREEN_W * 0.55,
  },
  vitalsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  vitalsToggleText: {
    color: TEXT_WHITE,
    fontSize: 12,
    fontWeight: '600',
  },
  vitalsPanel: {
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: 2,
  },
  vitalsPanelInner: {
    padding: 10,
    gap: 6,
  },
  vitalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  vitalLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vitalValue: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '700',
  },

  // Floating end call
  endCallFloating: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  endCallBtn: {
    width: SCREEN_W * 0.17,
    height: SCREEN_W * 0.17,
    borderRadius: SCREEN_W * 0.085,
    backgroundColor: RED_END,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: RED_END,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 6,
  },
  endLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_WHITE,
  },

  // Room info
  roomBanner: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  roomBannerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '500',
  },
});
