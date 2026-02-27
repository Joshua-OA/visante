import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Circle, Path, Rect, Polyline } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { fetchPharmacies, fetchNurses } from '../services/firestoreService';
import { showErrorToast } from '../utils/toast';

// ─── Colors (mirrors original doctor card) ──────────────────────────────────
const BG = '#FEF8F5';
const WHITE = '#FFFFFF';
const ACCENT = '#B8595A';
const ACCENT_SOFT = '#FAEDED';
const ACCENT_TEXT = '#B25A5E';
const ORANGE = '#F89163';
const ORANGE_SOFT = '#FFF2E9';
const TEXT_DARK = '#1F2937';
const TEXT_MUTED = '#6B7280';
const BORDER_SOFT = '#FDF0E9';
const GREEN = '#10b981';
const GREEN_SOFT = '#ecfdf5';
const STAR_BG = '#FFF9E6';
const STAR_TEXT = '#A17614';
const STAR_STROKE = '#B07C16';
// ─── SVG Icons ──────────────────────────────────────────────────────────────
const BackIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#0D1C2E" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="19" y1="12" x2="5" y2="12" />
    <Polyline points="12 19 5 12 12 5" />
  </Svg>
);

const CheckBadgeIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#C15354" strokeWidth={2}>
    <Circle cx="12" cy="12" r="10" />
    <Path d="M8 12l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const StarIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={STAR_STROKE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </Svg>
);

const BriefcaseIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <Path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </Svg>
);

const GlobeIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Line x1="2" y1="12" x2="22" y2="12" />
    <Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </Svg>
);

const MapPinIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <Circle cx="12" cy="10" r="3" />
  </Svg>
);

const ClockIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Polyline points="12 6 12 12 16 14" />
  </Svg>
);

const PharmacyIcon = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 3h18v4H3z" />
    <Path d="M3 7v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7" />
    <Line x1="12" y1="11" x2="12" y2="17" />
    <Line x1="9" y1="14" x2="15" y2="14" />
  </Svg>
);

const CheckIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="20 6 9 17 4 12" />
  </Svg>
);

const ArrowRightIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="5" y1="12" x2="19" y2="12" />
    <Polyline points="12 5 19 12 12 19" />
  </Svg>
);

// ─── Urgency colour map ────────────────────────────────────────────────────
const URGENCY = {
  low: { label: 'Low Urgency', bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  moderate: { label: 'Moderate Urgency', bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  high: { label: 'High Urgency', bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  emergency: { label: 'Emergency', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
};

// ─── Provider Card (doctor-card style) ──────────────────────────────────────
function ProviderCard({
  imageUri,
  imageLocal,
  fallbackIcon,
  name,
  role,
  rating,
  stat1Icon,
  stat1Text,
  stat2Icon,
  stat2Text,
  infoBg,
  infoIcon,
  infoLabel,
  infoValue,
  infoAction,
  infoActionLabel,
  btnLabel,
  btnColor,
  onPress,
}) {
  const hasImage = imageUri || imageLocal;
  return (
    <View style={styles.providerCard}>
      {/* Decorative corner blob */}
      <View style={styles.cardCornerBlob} />

      {/* Card header — profile row */}
      <View style={styles.cardHeader}>
        <View style={styles.profileImgContainer}>
          {hasImage ? (
            <Image source={imageLocal || { uri: imageUri }} style={styles.profileImg} />
          ) : (
            <View style={styles.profileImgPlaceholder}>
              {fallbackIcon}
            </View>
          )}
          <View style={styles.statusDot} />
        </View>

        <View style={styles.cardTitleArea}>
          <View style={styles.nameRow}>
            <Text style={styles.providerName} numberOfLines={1}>{name}</Text>
            <View style={styles.ratingPill}>
              <StarIcon />
              <Text style={styles.ratingText}>{rating}</Text>
            </View>
          </View>
          <Text style={styles.role}>{role}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              {stat1Icon}
              <Text style={styles.statText}>{stat1Text}</Text>
            </View>
            <View style={styles.statItem}>
              {stat2Icon}
              <Text style={styles.statText}>{stat2Text}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Info box (availability / location) */}
      <View style={[styles.infoBox, { backgroundColor: infoBg }]}>
        <View style={styles.infoIconBox}>
          {infoIcon}
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>{infoLabel}</Text>
          <Text style={styles.infoValue}>{infoValue}</Text>
        </View>
        {infoAction && (
          <TouchableOpacity style={[styles.infoActionBtn, { backgroundColor: btnColor }]} onPress={infoAction} activeOpacity={0.7}>
            <Text style={styles.infoActionText}>{infoActionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Confirm button */}
      <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: btnColor, shadowColor: btnColor }]} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.confirmBtnText}>{btnLabel}</Text>
        <ArrowRightIcon />
      </TouchableOpacity>
    </View>
  );
}

// ─── Dummy fallback data (shown immediately, replaced if Firebase has data) ─
const FALLBACK_PHARMACIES = [
  {
    id: 'fallback-ph-1',
    name: 'HealthPlus Pharmacy',
    address: 'No 14, Ring Road Central, Accra',
    phone: '+233 30 222 1234',
    operating_hours: '8:00 AM – 10:00 PM',
    rating: 4.7,
  },
  {
    id: 'fallback-ph-2',
    name: 'Ernest Chemists',
    address: 'Osu, Oxford Street, Accra',
    operating_hours: '8:00 AM – 8:00 PM',
    rating: 4.6,
  },
];

// Local nurse images (Black healthcare workers)
const NURSE_IMG_FEMALE = require('../assets/iwaria-inc-K8g07Oaguqw-unsplash.jpg');
const NURSE_IMG_MALE_1 = require('../assets/nappy-WuYuMUnNRTI-unsplash.jpg');
const NURSE_IMG_MALE_2 = require('../assets/nappy-K6cnVC_0RuY-unsplash.jpg');

const FALLBACK_NURSES = [
  {
    id: 'fallback-n-1',
    name: 'Sister Abena Osei',
    rating: 4.9,
    experience: '8 yrs',
    rate: 80,
    specialty: 'Home Care Nurse',
    avatarLocal: NURSE_IMG_FEMALE,
  },
  {
    id: 'fallback-n-2',
    name: 'Nurse Kweku Mensah',
    rating: 4.7,
    experience: '5 yrs',
    rate: 80,
    specialty: 'Community Health Nurse',
    avatarLocal: NURSE_IMG_MALE_1,
  },
  {
    id: 'fallback-n-3',
    name: 'Nurse Yaw Boateng',
    rating: 4.8,
    experience: '10 yrs',
    rate: 80,
    specialty: 'Senior Home Care Nurse',
    avatarLocal: NURSE_IMG_MALE_2,
  },
];

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function ResultsScreen({
  onBack,
  onQuit,
  onSelectPharmacy,
  onSelectNurse,
  triageSummary,
}) {
  const insets = useSafeAreaInsets();
  // Start with fallback data so cards show immediately
  const [nurses, setNurses] = useState(FALLBACK_NURSES);
  const [currentNurseIndex, setCurrentNurseIndex] = useState(0);
  const [selectedPharmacy, setSelectedPharmacy] = useState(FALLBACK_PHARMACIES[0]);
  const fadeAnim = useRef(new Animated.Value(1)).current; // visible immediately

  // Derive display values from triage summary
  const recommendation = triageSummary?.ai_recommendation
    ?? 'Based on your symptoms, we recommend visiting a nearby pharmacy or booking a nurse.';
  const urgencyKey = triageSummary?.urgency_level ?? 'moderate';
  const urgency = URGENCY[urgencyKey] ?? URGENCY.moderate;

  // Try to load real data from Firebase in background (silently replace fallback)
  useEffect(() => {
    async function loadProviders() {
      try {
        const [pharmaData, nurseData] = await Promise.all([
          fetchPharmacies(),
          fetchNurses(),
        ]);
        if (nurseData && nurseData.length > 0) {
          setNurses(nurseData);
          setCurrentNurseIndex(0);
        }
        if (pharmaData && pharmaData.length > 0) {
          setSelectedPharmacy(pharmaData[0]);
        }
      } catch (e) {
        console.warn('Could not load providers from Firebase, using fallback:', e);
        showErrorToast(e, 'Couldn\'t Load Providers');
      }
    }
    loadProviders();
  }, []);

  const currentNurse = nurses[currentNurseIndex] ?? null;

  function handleShuffleNurse() {
    if (nurses.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentNurseIndex((prev) => (prev + 1) % nurses.length);
  }

  function handlePharmacySelect() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectPharmacy && onSelectPharmacy(selectedPharmacy);
  }

  function handleNurseSelect() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectNurse && onSelectNurse(currentNurse);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack} activeOpacity={0.7}>
          <BackIcon />
        </TouchableOpacity>
        <Image source={require('../assets/visante-blue.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.iconBtn} />
      </View>

      {/* ── Scrollable body ── */}
      <Animated.ScrollView
        style={[styles.scroll, { opacity: fadeAnim }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Assessment badge */}
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <CheckBadgeIcon />
            <Text style={styles.badgeText}>Assessment Complete</Text>
          </View>
        </View>

        {/* Hero text */}
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Here's what we recommend</Text>
          <Text style={styles.heroSub}>{recommendation}</Text>
        </View>

        {/* Urgency pill */}
        <View style={[styles.urgencyPill, { backgroundColor: urgency.bg, borderColor: urgency.border }]}>
          <Text style={[styles.urgencyText, { color: urgency.text }]}>{urgency.label}</Text>
        </View>

        {/* ── Section label ── */}
        <Text style={styles.sectionTitle}>Choose your care option</Text>

        {/* ── Pharmacy Card (doctor-card style) ── */}
        {selectedPharmacy && (
          <ProviderCard
            imageUri={null}
            fallbackIcon={<PharmacyIcon size={28} />}
            name={selectedPharmacy.name}
            role="Licensed Pharmacy"
            rating={selectedPharmacy.rating ?? '4.5'}
            stat1Icon={<MapPinIcon />}
            stat1Text={selectedPharmacy.address ?? 'Nearby'}
            stat2Icon={<ClockIcon />}
            stat2Text={selectedPharmacy.operating_hours ?? 'Open now'}
            infoBg={GREEN_SOFT}
            infoIcon={<CheckIcon />}
            infoLabel="VITALS CHECK"
            infoValue="FREE — Walk in anytime"
            btnLabel="Go to Pharmacy"
            btnColor={ACCENT}
            onPress={handlePharmacySelect}
          />
        )}

        {/* ── Nurse Card (doctor-card style) ── */}
        {currentNurse && (
          <ProviderCard
            imageUri={currentNurse.avatarUrl ?? null}
            imageLocal={currentNurse.avatarLocal ?? null}
            fallbackIcon={
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <Circle cx="12" cy="7" r="4" />
              </Svg>
            }
            name={currentNurse.name}
            role={currentNurse.specialty ?? 'Home Care Nurse'}
            rating={currentNurse.rating ?? '4.8'}
            stat1Icon={<BriefcaseIcon />}
            stat1Text={`${currentNurse.experience ?? '5 yrs'} exp`}
            stat2Icon={<GlobeIcon />}
            stat2Text="ENGLISH, TWI"
            infoBg={ORANGE_SOFT}
            infoIcon={
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <Circle cx="12" cy="7" r="4" />
              </Svg>
            }
            infoLabel="HOME VISIT"
            infoValue={`GHS ${currentNurse.rate ?? 80}.00 / visit`}
            infoAction={nurses.length > 1 ? handleShuffleNurse : undefined}
            infoActionLabel="Change"
            btnLabel="Book This Nurse"
            btnColor={ORANGE}
            onPress={handleNurseSelect}
          />
        )}

        {/* Quit to dashboard */}
        {onQuit && (
          <TouchableOpacity style={styles.quitBtn} onPress={onQuit} activeOpacity={0.7}>
            <Text style={styles.quitBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        )}

      </Animated.ScrollView>
    </View>
  );
}

// ─── Responsive helpers ─────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const PROFILE_IMG_SIZE = Math.min(SCREEN_W * 0.17, 64);
const INFO_ICON_SIZE = Math.min(SCREEN_W * 0.1, 36);

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 24,
  },

  // Header
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

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32, gap: 20 },

  // Badge
  badgeRow: { alignItems: 'center', paddingTop: 8 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: ACCENT_SOFT, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 30,
  },
  badgeText: { color: ACCENT_TEXT, fontSize: 13, fontWeight: '500' },

  // Hero text
  heroText: { alignItems: 'center', paddingHorizontal: 8, gap: 10 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: TEXT_DARK, textAlign: 'center' },
  heroSub: { fontSize: 14, color: TEXT_MUTED, lineHeight: 21, textAlign: 'center' },

  // Urgency pill
  urgencyPill: { alignSelf: 'center', borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 16 },
  urgencyText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },

  // Section title
  sectionTitle: { fontSize: 16, fontWeight: '700', color: TEXT_DARK, marginTop: 4 },

  // ── Provider card (doctor-card design) ──
  providerCard: {
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: BORDER_SOFT,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.02,
    shadowRadius: 20,
    elevation: 2,
    gap: 16,
  },
  cardCornerBlob: {
    position: 'absolute', top: 0, right: 0, width: 140, height: 120,
    backgroundColor: '#FEF0E6', borderBottomLeftRadius: 120, opacity: 0.7,
  },
  cardHeader: { flexDirection: 'row', gap: 16, zIndex: 1 },
  profileImgContainer: { width: PROFILE_IMG_SIZE, height: PROFILE_IMG_SIZE, position: 'relative' },
  profileImg: { width: PROFILE_IMG_SIZE, height: PROFILE_IMG_SIZE, borderRadius: 12 },
  profileImgPlaceholder: {
    width: PROFILE_IMG_SIZE, height: PROFILE_IMG_SIZE, borderRadius: 12,
    backgroundColor: ACCENT_SOFT, alignItems: 'center', justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute', bottom: -2, right: -2, width: 16, height: 16,
    backgroundColor: ACCENT, borderWidth: 2, borderColor: WHITE, borderRadius: 8,
  },
  cardTitleArea: { flex: 1, justifyContent: 'center', gap: 4, zIndex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  providerName: { fontSize: 17, fontWeight: '700', color: TEXT_DARK, flex: 1, marginRight: 8 },
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: STAR_BG, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8,
  },
  ratingText: { fontSize: 12, fontWeight: '600', color: STAR_TEXT },
  role: { fontSize: 14, color: TEXT_MUTED },
  statsRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: TEXT_MUTED, fontWeight: '500' },

  // Info box (availability / location)
  infoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: 12, zIndex: 1,
  },
  infoIconBox: {
    backgroundColor: WHITE, width: INFO_ICON_SIZE, height: INFO_ICON_SIZE, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  infoContent: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 10, fontWeight: '600', color: TEXT_MUTED, letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  infoActionBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  infoActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  // Confirm button
  confirmBtn: {
    borderRadius: 12, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 6,
  },
  confirmBtnText: { color: WHITE, fontSize: 16, fontWeight: '600' },

  // Quit button
  quitBtn: { alignItems: 'center', paddingVertical: 12 },
  quitBtnText: { color: TEXT_MUTED, fontSize: 14, fontWeight: '600' },
});
