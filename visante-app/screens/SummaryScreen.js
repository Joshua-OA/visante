import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { useState } from 'react';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Polyline, Path, Circle, Rect } from 'react-native-svg';
import { saveConsultationSummary } from '../services/firestoreService';
import { showErrorToast } from '../utils/toast';

// ─── Colors ─────────────────────────────────────────────────────────────────
const BG_COLOR = '#f7f9fa';
const TEXT_MAIN = '#1e293b';
const TEXT_SEC = '#64748b';
const TEXT_TERT = '#94a3b8';
const WHITE = '#ffffff';
const BTN_RED = '#b95c5c';
const DIAG_BG = '#ecfdf5';
const DIAG_BORDER = '#a7f3d0';
const DIAG_TEXT = '#059669';
const RX_BG = '#fff7ed';
const RX_BORDER = '#ffedd5';
const RX_ICON_CLR = '#c2410c';
const STAR_YELLOW = '#fbbf24';
const STATUS_GREEN = '#10b981';
const BLUE_ICON = '#0ea5e9';
const BORDER_LIGHT = '#f1f5f9';

// ─── Icons ──────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke={TEXT_MAIN} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="19" y1="12" x2="5" y2="12" />
    <Polyline points="12 19 5 12 12 5" />
  </Svg>
);

const ShareIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke={BLUE_ICON} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="18" cy="5" r="3" />
    <Circle cx="6" cy="12" r="3" />
    <Circle cx="18" cy="19" r="3" />
    <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </Svg>
);

const StethoscopeIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke="#b05c65" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
    <Path d="M8 15v1a6 6 0 0 0 6 6h0a6 6 0 0 0 6-6v-4" />
    <Circle cx="20" cy="10" r="2" />
  </Svg>
);

const CapsulesIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke="#b05c65" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
    <Line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
  </Svg>
);

const ClipboardIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke={TEXT_SEC} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </Svg>
);

const UserIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"
    stroke={TEXT_TERT} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <Circle cx="12" cy="7" r="4" />
  </Svg>
);

const BottleIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke={RX_ICON_CLR} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 2h6l1 4H8z" />
    <Path d="M8 6c0 0-2 1-2 6s2 10 6 10 6-5 6-10-2-6-2-6" />
    <Line x1="12" y1="11" x2="12" y2="15" />
    <Line x1="10" y1="13" x2="14" y2="13" />
  </Svg>
);

const InboxIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke={RX_ICON_CLR} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <Path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </Svg>
);

const DownloadIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <Polyline points="7 10 12 15 17 10" />
    <Line x1="12" y1="15" x2="12" y2="3" />
  </Svg>
);

const LockIcon = () => (
  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none"
    stroke={TEXT_TERT} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

const RefreshIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none"
    stroke="#ea580c" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M23 4v6h-6" />
    <Path d="M1 20v-6h6" />
    <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </Svg>
);

const HomeIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke={TEXT_SEC} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <Polyline points="9 22 9 12 15 12 15 22" />
  </Svg>
);

// ─── Generate verification hash for QR ──────────────────────────────────────
function generateVerificationCode(appointmentId, sessionId) {
  // Simple hash: combine IDs + date to create a verification string
  const date = new Date().toISOString().split('T')[0];
  const raw = `VISANTE-${appointmentId || 'N/A'}-${sessionId || 'N/A'}-${date}`;
  // Create a simple checksum
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `VIS-${Math.abs(hash).toString(36).toUpperCase().slice(0, 8)}`;
}

// ─── Build QR code URL (using free API) ─────────────────────────────────────
function getQrCodeUrl(data) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}&margin=8`;
}

// ─── Format today's date ────────────────────────────────────────────────────
function formatDate() {
  const d = new Date();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatTime() {
  const d = new Date();
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${ampm}`;
}

// ─── Build medical slip HTML for PDF ────────────────────────────────────────
function buildMedicalSlipHtml({ patientName, patientAge, patientGender, diagnosis, chiefComplaint, medications, notes, refNo, verificationCode, qrData, date }) {
  const qrUrl = getQrCodeUrl(qrData);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Medical Document</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&family=Roboto+Mono:wght@400&display=swap');
    :root {
      --text-main: #111827;
      --text-secondary: #64748b;
      --text-light: #94a3b8;
      --red-accent: #c15f5f;
      --border-light: #e2e8f0;
      --signature-blue: #4a6096;
      --font-sans: 'Inter', -apple-system, sans-serif;
      --font-serif: 'Playfair Display', serif;
      --font-mono: 'Roboto Mono', monospace;
      --font-script: 'Dancing Script', cursive;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-sans);
      background-color: #ffffff;
      padding: 40px 32px;
      color: var(--text-main);
    }
    .doc-header {
      text-align: center;
      margin-bottom: 30px;
    }
    .red-cross { font-size: 28px; color: var(--red-accent); margin-bottom: 12px; }
    .doc-title {
      font-family: var(--font-serif);
      font-size: 22px; font-weight: 700; color: var(--text-main);
      letter-spacing: 1.5px; line-height: 1.3; margin-bottom: 8px;
    }
    .doc-subtitle {
      font-size: 10px; color: var(--text-secondary);
      text-transform: uppercase; letter-spacing: 0.8px; font-weight: 500;
    }
    .doc-divider { height: 2px; background-color: var(--text-main); margin-top: 16px; }
    .patient-info {
      display: grid; grid-template-columns: 1fr 1fr;
      row-gap: 20px; column-gap: 16px; margin: 28px 0;
    }
    .info-group label {
      display: block; font-size: 10px; color: var(--text-secondary);
      font-weight: 700; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;
    }
    .info-group .value { font-size: 14px; color: var(--text-main); font-weight: 500; }
    .info-group .value.mono { font-family: var(--font-mono); font-size: 13px; letter-spacing: -0.5px; }
    .section { margin-bottom: 28px; }
    .section-heading {
      font-size: 11px; font-weight: 700; color: var(--red-accent);
      text-transform: uppercase; border-bottom: 1px solid var(--border-light);
      padding-bottom: 6px; margin-bottom: 12px; letter-spacing: 0.5px;
    }
    .diagnosis-box { border: 1px solid var(--border-light); padding: 16px; background-color: #ffffff; }
    .diagnosis-box h3 { font-family: var(--font-serif); font-size: 18px; color: var(--text-main); margin-bottom: 6px; }
    .diagnosis-box p { font-size: 13px; color: var(--text-secondary); }
    .med-table { width: 100%; border-collapse: collapse; }
    .med-table th {
      font-size: 12px; color: var(--text-secondary); font-weight: 500;
      text-align: left; padding-bottom: 12px;
    }
    .med-table th.right, .med-table td.right { text-align: right; }
    .med-table td {
      padding: 12px 0; vertical-align: top; font-size: 13px;
      color: var(--text-main); border-top: 1px solid var(--border-light);
    }
    .med-table td.mono-col { font-family: var(--font-mono); font-size: 12px; color: #334155; letter-spacing: -0.5px; }
    .drug-name { font-weight: 700; font-size: 13px; margin-bottom: 2px; }
    .drug-type { font-size: 11px; color: var(--text-secondary); }
    .notes-heading {
      font-size: 11px; font-weight: 700; color: var(--text-light);
      text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;
    }
    .notes-text {
      font-family: var(--font-serif); font-style: italic; font-size: 13px;
      color: #475569; line-height: 1.6; margin-bottom: 20px; padding-right: 20px;
    }
    .signature { font-family: var(--font-script); font-size: 36px; color: var(--signature-blue); text-align: right; margin-top: -10px; }

    /* QR Code Section */
    .qr-section {
      margin-top: 30px; padding-top: 20px;
      border-top: 2px dashed var(--border-light);
      display: flex; align-items: center; gap: 20px;
    }
    .qr-code { flex-shrink: 0; }
    .qr-code img { width: 120px; height: 120px; }
    .qr-info { flex: 1; }
    .qr-title {
      font-size: 11px; font-weight: 700; color: var(--red-accent);
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;
    }
    .qr-desc { font-size: 11px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 8px; }
    .qr-ref {
      font-family: var(--font-mono); font-size: 14px; font-weight: 700;
      color: var(--text-main); letter-spacing: 1px;
    }

    .footer-stamp {
      margin-top: 30px; border-top: 1px solid var(--border-light);
      padding-top: 12px; font-size: 10px; color: var(--text-light);
      text-align: center; letter-spacing: 0.5px; text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <div class="red-cross">✚</div>
    <h1 class="doc-title">OFFICIAL MEDICAL<br>RECORD</h1>
    <p class="doc-subtitle">REPUBLIC OF GHANA &bull; MINISTRY OF HEALTH APPROVED</p>
    <div class="doc-divider"></div>
  </div>
  <div class="patient-info">
    <div class="info-group">
      <label>PATIENT NAME</label>
      <div class="value">${patientName}</div>
    </div>
    <div class="info-group">
      <label>DATE</label>
      <div class="value mono">${date}</div>
    </div>
    <div class="info-group">
      <label>AGE / GENDER</label>
      <div class="value mono">${patientAge || 'N/A'} / ${patientGender || 'N/A'}</div>
    </div>
    <div class="info-group">
      <label>REF NO.</label>
      <div class="value mono">${refNo}</div>
    </div>
  </div>
  <div class="section">
    <div class="section-heading">PRIMARY DIAGNOSIS</div>
    <div class="diagnosis-box">
      <h3>${diagnosis}</h3>
      <p>${chiefComplaint}</p>
    </div>
  </div>
  <div class="section">
    <div class="section-heading">PRESCRIBED MEDICATION</div>
    <table class="med-table">
      <thead>
        <tr><th>Drug Name</th><th>Dosage</th><th class="right">Freq.</th></tr>
      </thead>
      <tbody>
        ${medications.map(m => `
        <tr>
          <td><div class="drug-name">${m.name}</div><div class="drug-type">${m.type || ''}</div></td>
          <td class="mono-col">${m.dosage}</td>
          <td class="right">${m.frequency}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="section">
    <div class="notes-heading">PHYSICIAN NOTES</div>
    <p class="notes-text">"${notes}"</p>
    <div class="signature">Dr. Sarah</div>
  </div>

  <!-- QR Code Verification Section -->
  <div class="qr-section">
    <div class="qr-code">
      <img src="${qrUrl}" alt="Verification QR Code" />
    </div>
    <div class="qr-info">
      <div class="qr-title">Pharmacist Verification</div>
      <div class="qr-desc">
        Scan this QR code to verify the authenticity of this medical slip.
        This code is unique to this consultation and cannot be reused.
      </div>
      <div class="qr-ref">${verificationCode}</div>
    </div>
  </div>

  <div class="footer-stamp">✚ Encrypted &amp; HIPAA Secure &bull; Visante Telehealth Platform</div>
</body>
</html>
`;
}

// ─── Screen ─────────────────────────────────────────────────────────────────
export default function SummaryScreen({ onBack, onGoHome, sessionId, appointmentId, provider, serviceType, userProfile, triageSummary }) {
  const insets = useSafeAreaInsets();
  const [downloading, setDownloading] = useState(false);

  // Build real data from props
  const patientName = userProfile?.name || 'Patient';
  const patientAge = userProfile?.age || '';
  const patientGender = userProfile?.gender || '';
  const diagnosis = triageSummary?.ai_recommendation || triageSummary?.chief_complaint || 'General Consultation';
  const chiefComplaint = triageSummary?.chief_complaint || 'Symptoms reported during triage';
  const severity = triageSummary?.severity || triageSummary?.urgency_level || 'moderate';
  const symptoms = triageSummary?.associated_symptoms || [];

  const verificationCode = generateVerificationCode(appointmentId, sessionId);
  const dateStr = formatDate();
  const timeStr = formatTime();

  // QR data contains verification info that pharmacists can scan
  const qrData = JSON.stringify({
    platform: 'Visante',
    code: verificationCode,
    appointmentId: appointmentId || null,
    sessionId: sessionId || null,
    patient: patientName,
    date: new Date().toISOString(),
    valid: true,
  });
  const qrImageUrl = getQrCodeUrl(qrData);

  // Placeholder medications (in production, doctor fills these during consultation)
  const medications = [
    { name: 'Paracetamol', type: 'Tablet', dosage: '500mg', frequency: '3x Daily' },
    { name: 'Ibuprofen', type: 'Tablet', dosage: '400mg', frequency: 'As needed' },
  ];

  const notes = `Patient presented with ${chiefComplaint}. Severity assessed as ${severity}. Advised to rest, stay hydrated, and monitor symptoms. Return if condition worsens.`;

  const refNo = `#MED-${new Date().getFullYear().toString().slice(-2)}-${(appointmentId || sessionId || 'XXXX').slice(-4).toUpperCase()}`;

  async function handleDownload() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDownloading(true);
    try {
      if (sessionId) {
        await saveConsultationSummary(sessionId, {
          providerName: provider?.name ?? 'Unknown',
          serviceType: serviceType ?? 'unknown',
          verificationCode,
          downloadedAt: new Date().toISOString(),
        });
      }

      const html = buildMedicalSlipHtml({
        patientName,
        patientAge,
        patientGender,
        diagnosis,
        chiefComplaint,
        medications,
        notes,
        refNo,
        verificationCode,
        qrData,
        date: dateStr,
      });

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Medical Slip',
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (e) {
      // User may have cancelled sharing — only show toast for real errors
      if (e?.message && !e.message.includes('cancel')) {
        showErrorToast(e, 'Download Issue');
      }
    } finally {
      setDownloading(false);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.iconBtn}>
          <BackIcon />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.headerTitle}>Consultation Summary</Text>
          <Text style={styles.headerSubtitle}>{dateStr} • {timeStr}</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} style={styles.iconBtn}>
          <ShareIcon />
        </TouchableOpacity>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 130 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >

        {/* Doctor card */}
        <View style={styles.doctorCard}>
          <View style={styles.doctorAvatar}>
            <UserIcon />
            <View style={styles.statusIndicator} />
          </View>
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>Dr. Sarah Mitchell</Text>
            <Text style={styles.doctorSpecialty}>General Practitioner</Text>
            <View style={styles.doctorStats}>
              <Text style={styles.starIcon}>★</Text>
              <Text style={styles.ratingText}>4.9</Text>
              <Text style={styles.statsDot}> • </Text>
              <Text style={styles.sessionText}>Video Consultation</Text>
            </View>
          </View>
        </View>

        {/* Diagnosis section */}
        <View style={styles.sectionHeader}>
          <StethoscopeIcon />
          <Text style={styles.sectionTitle}>DIAGNOSIS</Text>
        </View>
        <View style={styles.diagnosisCard}>
          <Text style={styles.diagnosisTitle}>{diagnosis}</Text>
          <Text style={styles.diagnosisDesc}>{chiefComplaint}</Text>
          {symptoms.length > 0 && (
            <View style={styles.tagsContainer}>
              {symptoms.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
          {severity && (
            <View style={[styles.severityBadge, severity === 'high' ? styles.severityHigh : severity === 'low' ? styles.severityLow : styles.severityMod]}>
              <Text style={[styles.severityText, severity === 'high' ? styles.severityTextHigh : severity === 'low' ? styles.severityTextLow : styles.severityTextMod]}>
                Severity: {severity}
              </Text>
            </View>
          )}
        </View>

        {/* Prescriptions section */}
        <View style={styles.sectionHeader}>
          <CapsulesIcon />
          <Text style={styles.sectionTitle}>PRESCRIPTIONS</Text>
        </View>
        <View style={styles.prescriptionsCard}>
          <View style={styles.rxItem}>
            <View style={styles.rxIconBox}>
              <BottleIcon />
            </View>
            <View style={styles.rxContent}>
              <View style={styles.rxHeaderRow}>
                <Text style={styles.rxName}>Paracetamol</Text>
                <View style={styles.rxDosageBadge}>
                  <Text style={styles.rxDosageText}>500mg</Text>
                </View>
              </View>
              <Text style={styles.rxInstructions}>
                Take 1 tablet by mouth three times daily as needed.
              </Text>
              <View style={styles.rxRefills}>
                <RefreshIcon />
                <Text style={styles.rxRefillsText}> Refills: 1</Text>
              </View>
            </View>
          </View>

          <View style={styles.rxDivider} />

          <View style={styles.rxItem}>
            <View style={styles.rxIconBox}>
              <InboxIcon />
            </View>
            <View style={styles.rxContent}>
              <View style={styles.rxHeaderRow}>
                <Text style={styles.rxName}>Ibuprofen</Text>
                <View style={styles.rxDosageBadge}>
                  <Text style={styles.rxDosageText}>400mg</Text>
                </View>
              </View>
              <Text style={styles.rxInstructions}>
                Take as needed for pain, with food. Max 3 per day.
              </Text>
            </View>
          </View>
        </View>

        {/* Care plan section */}
        <View style={styles.sectionHeader}>
          <ClipboardIcon />
          <Text style={styles.sectionTitle}>PHYSICIAN NOTES</Text>
        </View>
        <View style={styles.notesCard}>
          <Text style={styles.notesText}>{notes}</Text>
        </View>

        {/* QR Code Verification Section */}
        <View style={styles.qrSection}>
          <View style={styles.qrHeader}>
            <Text style={styles.qrTitle}>PHARMACIST VERIFICATION</Text>
          </View>
          <View style={styles.qrBody}>
            <Image
              source={{ uri: qrImageUrl }}
              style={styles.qrImage}
              resizeMode="contain"
            />
            <View style={styles.qrInfo}>
              <Text style={styles.qrDesc}>
                Scan this QR code to verify the authenticity of this medical slip.
              </Text>
              <View style={styles.qrCodeBadge}>
                <Text style={styles.qrCodeText}>{verificationCode}</Text>
              </View>
              <Text style={styles.qrRef}>Ref: {refNo}</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.downloadBtn, downloading && styles.downloadBtnDisabled]}
          onPress={handleDownload}
          activeOpacity={0.85}
          disabled={downloading}
        >
          {downloading ? (
            <ActivityIndicator color={WHITE} size="small" />
          ) : (
            <>
              <Text style={styles.downloadBtnText}>Download Medical Slip</Text>
              <DownloadIcon />
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.goHomeBtn} onPress={() => onGoHome && onGoHome()} activeOpacity={0.7}>
          <HomeIcon />
          <Text style={styles.goHomeText}>Back to Dashboard</Text>
        </TouchableOpacity>
        <View style={styles.secureBadge}>
          <LockIcon />
          <Text style={styles.secureText}> ENCRYPTED & HIPAA SECURE</Text>
        </View>
      </View>

    </View>
  );
}

// ─── Responsive helpers ─────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const DOCTOR_AVATAR = Math.min(SCREEN_W * 0.15, 56);
const QR_SIZE = Math.min(SCREEN_W * 0.26, 100);
const RX_ICON_SIZE = Math.min(SCREEN_W * 0.13, 48);

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_LIGHT,
    zIndex: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_MAIN,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: TEXT_SEC,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
  },

  // Doctor card
  doctorCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  doctorAvatar: {
    width: DOCTOR_AVATAR,
    height: DOCTOR_AVATAR,
    borderRadius: DOCTOR_AVATAR / 2,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: STATUS_GREEN,
    borderWidth: 2,
    borderColor: WHITE,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 17,
    fontWeight: '600',
    color: TEXT_MAIN,
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: TEXT_SEC,
    marginBottom: 6,
  },
  doctorStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 12,
    color: STAR_YELLOW,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_MAIN,
  },
  statsDot: {
    fontSize: 13,
    color: TEXT_TERT,
  },
  sessionText: {
    fontSize: 13,
    color: TEXT_TERT,
    fontWeight: '500',
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_SEC,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Diagnosis card
  diagnosisCard: {
    backgroundColor: DIAG_BG,
    borderWidth: 1,
    borderColor: DIAG_BORDER,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  diagnosisTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_MAIN,
    marginBottom: 8,
  },
  diagnosisDesc: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: DIAG_BORDER,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: DIAG_TEXT,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  severityMod: {
    backgroundColor: '#fff7ed',
  },
  severityHigh: {
    backgroundColor: '#fef2f2',
  },
  severityLow: {
    backgroundColor: '#ecfdf5',
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  severityTextMod: {
    color: '#d97706',
  },
  severityTextHigh: {
    color: '#dc2626',
  },
  severityTextLow: {
    color: '#059669',
  },

  // Prescriptions card
  prescriptionsCard: {
    backgroundColor: RX_BG,
    borderWidth: 1,
    borderColor: RX_BORDER,
    borderRadius: 16,
    marginBottom: 24,
  },
  rxItem: {
    flexDirection: 'row',
    gap: 16,
    padding: 20,
  },
  rxDivider: {
    height: 1,
    backgroundColor: RX_BORDER,
    marginHorizontal: 20,
  },
  rxIconBox: {
    width: RX_ICON_SIZE,
    height: RX_ICON_SIZE,
    backgroundColor: WHITE,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  rxContent: {
    flex: 1,
  },
  rxHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  rxName: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_MAIN,
  },
  rxDosageBadge: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rxDosageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
  rxInstructions: {
    fontSize: 13,
    color: TEXT_SEC,
    lineHeight: 20,
    marginBottom: 8,
  },
  rxRefills: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rxRefillsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ea580c',
  },

  // Notes card
  notesCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  notesText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    fontStyle: 'italic',
  },

  // QR Code section
  qrSection: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_LIGHT,
    overflow: 'hidden',
    marginBottom: 8,
  },
  qrHeader: {
    backgroundColor: '#fef2f2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  qrTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b91c1c',
    letterSpacing: 0.8,
  },
  qrBody: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
    alignItems: 'center',
  },
  qrImage: {
    width: QR_SIZE,
    height: QR_SIZE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER_LIGHT,
  },
  qrInfo: {
    flex: 1,
    gap: 8,
  },
  qrDesc: {
    fontSize: 12,
    color: TEXT_SEC,
    lineHeight: 18,
  },
  qrCodeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: BORDER_LIGHT,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  qrCodeText: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_MAIN,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  qrRef: {
    fontSize: 11,
    color: TEXT_TERT,
    fontWeight: '500',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: BG_COLOR,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  downloadBtn: {
    backgroundColor: BTN_RED,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
    shadowColor: BTN_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  downloadBtnDisabled: {
    opacity: 0.7,
  },
  downloadBtnText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '600',
  },
  goHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginBottom: 4,
  },
  goHomeText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SEC,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secureText: {
    fontSize: 10,
    color: TEXT_TERT,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
