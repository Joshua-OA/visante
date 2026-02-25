import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Circle, Path, Rect, Polyline } from 'react-native-svg';

// ─── Colors (mirrors booking.html) ─────────────────────────────────────────
const BG           = '#FFFFFF';
const TEXT_DARK    = '#111827';
const TEXT_DARK2   = '#1F2937';
const TEXT_MUTED   = '#6B7280';
const TEXT_GRAY    = '#9CA3AF';
const TEXT_BODY    = '#374151';
const BORDER       = '#F3F4F6';
const BORDER_SLOT  = '#E5E7EB';
const ACCENT       = '#B85A5B';
const ACCENT_SOFT  = '#FCF4F4';
const ORANGE_SEL   = '#F47B2A';
const DATE_MUTED   = '#CBD5E1';
const SLOT_DIS_BG  = '#F9FAFB';
const STATUS_DOT   = '#C15B5B';
const WHITE        = '#FFFFFF';
const NAVY         = '#0A1B44';

// ─── Calendar data ──────────────────────────────────────────────────────────
const DAY_NAMES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// Mirrors the HTML calendar: muted = past/unavailable, selectable = available
// null = empty cell padding, true = available, false = muted
const CALENDAR_ROWS = [
  [
    { label: '29', muted: true }, { label: '30', muted: true },
    { label: '1',  muted: true }, { label: '2',  muted: true },
    { label: '3',  muted: true }, { label: '4',  muted: true },
    { label: '5',  muted: true },
  ],
  [
    { label: '6',  muted: true }, { label: '7',  muted: true },
    { label: '8',  muted: true }, { label: '9',  muted: true },
    { label: '10', muted: true }, { label: '11', muted: true },
    { label: '12', muted: true },
  ],
  [
    { label: '13', muted: true  },
    { label: '14', muted: false }, // selected by default
    { label: '15', muted: false },
    { label: '16', muted: true  },
    { label: '17', muted: true  },
    { label: '18', muted: false },
    { label: '19', muted: false },
  ],
];

// ─── Time slot data ─────────────────────────────────────────────────────────
const TIME_GROUPS = [
  {
    title: 'Morning',
    slots: [
      { label: '09:00 AM', disabled: false, defaultSelected: true },
      { label: '09:30 AM', disabled: false },
      { label: '10:00 AM', disabled: false },
      { label: '10:30 AM', disabled: true },
      { label: '11:00 AM', disabled: false },
      { label: '11:30 AM', disabled: false },
    ],
  },
  {
    title: 'Afternoon',
    slots: [
      { label: '01:00 PM', disabled: false },
      { label: '01:30 PM', disabled: false },
      { label: '02:00 PM', disabled: false },
    ],
  },
  {
    title: 'Evening',
    slots: [],
  },
];

// ─── SVG Icons ─────────────────────────────────────────────────────────────
const BackIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={TEXT_DARK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="19" y1="12" x2="5" y2="12" />
    <Polyline points="12 19 5 12 12 5" />
  </Svg>
);

const DotsVerticalIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill={TEXT_DARK}>
    <Circle cx="12" cy="5" r="2" />
    <Circle cx="12" cy="12" r="2" />
    <Circle cx="12" cy="19" r="2" />
  </Svg>
);

const StarIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </Svg>
);

const ChevronLeftIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="15 18 9 12 15 6" />
  </Svg>
);

const ChevronRightIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="9 18 15 12 9 6" />
  </Svg>
);

const ArrowRightIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="5" y1="12" x2="19" y2="12" />
    <Polyline points="12 5 19 12 12 19" />
  </Svg>
);

// ─── Main Screen ───────────────────────────────────────────────────────────
export default function BookingScreen({ onBack, onConfirm }) {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState('14');
  const [selectedTime, setSelectedTime] = useState('09:00 AM');

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Sticky Header (with bottom border, no horizontal padding on root) ── */}
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
          <DotsVerticalIcon />
        </TouchableOpacity>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* Provider profile */}
        <View style={styles.providerProfile}>
          <View style={styles.profileImgContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=150&h=150' }}
              style={styles.profileImg}
            />
            <View style={styles.statusDot} />
          </View>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>Kwame Ansah</Text>
            <Text style={styles.providerRole}>Physician Assistant</Text>
            <View style={styles.ratingRow}>
              <StarIcon />
              <Text style={styles.ratingValue}>4.9</Text>
              <Text style={styles.ratingCount}>(124 reviews)</Text>
            </View>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarSection}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarTitle}>October 2026</Text>
            <View style={styles.calendarNav}>
              <TouchableOpacity activeOpacity={0.7}><ChevronLeftIcon /></TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7}><ChevronRightIcon /></TouchableOpacity>
            </View>
          </View>

          {/* Day name row */}
          <View style={styles.calendarGrid}>
            {DAY_NAMES.map(d => (
              <View key={d} style={styles.dayNameCell}>
                <Text style={styles.dayName}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Date rows */}
          {CALENDAR_ROWS.map((row, ri) => (
            <View key={ri} style={styles.calendarGrid}>
              {row.map((cell, ci) => {
                const isSelected = !cell.muted && cell.label === selectedDate;
                return (
                  <TouchableOpacity
                    key={ci}
                    style={[
                      styles.dateCell,
                      cell.muted && styles.dateMuted,
                      isSelected && styles.dateSelected,
                    ]}
                    onPress={() => !cell.muted && setSelectedDate(cell.label)}
                    disabled={cell.muted}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.dateCellText,
                      cell.muted && styles.dateMutedText,
                      isSelected && styles.dateSelectedText,
                    ]}>
                      {cell.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Time slots */}
        <View style={styles.timesSection}>
          <Text style={styles.sectionTitle}>Available Times</Text>

          {TIME_GROUPS.map((group, gi) => (
            <View key={gi} style={[styles.timeGroup, gi === TIME_GROUPS.length - 1 && { marginBottom: 0 }]}>
              <Text style={styles.timeGroupTitle}>{group.title}</Text>
              {group.slots.length > 0 ? (
                <View style={styles.timeGrid}>
                  {group.slots.map((slot, si) => {
                    const isSelected = slot.label === selectedTime;
                    return (
                      <TouchableOpacity
                        key={si}
                        style={[
                          styles.timeSlot,
                          isSelected && styles.timeSlotSelected,
                          slot.disabled && styles.timeSlotDisabled,
                        ]}
                        onPress={() => !slot.disabled && setSelectedTime(slot.label)}
                        disabled={slot.disabled}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.timeSlotText,
                          isSelected && styles.timeSlotSelectedText,
                          slot.disabled && styles.timeSlotDisabledText,
                        ]}>
                          {slot.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.noSlotsText}>No slots available</Text>
              )}
            </View>
          ))}
        </View>

      </ScrollView>

      {/* ── Sticky bottom bar ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.costInfo}>
          <Text style={styles.costLabel}>Total Cost</Text>
          <Text style={styles.costAmount}>GHS 50.00</Text>
        </View>
        <TouchableOpacity style={styles.confirmBtn} activeOpacity={0.85} onPress={onConfirm}>
          <Text style={styles.confirmBtnText}>Confirm Booking</Text>
          <ArrowRightIcon />
        </TouchableOpacity>
      </View>

    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  // Header — with bottom border, full-width, own horizontal padding
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
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
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 32,
  },

  // Provider profile
  providerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileImgContainer: {
    width: 64,
    height: 64,
    position: 'relative',
    flexShrink: 0,
  },
  profileImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    backgroundColor: STATUS_DOT,
    borderWidth: 2,
    borderColor: WHITE,
    borderRadius: 7,
  },
  providerInfo: {
    gap: 2,
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  providerRole: {
    fontSize: 14,
    color: TEXT_MUTED,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  ratingCount: {
    fontSize: 13,
    color: TEXT_GRAY,
  },

  // Calendar
  calendarSection: {
    gap: 0,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  calendarNav: {
    flexDirection: 'row',
    gap: 16,
  },
  calendarGrid: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_GRAY,
  },
  dateCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCellText: {
    width: 36,
    height: 36,
    lineHeight: 36,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
    color: TEXT_DARK2,
    borderRadius: 18,
    overflow: 'hidden',
  },
  dateMuted: {},
  dateMutedText: {
    color: DATE_MUTED,
  },
  dateSelected: {},
  dateSelectedText: {
    backgroundColor: ORANGE_SEL,
    color: WHITE,
    overflow: 'hidden',
    shadowColor: ORANGE_SEL,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },

  // Times section
  timesSection: {
    gap: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  timeGroup: {
    gap: 12,
    marginBottom: 4,
  },
  timeGroupTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeSlot: {
    width: '30%',
    borderWidth: 1,
    borderColor: BORDER_SLOT,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: WHITE,
  },
  timeSlotText: {
    fontSize: 13,
    fontWeight: '500',
    color: TEXT_BODY,
  },
  timeSlotSelected: {
    borderColor: ACCENT,
    backgroundColor: ACCENT_SOFT,
  },
  timeSlotSelectedText: {
    color: ACCENT,
  },
  timeSlotDisabled: {
    backgroundColor: SLOT_DIS_BG,
  },
  timeSlotDisabledText: {
    color: TEXT_GRAY,
    textDecorationLine: 'line-through',
  },
  noSlotsText: {
    fontSize: 13,
    color: TEXT_GRAY,
    fontStyle: 'italic',
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: WHITE,
  },
  costInfo: {
    gap: 4,
  },
  costLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_MUTED,
  },
  costAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  confirmBtnText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '600',
  },
});
