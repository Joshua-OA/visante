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
  ScrollView,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Rect, Path, Circle } from 'react-native-svg';
import { useTriageSession as useRealtimeSession } from '../hooks/useTriageSession';

// ─── Colors ─────────────────────────────────────────────────────────────────
const BG         = '#faf9f6';
const ACCENT_TOP = '#f5a782';
const ACCENT_BTM = '#ba464a';
const TEXT_DARK  = '#2b2b2b';
const TEXT_MUTED = '#717171';
const TEXT_GRAY  = '#a8a8a8';
const BORDER     = '#eaeaea';
const WHITE      = '#ffffff';
const MIC_RING   = '#f4dbdb';
const AI_BLUE    = '#3b82f6';
const USER_ORANGE= '#f47b2a';

// ─── Waveform ─────────────────────────────────────────────────────────────────
const BASE_HEIGHTS   = [15, 25, 40, 65, 35, 80, 45, 95, 115, 75, 45, 85, 35, 60, 40, 25, 15];
const BASE_OPACITIES = [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1, 1, 1, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5];

function WaveBar({ baseHeight, baseOpacity, isActive, color = ACCENT_TOP }) {
  const anim = useRef(new Animated.Value(baseHeight)).current;
  const loopRef = useRef(null);

  useEffect(() => {
    if (loopRef.current) { loopRef.current.stop(); loopRef.current = null; }
    if (isActive) {
      const randomTarget = () => Math.max(8, Math.min(115, baseHeight * (0.5 + Math.random() * 1.8)));
      const randomDur    = () => 200 + Math.random() * 300;
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
        Animated.timing(anim, { toValue: 1,   duration: 400, useNativeDriver: true }),
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
const DotsIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill={TEXT_DARK}>
    <Circle cx="5" cy="12" r="2" /><Circle cx="12" cy="12" r="2" /><Circle cx="19" cy="12" r="2" />
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
const KeyboardIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
    <Path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" />
  </Svg>
);
const ShieldIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={TEXT_GRAY} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <Path d="M9 12l2 2 4-4" />
  </Svg>
);
const AlertIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Line x1="12" y1="8" x2="12" y2="12" />
    <Line x1="12" y1="16" x2="12.01" y2="16" />
  </Svg>
);

// ─── Transcript line ──────────────────────────────────────────────────────────
function TranscriptLine({ role, text }) {
  const isAi = role === 'ai';
  return (
    <View style={[styles.txLine, isAi ? styles.txLineAi : styles.txLineUser]}>
      <Text style={styles.txRole}>{isAi ? 'Visante AI' : 'You'}</Text>
      <Text style={styles.txText}>{text}</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function HomeScreen({ onSubmit }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode]           = useState('voice');
  const [symptomText, setSymptomText] = useState('');

  const {
    sessionState, error, transcriptLines, permissionDenied,
    startSession, endSession, toggleRecording, isRecording,
  } = useRealtimeSession({
    onTriageComplete: (summary) => onSubmit?.(summary),
  });

  // Auto-start the session as soon as the screen mounts
  useEffect(() => {
    startSession();
  }, []);

  const isConnecting  = sessionState === 'connecting';
  const isListening   = sessionState === 'listening';
  const isAiSpeaking  = sessionState === 'ai_speaking';
  const isProcessing  = sessionState === 'processing';
  const isUserRecording = sessionState === 'recording';
  const isActive      = isConnecting || isListening || isAiSpeaking || isProcessing || isUserRecording;
  const hasError      = sessionState === 'error';

  // Badge label and waveform color reflect current state
  const badgeLabel = isConnecting   ? 'CONNECTING…'
    : isUserRecording               ? 'RECORDING'
    : isProcessing                  ? 'THINKING…'
    : isAiSpeaking                  ? 'AI SPEAKING'
    : isListening                   ? 'TAP TO SPEAK'
    : hasError                      ? 'TAP TO RETRY'
    :                                 'CONNECTING…';

  const waveColor = isAiSpeaking ? AI_BLUE : isUserRecording ? USER_ORANGE : ACCENT_TOP;
  const waveActive = isListening || isAiSpeaking || isUserRecording;

  const handleMicPress = useCallback(async () => {
    if (isListening || isUserRecording) {
      // REST mode: tap to start/stop recording
      if (toggleRecording) {
        await toggleRecording();
        return;
      }
      // Realtime mode: end session
      endSession();
    } else if (isActive) {
      endSession();
    } else {
      await startSession();
    }
  }, [isActive, isListening, isUserRecording, toggleRecording, startSession, endSession]);

  const switchToType  = useCallback(() => { if (isActive) endSession(); setMode('type'); }, [isActive, endSession]);
  const switchToVoice = useCallback(() => setMode('voice'), []);

  const handleTextSubmit = useCallback(() => {
    const textSummary = {
      chief_complaint: symptomText.trim(),
      symptom_duration: 'unknown',
      severity: null,
      associated_symptoms: [],
      vitals: { blood_pressure: null, heart_rate: null, temperature_c: null, spo2_percent: null },
      medical_history: '',
      ai_recommendation: 'Patient submitted symptoms via text. Manual clinical assessment required.',
      urgency_level: 'moderate',
    };
    onSubmit?.(textSummary);
  }, [symptomText, onSubmit]);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn}>
          <CloseIcon />
        </TouchableOpacity>
        <Image
          source={require('../assets/visante-blue.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <TouchableOpacity style={styles.iconBtn}>
          <DotsIcon />
        </TouchableOpacity>
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

      {/* ── Voice mode ── */}
      {mode === 'voice' && (
        <View style={styles.body}>

          {/* Title */}
          <View style={styles.titleBlock}>
            <Text style={styles.h1}>How can I help{'\n'}you today?</Text>
            <Text style={styles.subtitle}>
              {isActive
                ? 'Speak naturally. The AI will guide you through the questions.'
                : 'Tap the microphone and describe your symptoms.'}
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

          {/* Mic button */}
          <View style={styles.micBlock}>
            <View style={styles.micRing}>
              <TouchableOpacity
                style={[
                  styles.micBtn,
                  isActive  && styles.micBtnActive,
                  isConnecting && styles.micBtnConnecting,
                ]}
                onPress={handleMicPress}
                activeOpacity={0.85}
                disabled={isConnecting || isProcessing || isAiSpeaking}
              >
                {isUserRecording ? <StopIcon /> : <MicIcon />}
              </TouchableOpacity>
            </View>
            <Text style={styles.tapText}>
              {isConnecting ? 'Connecting…'
                : isUserRecording ? 'Tap to send'
                : isProcessing ? 'Thinking…'
                : isAiSpeaking ? 'AI is speaking…'
                : isListening ? 'Tap to speak'
                : hasError ? 'Tap to retry'
                : 'Connecting…'}
            </Text>
          </View>

          {/* Switch to text input */}
          <View style={styles.bottomBlock}>
            <TouchableOpacity style={styles.typeBtn} onPress={switchToType} activeOpacity={0.85}>
              <KeyboardIcon />
              <Text style={styles.typeBtnText}>Type your symptoms</Text>
            </TouchableOpacity>
          </View>

        </View>
      )}

      {/* ── Text mode ── */}
      {mode === 'type' && (
        <View style={styles.body}>
          <View style={styles.titleBlock}>
            <Text style={styles.h1}>Describe your{'\n'}symptoms</Text>
            <Text style={styles.subtitle}>Type as much detail as you'd like.</Text>
          </View>

          <View style={styles.inputBlock}>
            <View style={styles.textInputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. I have a headache and a sore throat..."
                placeholderTextColor={TEXT_MUTED}
                multiline
                value={symptomText}
                onChangeText={setSymptomText}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, !symptomText.trim() && styles.submitBtnDisabled]}
              disabled={!symptomText.trim()}
              onPress={handleTextSubmit}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>Submit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomBlock}>
            <TouchableOpacity style={styles.typeBtn} onPress={switchToVoice} activeOpacity={0.85}>
              <MicIcon size={20} color="#555" />
              <Text style={styles.typeBtnText}>Use voice instead</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <ShieldIcon />
        <Text style={styles.footerText}>HIPAA SECURE</Text>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 24,
  },

  header: {
    height: '8%',
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
    flexDirection: 'column',
  },

  titleBlock: {
    alignItems: 'center',
    paddingTop: '3%',
    paddingBottom: '2%',
  },
  h1: {
    textAlign: 'center',
    fontSize: 32,
    color: TEXT_DARK,
    fontWeight: '700',
    lineHeight: 40,
    marginBottom: 10,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 16,
    color: TEXT_MUTED,
    lineHeight: 24,
    paddingHorizontal: 10,
  },

  // Live transcript
  transcriptScroll: {
    flex: 1,
    marginBottom: 8,
  },
  transcriptContent: {
    paddingTop: 8,
    gap: 10,
  },
  txLine: {
    borderRadius: 12,
    padding: 12,
    maxWidth: '90%',
  },
  txLineUser: {
    alignSelf: 'flex-end',
    backgroundColor: USER_ORANGE + '18',
    borderWidth: 1,
    borderColor: USER_ORANGE + '30',
  },
  txLineAi: {
    alignSelf: 'flex-start',
    backgroundColor: AI_BLUE + '12',
    borderWidth: 1,
    borderColor: AI_BLUE + '25',
  },
  txRole: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_GRAY,
    letterSpacing: 0.5,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  txText: {
    fontSize: 14,
    color: TEXT_DARK,
    lineHeight: 20,
  },

  // Waveform
  waveBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    maxHeight: 200,
  },
  soundwaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 120,
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
    paddingVertical: 10,
    paddingHorizontal: 20,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#7a7a7a',
    letterSpacing: 1,
  },

  // Mic button
  micBlock: {
    alignItems: 'center',
    paddingBottom: '3%',
  },
  micRing: {
    width: 112,
    height: 112,
    backgroundColor: MIC_RING,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  micBtn: {
    width: 92,
    height: 92,
    backgroundColor: ACCENT_BTM,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT_BTM,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
  },
  micBtnActive:      { backgroundColor: '#8b2e32' },
  micBtnConnecting:  { backgroundColor: '#94a3b8', opacity: 0.7 },
  tapText:           { color: TEXT_MUTED, fontSize: 15, fontWeight: '500' },

  // Bottom switch button
  bottomBlock: {
    paddingBottom: '2%',
  },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 18,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 15,
    elevation: 1,
  },
  typeBtnText: { fontSize: 16, fontWeight: '600', color: TEXT_DARK },

  // Text input mode
  inputBlock: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  textInputWrapper: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    padding: 20,
    minHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  textInput: {
    fontSize: 16,
    color: TEXT_DARK,
    lineHeight: 24,
    textAlignVertical: 'top',
    minHeight: 140,
  },
  submitBtn: {
    width: '100%',
    paddingVertical: 18,
    backgroundColor: ACCENT_BTM,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: ACCENT_BTM,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: WHITE, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  footerText: { color: TEXT_GRAY, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
});
