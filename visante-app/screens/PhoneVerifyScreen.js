import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Polyline, Path, Circle, Rect } from 'react-native-svg';
import { sendOtp, verifyOtp } from '../services/restApi';

// ─── Colors ──────────────────────────────────────────────────────────────────
const PRIMARY_RED  = '#bb5454';
const TEXT_DARK    = '#0f172a';
const TEXT_GRAY    = '#64748b';
const TEXT_SLATE   = '#94a3b8';
const BORDER_LIGHT = '#e2e8f0';
const BG_WHITE     = '#ffffff';
const GREEN        = '#10b981';
const GREEN_LIGHT  = '#ecfdf5';
const ERROR_RED    = '#ef4444';

// ─── Icons ───────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke="#475569" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="19" y1="12" x2="5" y2="12" />
    <Polyline points="12 19 5 12 12 5" />
  </Svg>
);

const PhoneIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none"
    stroke={PRIMARY_RED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <Line x1="12" y1="18" x2="12.01" y2="18" />
  </Svg>
);

const ShieldIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none"
    stroke={GREEN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <Polyline points="9 12 11 14 15 10" stroke={GREEN} strokeWidth={2.5} />
  </Svg>
);

const CheckCircleIcon = () => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none"
    stroke={GREEN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Polyline points="9 12 11 14 15 10" />
  </Svg>
);

const LockIcon = () => (
  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none"
    stroke="#cbd5e1" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function PhoneVerifyScreen({ onBack, onVerified, detectedPhone }) {
  const insets = useSafeAreaInsets();
  // Phases: phone → sendingOtp → otp → verifying → done
  const [phase, setPhase] = useState('phone');
  const [phoneNumber, setPhoneNumber] = useState(
    detectedPhone ? detectedPhone.replace(/\s/g, '') : ''
  );
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const countdownRef = useRef(null);

  function startResendCountdown() {
    setResendCountdown(60);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendOtp() {
    const cleaned = phoneNumber.replace(/\s/g, '');
    if (cleaned.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    setError('');
    setPhase('sendingOtp');

    try {
      await sendOtp(cleaned);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase('otp');
      startResendCountdown();
      setTimeout(() => otpRefs[0].current?.focus(), 300);
    } catch (e) {
      console.error('[PhoneVerify] sendOtp error:', e.message);
      setError(e.message || 'Failed to send OTP. Please try again.');
      setPhase('phone');
    }
  }

  async function handleResendOtp() {
    if (resendCountdown > 0) return;
    setError('');
    try {
      await sendOtp(phoneNumber.replace(/\s/g, ''));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      startResendCountdown();
      setOtpDigits(['', '', '', '']);
      otpRefs[0].current?.focus();
    } catch (e) {
      setError(e.message || 'Failed to resend OTP.');
    }
  }

  function handleOtpChange(text, index) {
    const newDigits = [...otpDigits];
    newDigits[index] = text.replace(/[^0-9]/g, '').slice(-1);
    setOtpDigits(newDigits);
    setError('');

    if (text && index < 3) {
      otpRefs[index + 1].current?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (text && index === 3 && newDigits.every((d) => d)) {
      handleVerifyOtp(newDigits.join(''));
    }
  }

  function handleOtpKeyPress(e, index) {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  }

  async function handleVerifyOtp(code) {
    const otp = code || otpDigits.join('');
    if (otp.length < 4) {
      setError('Please enter the 4-digit code');
      return;
    }
    setPhase('verifying');
    setError('');

    try {
      await verifyOtp(phoneNumber.replace(/\s/g, ''), otp);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase('done');

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
        onVerified && onVerified(phoneNumber.replace(/\s/g, ''));
      }, 1200);
    } catch (e) {
      console.error('[PhoneVerify] verifyOtp error:', e.message);
      setError(e.message || 'Invalid OTP. Please try again.');
      setPhase('otp');
      setOtpDigits(['', '', '', '']);
      otpRefs[0].current?.focus();
    }
  }

  const progressWidth =
    phase === 'phone' || phase === 'sendingOtp' ? '33%' :
    phase === 'otp' || phase === 'verifying' ? '66%' : '100%';

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={phase === 'otp' ? () => setPhase('phone') : onBack}
          activeOpacity={0.7}
          style={styles.iconBtn}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.stepText}>Phone Verification</Text>
        <View style={styles.iconBtn} />
      </View>

      {/* Content */}
      <View style={styles.content}>

        {/* ── Phase: Phone Input ── */}
        {(phase === 'phone' || phase === 'sendingOtp') && (
          <View style={styles.centerSection}>
            <View style={styles.iconWrapper}>
              <PhoneIcon />
            </View>
            <Text style={styles.title}>Enter your phone number</Text>
            <Text style={styles.subtitle}>
              We'll send you a verification code via SMS
            </Text>

            <View style={styles.phoneInputRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+233</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                value={phoneNumber}
                onChangeText={(t) => {
                  setPhoneNumber(t.replace(/[^0-9]/g, ''));
                  setError('');
                }}
                placeholder="055 123 4567"
                placeholderTextColor={TEXT_SLATE}
                keyboardType="phone-pad"
                maxLength={10}
                editable={phase !== 'sendingOtp'}
              />
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        )}

        {/* ── Phase: OTP Input ── */}
        {(phase === 'otp' || phase === 'verifying') && (
          <View style={styles.centerSection}>
            <View style={[styles.iconWrapper, { backgroundColor: GREEN_LIGHT }]}>
              <ShieldIcon />
            </View>
            <Text style={styles.title}>Enter verification code</Text>
            <Text style={styles.subtitle}>
              We sent a 4-digit code to{'\n'}
              <Text style={{ fontWeight: '700', color: TEXT_DARK }}>
                +233 {phoneNumber}
              </Text>
            </Text>

            <View style={styles.otpRow}>
              {otpDigits.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={otpRefs[i]}
                  style={[
                    styles.otpBox,
                    digit ? styles.otpBoxFilled : null,
                    error ? styles.otpBoxError : null,
                  ]}
                  value={digit}
                  onChangeText={(t) => handleOtpChange(t, i)}
                  onKeyPress={(e) => handleOtpKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  editable={phase !== 'verifying'}
                  selectTextOnFocus
                />
              ))}
            </View>

            {phase === 'verifying' && (
              <ActivityIndicator size="small" color={PRIMARY_RED} style={{ marginTop: 16 }} />
            )}

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              onPress={handleResendOtp}
              activeOpacity={0.7}
              disabled={resendCountdown > 0}
              style={{ marginTop: 20 }}
            >
              <Text style={[styles.resendText, resendCountdown > 0 && { color: TEXT_SLATE }]}>
                {resendCountdown > 0
                  ? `Resend code in ${resendCountdown}s`
                  : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Phase: Done ── */}
        {phase === 'done' && (
          <Animated.View
            style={[
              styles.centerSection,
              { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
            ]}
          >
            <CheckCircleIcon />
            <Text style={[styles.title, { marginTop: 16 }]}>Verified!</Text>
            <Text style={styles.subtitle}>Your phone number has been confirmed</Text>
          </Animated.View>
        )}
      </View>

      {/* Bottom CTA */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
        {phase === 'phone' && (
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              phoneNumber.length < 10 && styles.confirmBtnDisabled,
            ]}
            onPress={handleSendOtp}
            activeOpacity={0.85}
            disabled={phoneNumber.length < 10}
          >
            <Text style={styles.confirmBtnText}>Send Verification Code</Text>
          </TouchableOpacity>
        )}

        {phase === 'sendingOtp' && (
          <View style={[styles.confirmBtn, styles.confirmBtnDisabled]}>
            <ActivityIndicator size="small" color={BG_WHITE} />
          </View>
        )}

        {phase === 'otp' && (
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              !otpDigits.every((d) => d) && styles.confirmBtnDisabled,
            ]}
            onPress={() => handleVerifyOtp()}
            activeOpacity={0.85}
            disabled={!otpDigits.every((d) => d)}
          >
            <Text style={styles.confirmBtnText}>Verify</Text>
          </TouchableOpacity>
        )}

        <View style={styles.secureRow}>
          <LockIcon />
          <Text style={styles.secureText}>SECURE OTP VERIFICATION</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
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

  content: {
    flex: 1,
    justifyContent: 'center',
  },

  centerSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#fff5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
  },

  // Phone input
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    width: '100%',
    gap: 10,
  },
  countryCode: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: BORDER_LIGHT,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  countryCodeText: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: BORDER_LIGHT,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_DARK,
    letterSpacing: 1,
  },

  // OTP input
  otpRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  otpBox: {
    width: 56,
    height: 64,
    borderWidth: 2,
    borderColor: BORDER_LIGHT,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: PRIMARY_RED,
    backgroundColor: '#fff5f5',
  },
  otpBoxError: {
    borderColor: ERROR_RED,
  },

  resendText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_RED,
    textAlign: 'center',
  },

  errorText: {
    fontSize: 13,
    color: ERROR_RED,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },

  // Bottom
  bottomSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  confirmBtn: {
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
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
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
