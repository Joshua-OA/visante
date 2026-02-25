import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Line, Polyline } from 'react-native-svg';

// ─── Colors ──────────────────────────────────────────────────────────────────
const PRIMARY_RED = '#c65d5d';
const RED_SOFT    = '#fff5f5';
const TEXT_DARK   = '#1a1a1a';
const TEXT_LIGHT  = '#6e7c87';
const BORDER_COLOR = '#e0e0e0';
const BG_WHITE    = '#FFFFFF';
const BG_GRAY     = '#fcfcfc';

// ─── Icons ───────────────────────────────────────────────────────────────────
const MobileIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"
    stroke={PRIMARY_RED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <Line x1="12" y1="18" x2="12.01" y2="18" />
  </Svg>
);

const BackIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"
    stroke={TEXT_DARK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="19" y1="12" x2="5" y2="12" />
    <Polyline points="12 19 5 12 12 5" />
  </Svg>
);

// ─── Keypad layout ───────────────────────────────────────────────────────────
const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['',  '0', '⌫'],
];

// Display: 0XX XXX XXXX (leading 0 is automated, user enters 9 digits)
function formatDisplay(digits) {
  const full = '0' + digits;           // prepend the 0
  const p1 = full.slice(0, 3);        // 0XX
  const p2 = full.slice(3, 6);        // XXX
  const p3 = full.slice(6, 10);       // XXXX
  let out = p1;
  if (p2) out += ' ' + p2;
  if (p3) out += ' ' + p3;
  return out;
}


// ─── Screen ──────────────────────────────────────────────────────────────────
export default function EnterPhoneScreen({ onBack, onSendOtp }) {
  const insets = useSafeAreaInsets();
  const [digits, setDigits] = useState('');

  function handleKey(val) {
    if (val === '') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (val === '⌫') {
      setDigits(prev => prev.slice(0, -1));
    } else if (val === '0' && digits.length === 0) {
      // Leading 0 is automated — ignore it when typed as first digit
      return;
    } else if (digits.length < 9) {
      setDigits(prev => prev + val);
    }
  }

  const isReady = digits.length >= 9;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={styles.progressFill} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.iconBtn}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.stepText}>Step 1 of 3</Text>
        <View style={styles.iconBtn}>
          <Text style={styles.helpText}>?</Text>
        </View>
      </View>

      {/* Top section — icon, title, subtitle, input, disclaimer */}
      <View style={styles.topSection}>
        <View style={styles.phoneIconWrapper}>
          <MobileIcon />
        </View>

        <Text style={styles.title}>Enter your mobile number</Text>
        <Text style={styles.subtitle}>
          To confirm your appointment, we need to verify your mobile number with a 4-digit code.
        </Text>

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.countryCode}>
            <Image
              source={{ uri: 'https://flagcdn.com/w40/gh.png' }}
              style={styles.flag}
              resizeMode="contain"
            />
            <Text style={styles.countryCodeText}>+233 ▾</Text>
          </View>
          <Text style={[styles.numberDisplay, !digits && styles.numberPlaceholder]}>
            {digits ? formatDisplay(digits) : '0XX XXX XXXX'}
          </Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerIcon}>ⓘ</Text>
          <Text style={styles.disclaimerText}>
            Message and data rates may apply. You will receive an SMS verification code shortly.
          </Text>
        </View>
      </View>

      {/* Bottom section — keypad + button, pinned to bottom */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>

        {/* Keypad */}
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
                  <Text style={styles.keyText}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* Send OTP button */}
        <TouchableOpacity
          style={[styles.sendBtn, !isReady && styles.sendBtnDisabled]}
          onPress={() => isReady && onSendOtp && onSendOtp(formatDisplay(digits))}
          activeOpacity={isReady ? 0.85 : 1}
          disabled={!isReady}
        >
          <Text style={styles.sendBtnText}>Send OTP</Text>
        </TouchableOpacity>

        <Text style={styles.protocol}>🛡 IDENTITY VERIFICATION PROTOCOL</Text>
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
    backgroundColor: '#eee',
  },
  progressFill: {
    width: '33%',
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
    color: TEXT_LIGHT,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  helpText: {
    fontSize: 16,
    color: TEXT_LIGHT,
    fontWeight: '600',
  },

  // Top content — natural height, centered
  topSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  phoneIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: RED_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'center',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 14,
    color: TEXT_LIGHT,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 12,
    marginBottom: 24,
  },

  inputContainer: {
    width: '100%',
    height: 62,
    borderWidth: 2,
    borderColor: PRIMARY_RED,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: BG_GRAY,
    borderRightWidth: 1,
    borderRightColor: BORDER_COLOR,
    height: '100%',
    gap: 8,
  },
  flag: {
    width: 24,
    height: 16,
    borderRadius: 2,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  numberDisplay: {
    flex: 1,
    paddingHorizontal: 18,
    fontSize: 20,
    fontWeight: '500',
    color: TEXT_DARK,
    letterSpacing: 1,
  },
  numberPlaceholder: {
    color: '#ccc',
    fontWeight: '400',
  },

  disclaimer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    width: '100%',
    paddingHorizontal: 4,
  },
  disclaimerIcon: {
    fontSize: 13,
    color: TEXT_LIGHT,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: TEXT_LIGHT,
    lineHeight: 18,
  },

  // Bottom section — keypad + CTA, sits at bottom
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
    marginBottom: 16,
    gap: 0,
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
    pointerEvents: 'none',
  },
  keyText: {
    fontSize: 24,
    fontWeight: '500',
    color: TEXT_DARK,
  },

  sendBtn: {
    backgroundColor: PRIMARY_RED,
    borderRadius: 15,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: PRIMARY_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 5,
    marginBottom: 12,
  },
  sendBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  protocol: {
    fontSize: 10,
    color: '#b0bac1',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
});
