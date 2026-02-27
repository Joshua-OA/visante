import { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
    Line, Polyline, Path, Circle, Rect,
} from 'react-native-svg';
import { fetchPharmacies, fetchNurses } from '../services/firestoreService';
import { showErrorToast } from '../utils/toast';

// ─── Colors ─────────────────────────────────────────────────────────────────
const BG = '#FEF8F5';
const WHITE = '#FFFFFF';
const ACCENT = '#B8595A';
const ACCENT_SOFT = '#FAEDED';
const TEXT_DARK = '#1F2937';
const TEXT_MUTED = '#6B7280';
const TEXT_LIGHT = '#94a3b8';
const ORANGE = '#F89163';
const ORANGE_SOFT = '#FFF2E9';
const GREEN = '#10b981';
const GREEN_SOFT = '#ecfdf5';
const GREEN_BORDER = '#a7f3d0';
const BORDER_SOFT = '#F3F4F6';
const STAR_GOLD = '#f59e0b';

// ─── Icons ───────────────────────────────────────────────────────────────────
const BackIcon = () => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"
        stroke="#0D1C2E" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <Line x1="19" y1="12" x2="5" y2="12" />
        <Polyline points="12 19 5 12 12 5" />
    </Svg>
);

const PharmacyIcon = ({ color = ACCENT }) => (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 3h18v4H3z" />
        <Path d="M3 7v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7" />
        <Line x1="12" y1="11" x2="12" y2="17" />
        <Line x1="9" y1="14" x2="15" y2="14" />
    </Svg>
);

const NurseIcon = ({ color = ORANGE }) => (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <Circle cx="12" cy="7" r="4" />
        <Line x1="12" y1="3" x2="12" y2="5" />
        <Line x1="11" y1="4" x2="13" y2="4" />
    </Svg>
);

const MapPinIcon = () => (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"
        stroke={TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <Circle cx="12" cy="10" r="3" />
    </Svg>
);

const ClockIcon = () => (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"
        stroke={TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="12" r="10" />
        <Polyline points="12 6 12 12 16 14" />
    </Svg>
);

const PhoneIcon = () => (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"
        stroke={TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 10.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 7.91a16 16 0 0 0 6 6l.85-.85a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 15z" />
    </Svg>
);

const StarIcon = () => (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill={STAR_GOLD}
        stroke={STAR_GOLD} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
);

const ArrowRightIcon = ({ color = WHITE }) => (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <Line x1="5" y1="12" x2="19" y2="12" />
        <Polyline points="12 5 19 12 12 19" />
    </Svg>
);

const CheckIcon = () => (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"
        stroke={GREEN} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="20 6 9 17 4 12" />
    </Svg>
);

// ─── Loading Spinner ──────────────────────────────────────────────────────────
function LoadingCard({ message }) {
    return (
        <View style={styles.loadingCard}>
            <ActivityIndicator color={ACCENT} size="small" />
            <Text style={styles.loadingText}>{message}</Text>
        </View>
    );
}

// ─── Pharmacy Card ───────────────────────────────────────────────────────────
function PharmacyCard({ pharmacy, selected, onSelect }) {
    return (
        <TouchableOpacity
            style={[styles.providerCard, selected && styles.providerCardSelected]}
            onPress={() => onSelect(pharmacy)}
            activeOpacity={0.8}
        >
            <View style={[styles.providerIconBox, { backgroundColor: ACCENT_SOFT }]}>
                <PharmacyIcon color={ACCENT} />
            </View>
            <View style={styles.providerInfo}>
                <View style={styles.providerNameRow}>
                    <Text style={styles.providerName}>{pharmacy.name}</Text>
                    {selected && (
                        <View style={styles.selectedBadge}>
                            <CheckIcon />
                        </View>
                    )}
                </View>
                <View style={styles.metaRow}>
                    <MapPinIcon />
                    <Text style={styles.metaText} numberOfLines={1}>{pharmacy.address}</Text>
                </View>
                <View style={styles.metaRow}>
                    <ClockIcon />
                    <Text style={styles.metaText}>{pharmacy.operating_hours}</Text>
                </View>
                {pharmacy.phone && (
                    <View style={styles.metaRow}>
                        <PhoneIcon />
                        <Text style={styles.metaText}>{pharmacy.phone}</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

// ─── Nurse Card ──────────────────────────────────────────────────────────────
function NurseCard({ nurse, selected, onSelect }) {
    return (
        <TouchableOpacity
            style={[styles.providerCard, selected && styles.providerCardSelected]}
            onPress={() => onSelect(nurse)}
            activeOpacity={0.8}
        >
            {nurse.avatarUrl ? (
                <Image source={{ uri: nurse.avatarUrl }} style={styles.nurseAvatar} />
            ) : (
                <View style={[styles.providerIconBox, { backgroundColor: ORANGE_SOFT }]}>
                    <NurseIcon color={ORANGE} />
                </View>
            )}
            <View style={styles.providerInfo}>
                <View style={styles.providerNameRow}>
                    <Text style={styles.providerName}>{nurse.name}</Text>
                    {selected && (
                        <View style={styles.selectedBadge}>
                            <CheckIcon />
                        </View>
                    )}
                </View>
                <Text style={styles.nurseRole}>{nurse.specialty}</Text>
                <View style={styles.nurseMetaRow}>
                    <StarIcon />
                    <Text style={styles.nurseRating}>{nurse.rating}</Text>
                    <Text style={styles.nurseSep}>·</Text>
                    <Text style={styles.nurseExp}>{nurse.experience} exp</Text>
                </View>
                <Text style={styles.nurseRate}>GHS {nurse.rate}.00 / visit</Text>
            </View>
        </TouchableOpacity>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ServiceSelectionScreen({ onBack, onSelectPharmacy, onSelectNurse }) {
    const insets = useSafeAreaInsets();

    const [tab, setTab] = useState('pharmacy'); // 'pharmacy' | 'nurse'
    const [pharmacies, setPharmacies] = useState([]);
    const [nurses, setNurses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState(null);

    // Fetch data whenever tab changes
    useEffect(() => {
        setSelected(null);
        setError(null);

        async function load() {
            setLoading(true);
            try {
                if (tab === 'pharmacy') {
                    const data = await fetchPharmacies();
                    setPharmacies(data);
                } else {
                    const data = await fetchNurses();
                    setNurses(data);
                }
            } catch (e) {
                console.warn('ServiceSelection fetch error:', e);
                setError('Could not load providers. Please check your connection.');
                showErrorToast(e, 'Could Not Load Providers');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [tab]);

    function handleConfirm() {
        if (!selected) return;
        if (tab === 'pharmacy') {
            onSelectPharmacy && onSelectPharmacy(selected);
        } else {
            onSelectNurse && onSelectNurse(selected);
        }
    }

    const confirmDisabled = !selected;

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>

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
                <View style={styles.iconBtn} />
            </View>

            {/* ── Hero ── */}
            <View style={styles.hero}>
                <Text style={styles.heroTitle}>Choose Your Service</Text>
                <Text style={styles.heroSub}>
                    Select how you'd like to receive care
                </Text>
            </View>

            {/* ── Tab switcher ── */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, tab === 'pharmacy' && styles.tabActive]}
                    onPress={() => setTab('pharmacy')}
                    activeOpacity={0.8}
                >
                    <PharmacyIcon color={tab === 'pharmacy' ? WHITE : TEXT_MUTED} />
                    <Text style={[styles.tabText, tab === 'pharmacy' && styles.tabTextActive]}>
                        Nearest Pharmacy
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, tab === 'nurse' && styles.tabActive, tab === 'nurse' && styles.tabActiveOrange]}
                    onPress={() => setTab('nurse')}
                    activeOpacity={0.8}
                >
                    <NurseIcon color={tab === 'nurse' ? WHITE : TEXT_MUTED} />
                    <Text style={[styles.tabText, tab === 'nurse' && styles.tabTextActive]}>
                        Book a Nurse
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ── Subtitle band ── */}
            {tab === 'pharmacy' ? (
                <View style={[styles.infoBand, { backgroundColor: GREEN_SOFT, borderColor: GREEN_BORDER }]}>
                    <CheckIcon />
                    <Text style={[styles.infoBandText, { color: GREEN }]}>
                        FREE — Vitals check at the pharmacy
                    </Text>
                </View>
            ) : (
                <View style={[styles.infoBand, { backgroundColor: ORANGE_SOFT, borderColor: '#ffedd5' }]}>
                    <Text style={[styles.infoBandText, { color: '#c2410c' }]}>
                        GHS 80 — Personal home visit by a nurse
                    </Text>
                </View>
            )}

            {/* ── Provider list ── */}
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 110 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <LoadingCard
                        message={
                            tab === 'pharmacy'
                                ? 'Finding nearby pharmacies…'
                                : 'Loading available nurses…'
                        }
                    />
                ) : error ? (
                    <View style={styles.errorCard}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity
                            style={styles.retryBtn}
                            onPress={() => setTab(tab)} // re-triggers useEffect
                            activeOpacity={0.8}
                        >
                            <Text style={styles.retryText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : tab === 'pharmacy' ? (
                    pharmacies.length === 0 ? (
                        <Text style={styles.emptyText}>No pharmacies found nearby.</Text>
                    ) : (
                        pharmacies.map((ph) => (
                            <PharmacyCard
                                key={ph.id}
                                pharmacy={ph}
                                selected={selected?.id === ph.id}
                                onSelect={setSelected}
                            />
                        ))
                    )
                ) : nurses.length === 0 ? (
                    <Text style={styles.emptyText}>No nurses available right now.</Text>
                ) : (
                    nurses.map((n) => (
                        <NurseCard
                            key={n.id}
                            nurse={n}
                            selected={selected?.id === n.id}
                            onSelect={setSelected}
                        />
                    ))
                )}
            </ScrollView>

            {/* ── Sticky footer ── */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity
                    style={[
                        styles.confirmBtn,
                        tab === 'nurse' && styles.confirmBtnOrange,
                        confirmDisabled && styles.confirmBtnDisabled,
                    ]}
                    onPress={handleConfirm}
                    disabled={confirmDisabled}
                    activeOpacity={0.85}
                >
                    <Text style={styles.confirmBtnText}>
                        {tab === 'pharmacy' ? 'Go to Pharmacy' : 'Book This Nurse'}
                    </Text>
                    <ArrowRightIcon />
                </TouchableOpacity>
            </View>

        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BG,
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
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

    hero: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 4,
        paddingBottom: 20,
        gap: 6,
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: TEXT_DARK,
    },
    heroSub: {
        fontSize: 14,
        color: TEXT_MUTED,
    },

    // Tab bar
    tabBar: {
        flexDirection: 'row',
        marginHorizontal: 20,
        gap: 10,
        marginBottom: 10,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: WHITE,
        borderWidth: 1.5,
        borderColor: BORDER_SOFT,
    },
    tabActive: {
        backgroundColor: ACCENT,
        borderColor: ACCENT,
    },
    tabActiveOrange: {
        backgroundColor: ORANGE,
        borderColor: ORANGE,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: TEXT_MUTED,
    },
    tabTextActive: {
        color: WHITE,
    },

    // Info band
    infoBand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 20,
        marginBottom: 14,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
    },
    infoBandText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Scroll
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        gap: 12,
    },

    // Loading card
    loadingCard: {
        backgroundColor: WHITE,
        borderRadius: 14,
        padding: 24,
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: BORDER_SOFT,
    },
    loadingText: {
        fontSize: 14,
        color: TEXT_MUTED,
    },

    // Error card
    errorCard: {
        backgroundColor: WHITE,
        borderRadius: 14,
        padding: 24,
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    errorText: {
        fontSize: 14,
        color: '#b91c1c',
        textAlign: 'center',
    },
    retryBtn: {
        backgroundColor: ACCENT,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 24,
    },
    retryText: {
        color: WHITE,
        fontWeight: '600',
        fontSize: 14,
    },

    emptyText: {
        textAlign: 'center',
        color: TEXT_LIGHT,
        fontSize: 14,
        marginTop: 20,
    },

    // Provider cards (shared pharmacy + nurse)
    providerCard: {
        backgroundColor: WHITE,
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        borderWidth: 1.5,
        borderColor: BORDER_SOFT,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
    },
    providerCardSelected: {
        borderColor: ACCENT,
        backgroundColor: ACCENT_SOFT,
    },
    providerIconBox: {
        width: 52,
        height: 52,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    nurseAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        flexShrink: 0,
    },
    providerInfo: {
        flex: 1,
        gap: 4,
    },
    providerNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    providerName: {
        fontSize: 15,
        fontWeight: '700',
        color: TEXT_DARK,
        flex: 1,
    },
    selectedBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: GREEN_SOFT,
        borderWidth: 1,
        borderColor: GREEN_BORDER,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    metaText: {
        fontSize: 12,
        color: TEXT_MUTED,
        flex: 1,
    },

    // Nurse-specific
    nurseRole: {
        fontSize: 12,
        color: TEXT_MUTED,
    },
    nurseMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    nurseRating: {
        fontSize: 12,
        fontWeight: '600',
        color: TEXT_DARK,
    },
    nurseSep: {
        fontSize: 12,
        color: TEXT_LIGHT,
    },
    nurseExp: {
        fontSize: 12,
        color: TEXT_MUTED,
    },
    nurseRate: {
        fontSize: 13,
        fontWeight: '700',
        color: ORANGE,
        marginTop: 2,
    },

    // Footer
    footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        backgroundColor: `${BG}F0`,
        borderTopWidth: 1,
        borderTopColor: BORDER_SOFT,
    },
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: ACCENT,
        borderRadius: 12,
        paddingVertical: 18,
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
        elevation: 6,
    },
    confirmBtnOrange: {
        backgroundColor: ORANGE,
        shadowColor: ORANGE,
    },
    confirmBtnDisabled: {
        opacity: 0.45,
        shadowOpacity: 0,
        elevation: 0,
    },
    confirmBtnText: {
        color: WHITE,
        fontSize: 16,
        fontWeight: '600',
    },
});
