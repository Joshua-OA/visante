import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Keyboard,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Rect, Path, Circle } from 'react-native-svg';
import { useTriageSession as useRealtimeSession } from '../hooks/useTriageSession';
import { textChat } from '../services/restApi';
import { buildTriageSystemPrompt, TRIAGE_COMPLETE_TOOL, SAVE_USER_PROFILE_TOOL } from '../utils/triagePrompt';
import { saveUserProfile } from '../services/firestoreService';
import { showErrorToast } from '../utils/toast';

// ─── Colors ─────────────────────────────────────────────────────────────────
const BG = '#faf9f6';
const ACCENT_TOP = '#f5a782';
const ACCENT_BTM = '#ba464a';
const TEXT_DARK = '#2b2b2b';
const TEXT_MUTED = '#717171';
const TEXT_GRAY = '#a8a8a8';
const BORDER = '#eaeaea';
const WHITE = '#ffffff';
const MIC_RING = '#f4dbdb';
const AI_BLUE = '#3b82f6';
const USER_ORANGE = '#f47b2a';

// ─── Waveform ─────────────────────────────────────────────────────────────────
const BASE_HEIGHTS = [15, 25, 40, 65, 35, 80, 45, 95, 115, 75, 45, 85, 35, 60, 40, 25, 15];
const BASE_OPACITIES = [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1, 1, 1, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5];

function WaveBar({ baseHeight, baseOpacity, isActive, color = ACCENT_TOP }) {
  const anim = useRef(new Animated.Value(baseHeight)).current;
  const loopRef = useRef(null);

  useEffect(() => {
    if (loopRef.current) { loopRef.current.stop(); loopRef.current = null; }
    if (isActive) {
      const randomTarget = () => Math.max(8, Math.min(115, baseHeight * (0.5 + Math.random() * 1.8)));
      const randomDur = () => 200 + Math.random() * 300;
      const animate = () => {
        loopRef.current = Animated.sequence([
          Animated.timing(anim, { toValue: randomTarget(), duration: randomDur(), useNativeDriver: false }),
          Animated.timing(anim, { toValue: randomTarget(), duration: randomDur(), useNativeDriver: false }),
        ]);
        loopRef.current.start(({ finished }) => { if (finished) animate(); });
      };
      animate();
    } else {
      Animated.timing(anim, { toValue: baseHeight, duration: 400, useNativeDriver: false }).start();
    }
    return () => { if (loopRef.current) loopRef.current.stop(); };
  }, [isActive]);

  return (
    <Animated.View style={{ width: 6, height: anim, borderRadius: 10, opacity: baseOpacity, overflow: 'hidden' }}>
      <View style={{ flex: 1, backgroundColor: color }} />
    </Animated.View>
  );
}

// ─── Pulsing dot ─────────────────────────────────────────────────────────────
function PulseDot({ color, delay }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 400, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity: anim }} />
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────
const CloseIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={TEXT_DARK} strokeWidth={2.5} strokeLinecap="round">
    <Line x1="18" y1="6" x2="6" y2="18" /><Line x1="6" y1="6" x2="18" y2="18" />
  </Svg>
);
const MicIcon = ({ size = 32, color = WHITE }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <Line x1="12" y1="19" x2="12" y2="22" />
  </Svg>
);
const StopIcon = () => (
  <Svg width={32} height={32} viewBox="0 0 24 24" fill={WHITE}>
    <Rect x="3" y="3" width="18" height="18" rx="4" />
  </Svg>
);
const AlertIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Line x1="12" y1="8" x2="12" y2="12" />
    <Line x1="12" y1="16" x2="12.01" y2="16" />
  </Svg>
);
const SendIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="22" y1="2" x2="11" y2="13" />
    <Path d="M22 2L15 22 11 13 2 9l20-7z" />
  </Svg>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function HomeScreen({ onSubmit, onClose, userProfile = null, phoneNumber = null, onProfileCollected = null }) {
  const insets = useSafeAreaInsets();
  const [symptomText, setSymptomText] = useState('');
  const [isSubmittingText, setIsSubmittingText] = useState(false);
  const [language, setLanguage] = useState('en');

  const {
    sessionState, error, transcriptLines, permissionDenied,
    startSession, endSession, toggleRecording, isRecording,
  } = useRealtimeSession({
    onTriageComplete: (summary) => onSubmit?.(summary),
    onProfileCollected,
    language,
    userProfile,
    phoneNumber,
  });

  const isConnecting = sessionState === 'connecting';
  const isListening = sessionState === 'listening';
  const isAiSpeaking = sessionState === 'ai_speaking';
  const isProcessing = sessionState === 'processing';
  const isUserRecording = sessionState === 'recording';
  const isActive = isConnecting || isListening || isAiSpeaking || isProcessing || isUserRecording;
  const hasError = sessionState === 'error';

  const badgeLabel = isConnecting ? 'CONNECTING…'
    : isUserRecording ? 'LISTENING…'
      : isProcessing ? 'THINKING…'
        : isAiSpeaking ? 'AI SPEAKING'
          : isListening ? 'READY'
            : hasError ? 'TAP TO RETRY'
              : 'CONNECTING…';

  const waveColor = isAiSpeaking ? AI_BLUE : isUserRecording ? USER_ORANGE : ACCENT_TOP;
  const waveActive = isUserRecording || isAiSpeaking;

  const handleMicPress = useCallback(async () => {
    Keyboard.dismiss();
    try {
      if (isListening || isUserRecording) {
        if (toggleRecording) {
          await toggleRecording();
          return;
        }
        endSession();
      } else if (isActive) {
        endSession();
      } else {
        await startSession();
      }
    } catch (e) {
      console.error('[HomeScreen] handleMicPress error:', e);
      showErrorToast(e);
    }
  }, [isActive, isListening, isUserRecording, toggleRecording, startSession, endSession]);

  // ── Text submit — send through AI for proper triage analysis ──
  const handleTextSubmit = useCallback(async () => {
    const text = symptomText.trim();
    if (!text || isSubmittingText) return;

    Keyboard.dismiss();
    setIsSubmittingText(true);

    try {
      const systemPrompt = buildTriageSystemPrompt(userProfile);
      const tools = userProfile
        ? [TRIAGE_COMPLETE_TOOL]
        : [TRIAGE_COMPLETE_TOOL, SAVE_USER_PROFILE_TOOL];

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ];

      console.log('[HomeScreen] handleTextSubmit: sending text to AI...');
      let result = await textChat(messages, tools);

      // Handle save_user_profile tool call
      if (result.toolCall?.name === 'save_user_profile') {
        let profileArgs;
        try { profileArgs = JSON.parse(result.toolCall.arguments); } catch (_) { }
        if (profileArgs && phoneNumber) {
          try { await saveUserProfile({ phoneNumber, ...profileArgs }); } catch (e) { console.warn('Failed to save profile:', e); }
        }
        if (profileArgs) {
          onProfileCollected?.({ name: profileArgs.name, age: profileArgs.age, gender: profileArgs.gender });
        }
        // Continue conversation to get triage
        if (result.transcript) messages.push({ role: 'assistant', content: result.transcript });
        messages.push({ role: 'user', content: '[profile saved — continue with symptom assessment and complete triage]' });
        result = await textChat(messages, [TRIAGE_COMPLETE_TOOL]);
      }

      // Handle complete_triage tool call
      if (result.toolCall?.name === 'complete_triage') {
        let args;
        try { args = JSON.parse(result.toolCall.arguments); } catch (_) {
          throw new Error('Could not parse triage summary from AI.');
        }
        console.log('[HomeScreen] handleTextSubmit: triage complete');
        onSubmit?.(args);
        return;
      }

      // If AI didn't trigger triage on first pass, ask it to complete
      if (result.transcript) messages.push({ role: 'assistant', content: result.transcript });
      messages.push({
        role: 'user',
        content: '[Based on what the patient described, please complete the triage assessment now using the complete_triage tool. Make reasonable inferences for any missing information.]',
      });
      const followUp = await textChat(messages, [TRIAGE_COMPLETE_TOOL]);

      if (followUp.toolCall?.name === 'complete_triage') {
        let args;
        try { args = JSON.parse(followUp.toolCall.arguments); } catch (_) {
          throw new Error('Could not parse triage summary from AI.');
        }
        console.log('[HomeScreen] handleTextSubmit: triage complete (follow-up)');
        onSubmit?.(args);
        return;
      }

      // Fallback — construct a basic summary from text
      console.warn('[HomeScreen] handleTextSubmit: AI did not trigger triage — using fallback');
      onSubmit?.({
        chief_complaint: text,
        symptom_duration: 'unknown',
        severity: null,
        associated_symptoms: [],
        medical_history: '',
        ai_recommendation: followUp.transcript || 'Based on your symptoms, we recommend visiting a pharmacy or booking a nurse for a vitals check.',
        urgency_level: 'moderate',
      });
    } catch (e) {
      console.error('[HomeScreen] handleTextSubmit error:', e);
      showErrorToast(e, 'Could Not Analyze Symptoms');
      // Fallback so the user isn't stuck
      onSubmit?.({
        chief_complaint: text,
        symptom_duration: 'unknown',
        severity: null,
        associated_symptoms: [],
        medical_history: '',
        ai_recommendation: 'Patient submitted symptoms via text. Clinical assessment recommended.',
        urgency_level: 'moderate',
      });
    } finally {
      setIsSubmittingText(false);
    }
  }, [symptomText, isSubmittingText, userProfile, phoneNumber, onSubmit, onProfileCollected]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={styles.header}>
        {onClose ? (
          <TouchableOpacity style={styles.iconBtn} onPress={() => { endSession(); onClose(); }}>
            <CloseIcon />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
        <Image
          source={require('../assets/visante-blue.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.iconBtn} />
      </View>

      {/* ── Error / permission banner ── */}
      {(hasError || permissionDenied) && (
        <View style={styles.errorBanner}>
          <AlertIcon />
          <Text style={styles.errorText} numberOfLines={2}>
            {error ?? 'Microphone permission required.'}
          </Text>
          {permissionDenied ? (
            <TouchableOpacity onPress={() => Linking.openSettings()} activeOpacity={0.8}>
              <Text style={styles.errorAction}>Settings</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={startSession} activeOpacity={0.8}>
              <Text style={styles.errorAction}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Body ── */}
      <View style={styles.body}>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.h1}>How can I help{'\n'}you today?</Text>
          <Text style={styles.subtitle}>
            {isActive
              ? 'Speak naturally — the mic auto-detects when you stop.'
              : 'Tap the mic or type your symptoms below.'}
          </Text>
        </View>

        {/* Waveform area */}
        <View style={styles.waveBlock}>
          <View style={styles.soundwaveContainer}>
            {BASE_HEIGHTS.map((h, i) => (
              <WaveBar
                key={i}
                baseHeight={h}
                baseOpacity={BASE_OPACITIES[i]}
                isActive={waveActive}
                color={waveColor}
              />
            ))}
          </View>
          <View style={styles.listeningBadge}>
            <View style={styles.dots}>
              <PulseDot color="#f6985d" delay={0} />
              <PulseDot color="#ce5a55" delay={150} />
              <PulseDot color="#ba464a" delay={300} />
            </View>
            <Text style={styles.listeningText}>{badgeLabel}</Text>
          </View>
        </View>

      </View>

      {/* ── Bottom: Text input + Submit + Mic ── */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 12 }]}>

        {/* Text input row */}
        <View style={styles.textInputRow}>
          <View style={styles.textInputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Type your symptoms here..."
              placeholderTextColor={TEXT_GRAY}
              value={symptomText}
              onChangeText={setSymptomText}
              multiline
              maxLength={500}
              editable={!isSubmittingText}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!symptomText.trim() || isSubmittingText) && styles.sendBtnDisabled,
            ]}
            disabled={!symptomText.trim() || isSubmittingText}
            onPress={handleTextSubmit}
            activeOpacity={0.85}
          >
            {isSubmittingText ? (
              <Text style={styles.sendBtnDots}>...</Text>
            ) : (
              <SendIcon />
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Mic button */}
        <View style={styles.micBlock}>
          <View style={styles.micRing}>
            <TouchableOpacity
              style={[
                styles.micBtn,
                (isUserRecording || isProcessing || isAiSpeaking) && styles.micBtnActive,
                isConnecting && styles.micBtnConnecting,
              ]}
              onPress={handleMicPress}
              activeOpacity={0.85}
              disabled={isConnecting || isProcessing || isAiSpeaking || isSubmittingText}
            >
              {isUserRecording ? <StopIcon /> : <MicIcon />}
            </TouchableOpacity>
          </View>
          <Text style={styles.tapText}>
            {isConnecting ? 'Connecting…'
              : isUserRecording ? 'Listening… tap to send'
                : isProcessing ? 'Thinking…'
                  : isAiSpeaking ? 'AI is speaking…'
                    : isListening ? 'Tap to speak'
                      : hasError ? 'Tap to retry'
                        : 'Tap to start'}
          </Text>
        </View>
      </View>

    </KeyboardAvoidingView>
  );
}

// ─── Responsive helpers ─────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const MIC_SIZE = Math.min(SCREEN_W * 0.17, 64);
const MIC_RING_SIZE = Math.min(SCREEN_W * 0.21, 80);
const SEND_SIZE = Math.min(SCREEN_W * 0.12, 44);

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 24,
  },

  header: {
    height: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: WHITE,
    fontSize: 13,
    fontWeight: '500',
  },
  errorAction: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  body: {
    flex: 1,
  },

  titleBlock: {
    alignItems: 'center',
    paddingTop: '2%',
    paddingBottom: '1%',
  },
  h1: {
    textAlign: 'center',
    fontSize: 30,
    color: TEXT_DARK,
    fontWeight: '700',
    lineHeight: 38,
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 15,
    color: TEXT_MUTED,
    lineHeight: 22,
    paddingHorizontal: 10,
  },

  // Waveform
  waveBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  soundwaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 100,
    width: '100%',
  },
  listeningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  listeningText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7a7a7a',
    letterSpacing: 1,
  },

  // ── Bottom section (text input + mic) ──
  bottomSection: {
    gap: 12,
  },

  // Text input row
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  textInputWrapper: {
    flex: 1,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  textInput: {
    fontSize: 15,
    color: TEXT_DARK,
    lineHeight: 20,
    textAlignVertical: 'top',
    maxHeight: 60,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendBtn: {
    width: SEND_SIZE,
    height: SEND_SIZE,
    borderRadius: SEND_SIZE / 2,
    backgroundColor: ACCENT_BTM,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT_BTM,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  sendBtnDisabled: { opacity: 0.35 },
  sendBtnDots: { color: WHITE, fontSize: 18, fontWeight: '700' },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_GRAY,
  },

  // Mic button
  micBlock: {
    alignItems: 'center',
    gap: 8,
  },
  micRing: {
    width: MIC_RING_SIZE,
    height: MIC_RING_SIZE,
    backgroundColor: MIC_RING,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtn: {
    width: MIC_SIZE,
    height: MIC_SIZE,
    backgroundColor: ACCENT_BTM,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT_BTM,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  micBtnActive: { backgroundColor: '#8b2e32' },
  micBtnConnecting: { backgroundColor: '#94a3b8', opacity: 0.7 },
  tapText: { color: TEXT_MUTED, fontSize: 13, fontWeight: '500' },
});
