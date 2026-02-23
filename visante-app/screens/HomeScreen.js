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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import Svg, { Line, Rect, Path, Circle } from 'react-native-svg';

// ─── Colors ────────────────────────────────────────────────────────────────
const BG = '#faf9f6';
const ACCENT_TOP = '#f5a782';
const ACCENT_BTM = '#ba464a';
const TEXT_DARK = '#2b2b2b';
const TEXT_MUTED = '#717171';
const TEXT_GRAY = '#a8a8a8';
const BORDER = '#eaeaea';
const WHITE = '#ffffff';
const MIC_RING = '#f4dbdb';

// ─── Bar heights mirroring the HTML ────────────────────────────────────────
const BASE_HEIGHTS = [15, 25, 40, 65, 35, 80, 45, 95, 115, 75, 45, 85, 35, 60, 40, 25, 15];
const BASE_OPACITIES = [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1, 1, 1, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5];

// ─── Animated waveform bar ─────────────────────────────────────────────────
function WaveBar({ baseHeight, baseOpacity, isActive }) {
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
      <View style={{ flex: 1, backgroundColor: ACCENT_TOP }} />
    </Animated.View>
  );
}

// ─── Pulsing dot ───────────────────────────────────────────────────────────
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
  return <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity: anim }} />;
}

// ─── SVG Icons ─────────────────────────────────────────────────────────────
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
const MicOffIcon = () => (
  <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="1" y1="1" x2="23" y2="23" />
    <Path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <Path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <Line x1="12" y1="19" x2="12" y2="22" />
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

// ─── Main Screen ───────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('voice');
  const [isListening, setIsListening] = useState(false);
  const [symptomText, setSymptomText] = useState('');
  const recordingRef = useRef(null);
  const permissionRef = useRef(false);

  useEffect(() => {
    Audio.requestPermissionsAsync().then(({ status }) => {
      permissionRef.current = status === 'granted';
    });
    return () => { stopRecording(); };
  }, []);

  const startRecording = async () => {
    if (!permissionRef.current) {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;
      permissionRef.current = true;
    }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsListening(true);
    } catch (e) { console.warn('Record error:', e); }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    try { await recordingRef.current.stopAndUnloadAsync(); } catch (_) {}
    recordingRef.current = null;
    setIsListening(false);
  };

  const toggleMic = useCallback(async () => {
    if (isListening) await stopRecording(); else await startRecording();
  }, [isListening]);

  const switchToType = () => { if (isListening) stopRecording(); setMode('type'); };
  const switchToVoice = () => setMode('voice');

  // Layout: fill full screen, respect safe area insets manually
  // Header = 8% of usable height, footer fixed, body fills rest
  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header: 8% of screen ── */}
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

      {/* ── Body: flex fills remaining space ── */}
      {mode === 'voice' ? (
        <View style={styles.body}>

          {/* Title block */}
          <View style={styles.titleBlock}>
            <Text style={styles.h1}>How can I help{'\n'}you today?</Text>
            <Text style={styles.subtitle}>I'm listening. Tell me about your symptoms.</Text>
          </View>

          {/* Waveform — flex grows to fill available middle space */}
          <View style={styles.waveBlock}>
            <View style={styles.soundwaveContainer}>
              {BASE_HEIGHTS.map((h, i) => (
                <WaveBar key={i} baseHeight={h} baseOpacity={BASE_OPACITIES[i]} isActive={isListening} />
              ))}
            </View>
            <View style={styles.listeningBadge}>
              <View style={styles.dots}>
                <PulseDot color="#f6985d" delay={0} />
                <PulseDot color="#ce5a55" delay={150} />
                <PulseDot color="#ba464a" delay={300} />
              </View>
              <Text style={styles.listeningText}>
                {isListening ? 'LISTENING' : 'TAP MIC TO START'}
              </Text>
            </View>
          </View>

          {/* Mic button */}
          <View style={styles.micBlock}>
            <View style={styles.micRing}>
              <TouchableOpacity
                style={[styles.micBtn, isListening && styles.micBtnActive]}
                onPress={toggleMic}
                activeOpacity={0.85}
              >
                {isListening ? <MicOffIcon /> : <MicIcon />}
              </TouchableOpacity>
            </View>
            <Text style={styles.tapText}>{isListening ? 'Tap to stop' : 'Tap to speak'}</Text>
          </View>

          {/* Type symptoms — sits just above footer */}
          <View style={styles.bottomBlock}>
            <TouchableOpacity style={styles.typeBtn} onPress={switchToType} activeOpacity={0.85}>
              <KeyboardIcon />
              <Text style={styles.typeBtnText}>Type your symptoms</Text>
            </TouchableOpacity>
          </View>

        </View>
      ) : (
        /* ── Type mode ── */
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

      {/* ── Footer: pinned at bottom ── */}
      <View style={styles.footer}>
        <ShieldIcon />
        <Text style={styles.footerText}>HIPAA SECURE</Text>
      </View>

    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 24,
  },

  // Header — fixed height as % via minHeight, no fixed pixels
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

  // Body — takes all remaining space between header and footer
  body: {
    flex: 1,
    flexDirection: 'column',
  },

  // Title — fixed content size
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

  // Waveform — grows to fill middle
  waveBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  soundwaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 120,
    position: 'relative',
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

  // Mic — fixed size, centred
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
  micBtnActive: { backgroundColor: '#8b2e32' },
  tapText: { color: TEXT_MUTED, fontSize: 15, fontWeight: '500' },

  // Bottom action button — pinned just above footer
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

  // Type mode input
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

  // Footer — sits at very bottom inside safe area
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  footerText: { color: TEXT_GRAY, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
});
