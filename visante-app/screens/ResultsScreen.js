import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Circle, Path, Rect, Polyline, Polygon } from 'react-native-svg';

// ─── Colors (mirrors stage-2.html) ─────────────────────────────────────────
const BG          = '#FEF8F5';
const WHITE       = '#FFFFFF';
const ACCENT      = '#B8595A';
const ACCENT_SOFT = '#FAEDED';
const ACCENT_TEXT = '#B25A5E';
const ORANGE      = '#F89163';
const ORANGE_SOFT = '#FFF2E9';
const TEXT_DARK   = '#1F2937';
const TEXT_MUTED  = '#6B7280';
const TEXT_GRAY   = '#4B5563';
const BORDER_SOFT = '#FDF0E9';
const TAG_BG      = '#F9FAFB';
const TAG_BORDER  = '#F3F4F6';
const STAR_BG     = '#FFF9E6';
const STAR_TEXT   = '#A17614';
const STAR_STROKE = '#B07C16';

// ─── SVG Icons ─────────────────────────────────────────────────────────────
const BackIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#0D1C2E" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="19" y1="12" x2="5" y2="12" />
    <Polyline points="12 19 5 12 12 5" />
  </Svg>
);

const DotsIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="#0D1C2E">
    <Circle cx="5" cy="12" r="2.5" />
    <Circle cx="12" cy="12" r="2.5" />
    <Circle cx="19" cy="12" r="2.5" />
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
    <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
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

const VideoIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Polygon points="23 7 16 12 23 17 23 7" />
    <Rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </Svg>
);

const WalletIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="2" y="6" width="20" height="12" rx="2" />
    <Circle cx="12" cy="12" r="2" />
    <Path d="M6 12h.01M18 12h.01" />
  </Svg>
);

const ArrowRightIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="5" y1="12" x2="19" y2="12" />
    <Polyline points="12 5 19 12 12 19" />
  </Svg>
);

// ─── Main Screen ───────────────────────────────────────────────────────────
export default function ResultsScreen({ onBack, onConfirm, onConfirmAppointment }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack} activeOpacity={0.7}>
          <BackIcon />
        </TouchableOpacity>
        <Image
          source={require('../assets/visante-blue.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
          <DotsIcon />
        </TouchableOpacity>
      </View>

      {/* ── Scrollable body ── */}
      <ScrollView
        style={styles.scroll}
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
          <Text style={styles.heroTitle}>We found a match</Text>
          <Text style={styles.heroSub}>
            Based on your symptoms, we recommend a General Practitioner with immediate availability.
          </Text>
        </View>

        {/* Provider card */}
        <View style={styles.providerCard}>

          {/* Decorative corner blob */}
          <View style={styles.cardCornerBlob} />

          {/* Card header */}
          <View style={styles.cardHeader}>
            <View style={styles.profileImgContainer}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=150&h=150' }}
                style={styles.profileImg}
              />
              <View style={styles.statusDot} />
            </View>

            <View style={styles.cardTitleArea}>
              <View style={styles.nameRow}>
                <Text style={styles.providerName}>Kwame Ansah</Text>
                <View style={styles.ratingPill}>
                  <StarIcon />
                  <Text style={styles.ratingText}>4.9</Text>
                </View>
              </View>
              <Text style={styles.role}>Physician Assistant</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <BriefcaseIcon />
                  <Text style={styles.statText}>12 yrs exp</Text>
                </View>
                <View style={styles.statItem}>
                  <GlobeIcon />
                  <Text style={styles.statText}>ENGLISH, TWI</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Availability box */}
          <View style={styles.availabilityBox}>
            <View style={styles.iconBox}>
              <VideoIcon />
            </View>
            <View style={styles.availInfo}>
              <Text style={styles.availLabel}>NEXT AVAILABLE</Text>
              <Text style={styles.availTime}>Today, 2:30 PM</Text>
            </View>
            <TouchableOpacity style={styles.changeBtn} onPress={onConfirm} activeOpacity={0.7}>
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>

          </View>

          {/* Tags */}
          <View style={styles.tagsRow}>
            <View style={styles.tag}><Text style={styles.tagText}>Flu Symptoms</Text></View>
            <View style={styles.tag}><Text style={styles.tagText}>Prescriptions</Text></View>
          </View>

        </View>

        {/* Cost card */}
        <View style={styles.costCard}>
          <View style={styles.costIconBox}>
            <WalletIcon />
          </View>
          <View style={styles.costInfo}>
            <Text style={styles.costLabel}>Estimated Cost</Text>
            <Text style={styles.costSub}>With your insurance</Text>
          </View>
          <Text style={styles.costPrice}>GHS50.00</Text>
        </View>

        {/* Confirm button */}
        <TouchableOpacity style={styles.confirmBtn} onPress={onConfirmAppointment} activeOpacity={0.85}>
          <Text style={styles.confirmBtnText}>Confirm Appointment</Text>
          <ArrowRightIcon />
        </TouchableOpacity>

      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    gap: 24,
  },

  // Badge
  badgeRow: {
    alignItems: 'center',
    paddingTop: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ACCENT_SOFT,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
  },
  badgeText: {
    color: ACCENT_TEXT,
    fontSize: 13,
    fontWeight: '500',
  },

  // Hero text
  heroText: {
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 15,
    color: TEXT_MUTED,
    lineHeight: 22,
    textAlign: 'center',
  },

  // Provider card
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
    position: 'absolute',
    top: 0,
    right: 0,
    width: 140,
    height: 120,
    backgroundColor: '#FEF0E6',
    borderBottomLeftRadius: 120,
    opacity: 0.7,
  },

  // Card header
  cardHeader: {
    flexDirection: 'row',
    gap: 16,
    zIndex: 1,
  },
  profileImgContainer: {
    width: 64,
    height: 64,
    position: 'relative',
  },
  profileImg: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    backgroundColor: ACCENT,
    borderWidth: 2,
    borderColor: WHITE,
    borderRadius: 8,
  },
  cardTitleArea: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
    zIndex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  providerName: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: STAR_BG,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: STAR_TEXT,
  },
  role: {
    fontSize: 14,
    color: TEXT_MUTED,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: '500',
  },

  // Availability box
  availabilityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: ORANGE_SOFT,
    borderRadius: 12,
    padding: 12,
    zIndex: 1,
  },
  iconBox: {
    backgroundColor: WHITE,
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availInfo: {
    flex: 1,
    gap: 2,
  },
  availLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT_MUTED,
    letterSpacing: 0.5,
  },
  availTime: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  changeBtn: {
    backgroundColor: ORANGE,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  changeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    zIndex: 1,
  },
  tag: {
    backgroundColor: TAG_BG,
    borderWidth: 1,
    borderColor: TAG_BORDER,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_GRAY,
  },

  // Cost card
  costCard: {
    backgroundColor: WHITE,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 1,
  },
  costIconBox: {
    backgroundColor: '#F3F4F6',
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  costInfo: {
    flex: 1,
    gap: 2,
  },
  costLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_DARK,
  },
  costSub: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  costPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  // Confirm button
  confirmBtn: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  confirmBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
});
