import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Polyline, Circle, Path, Rect } from 'react-native-svg';

// ─── Colors (mirrors otp.html) ───────────────────────────────────────────────
const PRIMARY_RED  = '#bb5454';
const ACTIVE_BLUE  = '#1c4ed8';
const TIMER_ORANGE = '#d97706';
const TEXT_DARK    = '#0f172a';
const TEXT_GRAY    = '#64748b';
const TEXT_SLATE   = '#94a3b8';
const BORDER_LIGHT = '#e2e8f0';
const ICON_BG      = '#fff5f5';
const BG_WHITE     = '#ffffff';

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
    stroke={TEXT_SLATE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="1" />
    <Circle cx="19" cy="12" r="1" />
    <Circle cx="5" cy="12" r="1" />
  </Svg>
);

const MessageIcon = () => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none"
    stroke={PRIMARY_RED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <Circle cx="8" cy="10" r="1.5" fill={PRIMARY_RED} stroke="none" />
    <Circle cx="12" cy="10" r="1.5" fill={PRIMARY_RED} stroke="none" />
    <Circle cx="16" cy="10" r="1.5" fill={PRIMARY_RED} stroke="none" />
  </Svg>
);

const BackspaceIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke={TEXT_DARK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9l-7-8 7-8z" />
    <Line x1="18" y1="9" x2="12" y2="15" />
    <Line x1="12" y1="9" x2="18" y2="15" />
  </Svg>
);

const LockIcon = () => (
  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none"
    stroke="#cbd5e1" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

// ─── Keypad layout ────────────────────────────────────────────────────────────
const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['',  '0', '⌫'],
];

const OTP_LENGTH = 4;
const RESEND_SECONDS = 30;

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function OtpScreen({ onBack, onVerify, phoneNumber }) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState([]);
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const intervalRef = useRef(null);

  // Countdown timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  function restartTimer() {
    clearInterval(intervalRef.current);
    setTimer(RESEND_SECONDS);
    setCode([]);
    intervalRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function handleKey(val) {
    if (val === '') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (val === '⌫') {
      setCode(prev => prev.slice(0, -1));
    } else if (code.length < OTP_LENGTH) {
      setCode(prev => [...prev, val]);
    }
  }

  const isReady = code.length === OTP_LENGTH;
  const timerStr = `0:${String(timer).padStart(2, '0')}`;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Progress bar — 66% = step 2 of 3 */}
      <View style={styles.progressBar}>
        <View style={styles.progressFill} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.iconBtn}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.stepText}>Step 2 of 3</Text>
        <View style={styles.iconBtn}>
          <DotsIcon />
        </View>
      </View>

      {/* Top section */}
      <View style={styles.topSection}>
        <View style={styles.iconWrapper}>
          <MessageIcon />
        </View>

        <Text style={styles.title}>Verify your number</Text>

        <Text style={styles.subtitle}>
          We sent a 4-digit code to{'\n'}
          <Text style={styles.subtitlePhone}>
            {phoneNumber ? `+233 ${phoneNumber}` : '+233 55 000 0000'}
          </Text>
        </Text>

        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.changeNumber}>Change number</Text>
        </TouchableOpacity>

        {/* OTP boxes */}
        <View style={styles.otpContainer}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => {
            const isActive = i === code.length;
            const filled = code[i] !== undefined;
            return (
              <View
                key={i}
                style={[
                  styles.otpBox,
                  isActive && styles.otpBoxActive,
                  filled && styles.otpBoxFilled,
                ]}
              >
                <Text style={styles.otpDigit}>{code[i] ?? ''}</Text>
              </View>
            );
          })}
        </View>

        {/* Timer / Resend */}
        {timer > 0 ? (
          <Text style={styles.timer}>
            Resend code in <Text style={styles.timerCountdown}>{timerStr}</Text>
          </Text>
        ) : (
          <TouchableOpacity onPress={restartTimer} activeOpacity={0.7}>
            <Text style={styles.resendLink}>Resend code</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom section — keypad + button */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.keypad}>
          {KEYPAD.map((row, ri) => (
            <View key={ri} style={styles.keyRow}>
              {row.map((key, ki) => (
                <TouchableOpacity
                  key={ki}
                  style={[styles.key, key === '' && styles.keyEmpty]}
                  onPress={() => handleKey(key)}
                  activeOpacity={key === '' ? 1 : 0.55}
                  disabled={key === ''}
                >
                  {key === '⌫' ? (
                    <BackspaceIcon />
                  ) : (
                    <Text style={styles.keyText}>{key}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.verifyBtn, !isReady && styles.verifyBtnDisabled]}
          onPress={() => isReady && onVerify && onVerify(code.join(''))}
          activeOpacity={isReady ? 0.85 : 1}
          disabled={!isReady}
        >
          <Text style={styles.verifyBtnText}>Verify &amp; Continue</Text>
        </TouchableOpacity>

        <View style={styles.secureRow}>
          <LockIcon />
          <Text style={styles.secureText}>SECURE CONNECTION</Text>
        </View>
      </View>

    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_WHITE,
  },

  progressBar: {
    height: 4,
    backgroundColor: '#f1f5f9',
  },
  progressFill: {
    width: '66.6%',
    height: '100%',
    backgroundColor: PRIMARY_RED,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SLATE,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Top content
  topSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 10,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 15,
    color: TEXT_GRAY,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitlePhone: {
    color: TEXT_DARK,
    fontWeight: '600',
  },

  changeNumber: {
    color: PRIMARY_RED,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 28,
    marginTop: 6,
  },

  // OTP boxes
  otpContainer: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  otpBox: {
    width: 58,
    height: 68,
    borderWidth: 1.5,
    borderColor: BORDER_LIGHT,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG_WHITE,
  },
  otpBoxActive: {
    borderWidth: 2,
    borderColor: ACTIVE_BLUE,
  },
  otpBoxFilled: {
    borderColor: PRIMARY_RED,
    borderWidth: 2,
  },
  otpDigit: {
    fontSize: 26,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  timer: {
    fontSize: 13,
    color: TEXT_SLATE,
  },
  timerCountdown: {
    color: TIMER_ORANGE,
    fontWeight: '600',
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIMARY_RED,
  },

  // Bottom — keypad + CTA pinned to bottom
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
    backgroundColor: BG_WHITE,
  },

  keypad: {
    width: '100%',
    marginBottom: 14,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  key: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10,
  },
  keyEmpty: {
    opacity: 0,
  },
  keyText: {
    fontSize: 22,
    fontWeight: '500',
    color: TEXT_DARK,
  },

  verifyBtn: {
    backgroundColor: PRIMARY_RED,
    borderRadius: 12,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: PRIMARY_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 5,
    marginBottom: 16,
  },
  verifyBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyBtnText: {
    color: BG_WHITE,
    fontSize: 16,
    fontWeight: '600',
  },

  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secureText: {
    fontSize: 10,
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
});
