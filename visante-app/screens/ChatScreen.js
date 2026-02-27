import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  Animated,
  Dimensions,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Polyline, Circle, Path, Rect } from 'react-native-svg';
import { showErrorToast } from '../utils/toast';

// ─── Colors ──────────────────────────────────────────────────────────────────
const BG = '#f8fafc';
const WHITE = '#ffffff';
const PRIMARY_BLUE = '#3b82f6';
const PRIMARY_RED = '#bb5454';
const TEXT_DARK = '#111827';
const TEXT_GRAY = '#64748b';
const TEXT_LIGHT = '#94a3b8';
const USER_BG = '#3b82f6';
const DOCTOR_BG = '#f1f5f9';
const VOICE_BG = '#eff6ff';
const VOICE_BORDER = '#bfdbfe';
const GREEN = '#10b981';
const RECORDING_RED = '#ef4444';

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

const SendIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="22" y1="2" x2="11" y2="13" />
    <Path d="M22 2L15 22 11 13 2 9l20-7z" />
  </Svg>
);

const MicIcon = ({ color = WHITE }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <Line x1="12" y1="19" x2="12" y2="22" />
  </Svg>
);

const StopIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill={WHITE}>
    <Rect x="5" y="5" width="14" height="14" rx="3" />
  </Svg>
);

const PlayIcon = ({ color = PRIMARY_BLUE }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill={color}>
    <Path d="M8 5v14l11-7z" />
  </Svg>
);

const PauseIcon = ({ color = PRIMARY_BLUE }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill={color}>
    <Rect x="6" y="4" width="4" height="16" />
    <Rect x="14" y="4" width="4" height="16" />
  </Svg>
);

const CheckIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
    stroke={GREEN} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="20 6 9 17 4 12" />
  </Svg>
);

// ─── Format duration ─────────────────────────────────────────────────────────
function formatDuration(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Voice Note Bubble ──────────────────────────────────────────────────────
function VoiceNoteBubble({ uri, duration, isUser }) {
  const [playing, setPlaying] = useState(false);
  const soundRef = useRef(null);

  async function togglePlay() {
    if (playing && soundRef.current) {
      await soundRef.current.pauseAsync();
      setPlaying(false);
      return;
    }

    try {
      if (soundRef.current) {
        await soundRef.current.playFromPositionAsync(0);
      } else {
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          (status) => {
            if (status.didJustFinish) {
              setPlaying(false);
            }
          }
        );
        soundRef.current = sound;
      }
      setPlaying(true);
    } catch (e) {
      console.warn('[VoiceNoteBubble] play error:', e);
      showErrorToast(e, 'Playback Issue');
    }
  }

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  return (
    <TouchableOpacity
      style={[styles.voiceNoteBubble, isUser ? styles.voiceNoteUser : styles.voiceNoteDoctor]}
      onPress={togglePlay}
      activeOpacity={0.7}
    >
      <View style={styles.voiceNotePlayBtn}>
        {playing ? <PauseIcon color={isUser ? WHITE : PRIMARY_BLUE} /> : <PlayIcon color={isUser ? WHITE : PRIMARY_BLUE} />}
      </View>
      <View style={styles.voiceNoteWaveform}>
        {[...Array(12)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.voiceNoteBar,
              {
                height: 4 + Math.random() * 16,
                backgroundColor: isUser ? 'rgba(255,255,255,0.6)' : 'rgba(59,130,246,0.4)',
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.voiceNoteDuration, isUser && { color: 'rgba(255,255,255,0.8)' }]}>
        {formatDuration(duration || 0)}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Typing indicator ────────────────────────────────────────────────────────
function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ])
      );
    animate(dot1, 0).start();
    animate(dot2, 200).start();
    animate(dot3, 400).start();
  }, []);

  return (
    <View style={styles.typingRow}>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, { opacity: dot1 }]} />
        <Animated.View style={[styles.typingDot, { opacity: dot2 }]} />
        <Animated.View style={[styles.typingDot, { opacity: dot3 }]} />
      </View>
    </View>
  );
}

// ─── Simulated doctor replies ────────────────────────────────────────────────
const DOCTOR_REPLIES = [
  "Thank you for sharing that. I've reviewed your symptoms and your vitals look stable.",
  "I'd recommend staying hydrated and taking the prescribed medication. Let me know if symptoms worsen.",
  "Based on what you've described, this is consistent with the triage assessment. I'll prepare your prescription now.",
  "Everything looks good. I'm preparing your medical summary and prescription. You should receive it shortly.",
];

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function ChatScreen({
  onEnd,
  onQuit,
  appointmentId,
  provider,
  userProfile,
  triageSummary,
}) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [doctorTyping, setDoctorTyping] = useState(false);
  const [consultationEnded, setConsultationEnded] = useState(false);
  const recordingRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const flatListRef = useRef(null);
  const replyCountRef = useRef(0);

  const patientName = userProfile?.name || 'Patient';
  const doctorName = 'Dr. Sarah Mitchell';

  // Initial doctor greeting
  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages([{
        id: 'welcome',
        type: 'text',
        text: `Hello ${patientName}, I'm ${doctorName}. I've reviewed your triage results. Please describe how you're feeling and I'll help you from here. You can type or send a voice note.`,
        sender: 'doctor',
        time: new Date(),
      }]);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, doctorTyping]);

  // Simulate doctor reply after user sends a message
  const simulateDoctorReply = useCallback(() => {
    setDoctorTyping(true);
    const delay = 2000 + Math.random() * 2000;
    const replyIndex = replyCountRef.current % DOCTOR_REPLIES.length;
    replyCountRef.current++;

    setTimeout(() => {
      setDoctorTyping(false);
      const reply = {
        id: `doc-${Date.now()}`,
        type: 'text',
        text: DOCTOR_REPLIES[replyIndex],
        sender: 'doctor',
        time: new Date(),
      };
      setMessages(prev => [...prev, reply]);

      // After 4 messages from doctor, offer to end consultation
      if (replyCountRef.current >= 3 && !consultationEnded) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: `doc-end-${Date.now()}`,
            type: 'text',
            text: "I've completed your assessment. Your prescription and medical summary are ready. You can end the consultation now to view your summary.",
            sender: 'doctor',
            time: new Date(),
          }]);
          setConsultationEnded(true);
        }, 1500);
      }
    }, delay);
  }, [consultationEnded]);

  // ── Send text message ──
  function handleSendText() {
    const text = inputText.trim();
    if (!text) return;

    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const msg = {
      id: `user-${Date.now()}`,
      type: 'text',
      text,
      sender: 'user',
      time: new Date(),
    };
    setMessages(prev => [...prev, msg]);
    setInputText('');
    simulateDoctorReply();
  }

  // ── Voice recording ──
  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        showErrorToast('microphone permission', 'Microphone Access Needed');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    } catch (e) {
      console.warn('[ChatScreen] startRecording error:', e);
      showErrorToast(e, 'Recording Issue');
    }
  }

  async function stopRecording() {
    if (!recordingRef.current) return;

    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      const duration = recordingDuration;
      recordingRef.current = null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      if (uri && duration > 0) {
        const msg = {
          id: `voice-${Date.now()}`,
          type: 'voice',
          uri,
          duration,
          sender: 'user',
          time: new Date(),
        };
        setMessages(prev => [...prev, msg]);
        simulateDoctorReply();
      }
    } catch (e) {
      console.warn('[ChatScreen] stopRecording error:', e);
      showErrorToast(e, 'Recording Issue');
      recordingRef.current = null;
    }
    setRecordingDuration(0);
  }

  function handleMicPress() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  // ── End consultation ──
  function handleEndConsultation() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'End Consultation',
      'Are you sure you want to end this text consultation?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End & View Summary', style: 'default', onPress: () => onEnd && onEnd() },
      ]
    );
  }

  // ── Render message bubble ──
  function renderMessage({ item }) {
    const isUser = item.sender === 'user';
    const timeStr = item.time
      ? `${item.time.getHours() % 12 || 12}:${String(item.time.getMinutes()).padStart(2, '0')} ${item.time.getHours() >= 12 ? 'PM' : 'AM'}`
      : '';

    if (item.type === 'voice') {
      return (
        <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
          <View style={{ maxWidth: '80%' }}>
            <VoiceNoteBubble uri={item.uri} duration={item.duration} isUser={isUser} />
            <Text style={[styles.messageTime, isUser && styles.messageTimeUser]}>{timeStr}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        <View style={[styles.messageBubble, isUser ? styles.messageBubbleUser : styles.messageBubbleDoctor]}>
          {!isUser && <Text style={styles.doctorLabel}>{doctorName}</Text>}
          <Text style={[styles.messageText, isUser && styles.messageTextUser]}>{item.text}</Text>
        </View>
        <Text style={[styles.messageTime, isUser && styles.messageTimeUser]}>
          {timeStr}
          {isUser && (
            <Text> <CheckIcon /></Text>
          )}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onQuit && onQuit()} activeOpacity={0.7} style={styles.iconBtn}>
          <BackIcon />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName}>{doctorName}</Text>
          <View style={styles.headerStatus}>
            <View style={[styles.headerDot, { backgroundColor: doctorTyping ? GREEN : TEXT_LIGHT }]} />
            <Text style={styles.headerStatusText}>
              {doctorTyping ? 'typing...' : 'will respond shortly'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleEndConsultation} activeOpacity={0.7} style={styles.iconBtn}>
          <CloseIcon />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.messagesList, { paddingBottom: 12 }]}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={doctorTyping ? <TypingIndicator /> : null}
      />

      {/* End consultation banner */}
      {consultationEnded && (
        <TouchableOpacity style={styles.endBanner} onPress={handleEndConsultation} activeOpacity={0.85}>
          <Text style={styles.endBannerText}>Consultation complete — Tap to view summary</Text>
        </TouchableOpacity>
      )}

      {/* Input area */}
      <View style={[styles.inputArea, { paddingBottom: insets.bottom + 8 }]}>
        {isRecording ? (
          <View style={styles.recordingBar}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording... {formatDuration(recordingDuration)}</Text>
            <TouchableOpacity style={styles.stopRecordBtn} onPress={handleMicPress} activeOpacity={0.85}>
              <StopIcon />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.micBtn}
              onPress={handleMicPress}
              activeOpacity={0.85}
            >
              <MicIcon color={PRIMARY_BLUE} />
            </TouchableOpacity>
            <View style={styles.textInputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Type a message..."
                placeholderTextColor={TEXT_LIGHT}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
              />
            </View>
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              onPress={handleSendText}
              activeOpacity={0.85}
              disabled={!inputText.trim()}
            >
              <SendIcon />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Responsive helpers ─────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const CHAT_BTN_SIZE = Math.min(SCREEN_W * 0.12, 44);
const VOICE_PLAY_SIZE = Math.min(SCREEN_W * 0.1, 36);

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  headerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerStatusText: {
    fontSize: 11,
    color: TEXT_GRAY,
    fontWeight: '500',
  },

  // Messages list
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Message row
  messageRow: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  messageRowUser: {
    alignItems: 'flex-end',
  },

  // Message bubble
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    padding: 14,
  },
  messageBubbleUser: {
    backgroundColor: USER_BG,
    borderBottomRightRadius: 4,
  },
  messageBubbleDoctor: {
    backgroundColor: DOCTOR_BG,
    borderBottomLeftRadius: 4,
  },
  doctorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: PRIMARY_BLUE,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: TEXT_DARK,
    lineHeight: 22,
  },
  messageTextUser: {
    color: WHITE,
  },
  messageTime: {
    fontSize: 10,
    color: TEXT_LIGHT,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  messageTimeUser: {
    textAlign: 'right',
  },

  // Voice note bubble
  voiceNoteBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    padding: 12,
    minWidth: 180,
  },
  voiceNoteUser: {
    backgroundColor: USER_BG,
    borderBottomRightRadius: 4,
  },
  voiceNoteDoctor: {
    backgroundColor: VOICE_BG,
    borderWidth: 1,
    borderColor: VOICE_BORDER,
    borderBottomLeftRadius: 4,
  },
  voiceNotePlayBtn: {
    width: VOICE_PLAY_SIZE,
    height: VOICE_PLAY_SIZE,
    borderRadius: VOICE_PLAY_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceNoteWaveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 24,
  },
  voiceNoteBar: {
    width: 3,
    borderRadius: 2,
  },
  voiceNoteDuration: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_GRAY,
  },

  // Typing indicator
  typingRow: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  typingBubble: {
    flexDirection: 'row',
    gap: 5,
    backgroundColor: DOCTOR_BG,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEXT_GRAY,
  },

  // End banner
  endBanner: {
    backgroundColor: GREEN,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  endBannerText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '600',
  },

  // Input area
  inputArea: {
    backgroundColor: WHITE,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  micBtn: {
    width: CHAT_BTN_SIZE,
    height: CHAT_BTN_SIZE,
    borderRadius: CHAT_BTN_SIZE / 2,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  textInputWrapper: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  textInput: {
    fontSize: 15,
    color: TEXT_DARK,
    lineHeight: 20,
    maxHeight: 80,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendBtn: {
    width: CHAT_BTN_SIZE,
    height: CHAT_BTN_SIZE,
    borderRadius: CHAT_BTN_SIZE / 2,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },

  // Recording bar
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: RECORDING_RED,
  },
  recordingText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: RECORDING_RED,
  },
  stopRecordBtn: {
    width: CHAT_BTN_SIZE,
    height: CHAT_BTN_SIZE,
    borderRadius: CHAT_BTN_SIZE / 2,
    backgroundColor: RECORDING_RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
