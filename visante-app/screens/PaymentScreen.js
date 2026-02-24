import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Line, Polyline, Path, Polyline as Poly, Circle } from 'react-native-svg';

// ─── Colors (mirrors payment.html) ───────────────────────────────────────────
const PRIMARY_RED     = '#ba5559';
const TEXT_DARK       = '#0f172a';
const TEXT_GRAY       = '#64748b';
const TEXT_SLATE      = '#94a3b8';
const TEXT_CRIMSON    = '#6e1c24';
const TEXT_CRIMSON_LT = '#b04652';
const BG_MAIN         = '#fcfbfa';
const CARD_BG         = '#fcf1f3';
const CARD_BORDER     = '#f7d4d8';
const CARD_DIVIDER    = '#f1d3d6';
const BORDER_LIGHT    = '#e2e8f0';
const BG_WHITE        = '#ffffff';
const ICON_BG         = '#fce8eb';

// ─── Icons ───────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke="#334155" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="19" y1="12" x2="5" y2="12" />
    <Polyline points="12 19 5 12 12 5" />
  </Svg>
);

const LockIcon = ({ size = 20, color = PRIMARY_RED }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

const CheckIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none"
    stroke={PRIMARY_RED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <Polyline points="22 4 12 14.01 9 11.01" />
  </Svg>
);

const ShieldIcon = () => (
  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none"
    stroke={PRIMARY_RED} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Svg>
);

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function PaymentScreen({ onBack, onPay }) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState('mtn');

  function handleSelect(provider) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(provider);
  }

  function handlePay() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPay && onPay();
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Progress bar — 100% = step 3 of 3 */}
      <View style={styles.progressBar}>
        <View style={styles.progressFill} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.iconBtn}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CHECKOUT</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Lock icon */}
        <View style={styles.lockWrapper}>
          <LockIcon size={20} color={PRIMARY_RED} />
        </View>

        <Text style={styles.title}>Secure Payment</Text>
        <Text style={styles.subtitle}>Complete your consultation booking</Text>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryTitle}>Tele-health Consultation</Text>
              <Text style={styles.summarySubtitle}>Dr. Sarah Wilson • 30 min</Text>
            </View>
            <Text style={styles.summaryPrice}>GH₵ 50.00</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalValue}>GH₵ 50.00</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>GH₵ 50.00</Text>
          </View>
        </View>

        {/* Provider section */}
        <Text style={styles.sectionTitle}>Mobile Money Provider</Text>

        {/* MTN card */}
        <TouchableOpacity
          style={[styles.providerCard, selected === 'mtn' && styles.providerCardActive]}
          onPress={() => handleSelect('mtn')}
          activeOpacity={0.8}
        >
          <View style={[styles.radioBtn, selected === 'mtn' && styles.radioBtnActive]}>
            {selected === 'mtn' && <View style={styles.radioInner} />}
          </View>
          <View style={[styles.logo, styles.logoMtn]}>
            <Text style={styles.logoMtnText}>MTN</Text>
          </View>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>MTN MoMo</Text>
            <View style={styles.providerMeta}>
              <CheckIcon />
              <Text style={styles.providerMetaText}>024 412 3456</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Airtel card */}
        <TouchableOpacity
          style={[styles.providerCard, styles.providerCardMargin, selected === 'airtel' && styles.providerCardActive]}
          onPress={() => handleSelect('airtel')}
          activeOpacity={0.8}
        >
          <View style={[styles.radioBtn, selected === 'airtel' && styles.radioBtnActive]}>
            {selected === 'airtel' && <View style={styles.radioInner} />}
          </View>
          <View style={[styles.logo, styles.logoAirtel]}>
            <Text style={styles.logoAirtelText}>{'Airtel\nTigo'}</Text>
          </View>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>AirtelTigo Money</Text>
            <Text style={styles.providerMetaText}>Pay with 027...</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.payBtn} onPress={handlePay} activeOpacity={0.85}>
          <LockIcon size={18} color={BG_WHITE} />
          <Text style={styles.payBtnText}>Pay GH₵ 50.00</Text>
        </TouchableOpacity>
        <View style={styles.securityBadge}>
          <ShieldIcon />
          <Text style={styles.securityText}>BANK-LEVEL SECURITY ENCRYPTED</Text>
        </View>
      </View>

    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_MAIN,
  },

  progressBar: {
    height: 4,
    backgroundColor: '#f1f5f9',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: PRIMARY_RED,
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
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#475569',
  },
  headerSpacer: {
    width: 36,
  },

  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 10,
    alignItems: 'center',
  },

  lockWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: TEXT_GRAY,
    marginBottom: 24,
    textAlign: 'center',
  },

  // Summary card
  summaryCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 16,
    width: '100%',
    padding: 20,
    marginBottom: 30,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryTitle: {
    color: TEXT_CRIMSON,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  summarySubtitle: {
    color: TEXT_CRIMSON_LT,
    fontSize: 12,
  },
  summaryPrice: {
    color: TEXT_CRIMSON,
    fontWeight: '700',
    fontSize: 16,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: CARD_DIVIDER,
    marginVertical: 16,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subtotalLabel: {
    color: TEXT_CRIMSON_LT,
    fontSize: 14,
  },
  subtotalValue: {
    color: TEXT_CRIMSON,
    fontSize: 14,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: TEXT_CRIMSON,
    fontWeight: '700',
    fontSize: 15,
  },
  totalValue: {
    color: TEXT_CRIMSON,
    fontWeight: '700',
    fontSize: 18,
  },

  // Provider section
  sectionTitle: {
    width: '100%',
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
    textAlign: 'left',
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_LIGHT,
    backgroundColor: BG_WHITE,
    width: '100%',
  },
  providerCardMargin: {
    marginTop: 12,
  },
  providerCardActive: {
    borderWidth: 1.5,
    borderColor: PRIMARY_RED,
    backgroundColor: '#fffafa',
  },

  radioBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioBtnActive: {
    borderColor: PRIMARY_RED,
    borderWidth: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY_RED,
  },

  logo: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoMtn: {
    backgroundColor: '#ffcc00',
  },
  logoMtnText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 13,
  },
  logoAirtel: {
    backgroundColor: '#e0f2fe',
  },
  logoAirtelText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },

  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontWeight: '600',
    color: TEXT_DARK,
    fontSize: 14,
    marginBottom: 4,
  },
  providerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  providerMetaText: {
    fontSize: 12,
    color: TEXT_GRAY,
  },

  // Sticky footer
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY_RED,
    borderRadius: 12,
    paddingVertical: 18,
    marginBottom: 16,
    shadowColor: PRIMARY_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 5,
  },
  payBtnText: {
    color: BG_WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  securityText: {
    fontSize: 10,
    color: PRIMARY_RED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
});
