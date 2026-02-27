// ─── Firestore helper functions ───────────────────────────────────────────────
// All Firestore reads/writes live here so screens stay lean.

import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    setDoc,
    updateDoc,
    onSnapshot,
    serverTimestamp,
    query,
    orderBy,
    limit,
    where,
} from 'firebase/firestore';
import { db } from './firebase';

// ─────────────────────────────────────────────────────────────────────────────
// USER PROFILES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save or update a user profile, keyed by phone number.
 */
export async function saveUserProfile({ phoneNumber, name, age, gender }) {
    await setDoc(doc(db, 'users', phoneNumber), {
        phoneNumber,
        name,
        age,
        gender,
        updatedAt: serverTimestamp(),
    }, { merge: true });
}

/**
 * Fetch a user profile by phone number. Returns null if not found.
 */
export async function fetchUserProfile(phoneNumber) {
    const snap = await getDoc(doc(db, 'users', phoneNumber));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

/**
 * Update the latest vitals on a user's profile.
 * Called after vitals are recorded (pharmacy or nurse flow).
 */
export async function updateUserVitals(phoneNumber, vitals) {
    if (!phoneNumber) return;
    await updateDoc(doc(db, 'users', phoneNumber), {
        latestVitals: vitals,
        vitalsUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save a completed triage session to Firestore.
 * Returns the new document's ID.
 */
export async function saveTriageSession(triageSummary, { phoneNumber, userName } = {}) {
    const ref = await addDoc(collection(db, 'sessions'), {
        ...triageSummary,
        phoneNumber: phoneNumber ?? null,
        userName: userName ?? null,
        serviceType: null,      // set later when user picks pharmacy / nurse
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return ref.id;
}

/**
 * Update the serviceType on an existing session doc.
 * serviceType: 'pharmacy' | 'nurse'
 */
export async function setSessionServiceType(sessionId, serviceType) {
    await updateDoc(doc(db, 'sessions', sessionId), {
        serviceType,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Subscribe to real-time session status updates.
 * Returns an unsubscribe function.
 */
export function subscribeToSession(sessionId, callback) {
    return onSnapshot(doc(db, 'sessions', sessionId), (snap) => {
        if (snap.exists()) callback({ id: snap.id, ...snap.data() });
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// PHARMACIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all pharmacies from Firestore.
 * In a production app you would geo-query by lat/lng; here we return all and
 * let the UI sort by distance if coordinates are provided.
 */
export async function fetchPharmacies() {
    const snap = await getDocs(collection(db, 'pharmacies'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─────────────────────────────────────────────────────────────────────────────
// NURSES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch available nurses (status === 'available'), ordered by rating desc.
 */
export async function fetchNurses() {
    const q = query(
        collection(db, 'nurses'),
        where('status', '==', 'available'),
        orderBy('rating', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create an appointment document.
 * For nurse bookings, status starts as 'searching' (Uber-like matching).
 * For pharmacy, status starts as 'confirmed'.
 * Status flow (nurse): searching → nurse_accepted → vitals_in_progress → vitals_complete → consultation_ready → completed
 * Status flow (pharmacy): confirmed → vitals_in_progress → vitals_complete → consultation_ready → completed
 * Returns the new appointment ID.
 */
export async function createAppointment({ sessionId, providerType, providerId, providerName, date, time, amount, phoneNumber }) {
    const initialStatus = providerType === 'nurse' ? 'searching' : 'confirmed';
    const ref = await addDoc(collection(db, 'appointments'), {
        sessionId,
        providerType,   // 'nurse' | 'pharmacy'
        providerId,
        providerName,
        phoneNumber: phoneNumber ?? null,
        date,
        time,
        amount,
        vitals: null,
        paymentStatus: 'pending',
        status: initialStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return ref.id;
}

/**
 * Update vitals on an appointment (called by nurse/pharmacy provider side).
 * Also updates the user profile with latest vitals if phoneNumber is available.
 */
export async function updateAppointmentVitals(appointmentId, vitals) {
    await updateDoc(doc(db, 'appointments', appointmentId), {
        vitals,
        status: 'vitals_complete',
        updatedAt: serverTimestamp(),
    });
    // Also update user profile vitals
    try {
        const apptSnap = await getDoc(doc(db, 'appointments', appointmentId));
        if (apptSnap.exists()) {
            const phone = apptSnap.data().phoneNumber;
            if (phone) {
                await updateUserVitals(phone, vitals);
            }
        }
    } catch (e) {
        console.warn('Could not update user vitals:', e);
    }
}

/**
 * Subscribe to real-time appointment status.
 * Returns an unsubscribe function.
 */
export function subscribeToAppointment(appointmentId, callback) {
    return onSnapshot(doc(db, 'appointments', appointmentId), (snap) => {
        if (snap.exists()) callback({ id: snap.id, ...snap.data() });
    });
}

/**
 * Mark an appointment's payment as paid.
 */
export async function markAppointmentPaid(appointmentId) {
    await updateDoc(doc(db, 'appointments', appointmentId), {
        paymentStatus: 'paid',
        updatedAt: serverTimestamp(),
    });
}

/**
 * Fetch the most-recent appointment for display on Dashboard.
 */
export async function fetchLatestAppointment() {
    const q = query(
        collection(db, 'appointments'),
        orderBy('createdAt', 'desc'),
        limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
}

/**
 * Fetch active (non-completed/cancelled) appointments for a phone number.
 * Used by Dashboard to show pending bookings.
 */
export async function fetchActiveBookings(phoneNumber) {
    const q = query(
        collection(db, 'appointments'),
        where('phoneNumber', '==', phoneNumber),
        orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    // Filter client-side since Firestore doesn't support NOT IN on status easily
    const active = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((a) => !['completed', 'cancelled'].includes(a.status));
    return active;
}

/**
 * Subscribe to active bookings for a phone number (real-time).
 * Returns an unsubscribe function.
 */
export function subscribeToActiveBookings(phoneNumber, callback) {
    const q = query(
        collection(db, 'appointments'),
        where('phoneNumber', '==', phoneNumber),
        orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snap) => {
        const active = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((a) => !['completed', 'cancelled'].includes(a.status));
        callback(active);
    });
}

/**
 * Fetch all past appointments (paid/completed) ordered by most-recent first.
 */
export async function fetchPastAppointments() {
    const q = query(
        collection(db, 'appointments'),
        orderBy('createdAt', 'desc'),
        limit(10),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY / CONSULTATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save the final consultation summary back to the session document.
 */
export async function saveConsultationSummary(sessionId, summaryData) {
    await updateDoc(doc(db, 'sessions', sessionId), {
        consultationSummary: summaryData,
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED HELPERS  (run once from a dev script or Firestore console)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Seed sample pharmacies — call this ONCE from a dev/admin context.
 */
export async function seedPharmacies() {
    const samples = [
        {
            name: 'HealthPlus Pharmacy',
            address: 'No 14, Ring Road Central, Accra',
            phone: '+233 30 222 1234',
            operating_hours: '8:00 AM – 10:00 PM',
            lat: 5.5598,
            lng: -0.1939,
            rating: 4.7,
        },
        {
            name: 'Melcom Health Centre Pharmacy',
            address: 'Spintex Road, Accra',
            phone: '+233 30 278 5678',
            operating_hours: '7:00 AM – 9:00 PM',
            lat: 5.6037,
            lng: -0.1485,
            rating: 4.5,
        },
        {
            name: 'Ernest Chemists',
            address: 'Osu, Oxford Street, Accra',
            phone: '+233 30 277 9012',
            operating_hours: '8:00 AM – 8:00 PM',
            lat: 5.5686,
            lng: -0.1739,
            rating: 4.6,
        },
    ];
    for (const p of samples) {
        await addDoc(collection(db, 'pharmacies'), p);
    }
    console.log('Pharmacies seeded ✓');
}

/**
 * Seed sample nurses — call this ONCE from a dev/admin context.
 */
export async function seedNurses() {
    const samples = [
        {
            name: 'Sister Abena Osei',
            rating: 4.9,
            experience: '8 yrs',
            rate: 60,
            status: 'available',
            specialty: 'Home Care Nurse',
            avatarUrl: 'https://images.unsplash.com/photo-1536064479547-7ee40b74b807?auto=format&fit=crop&q=80&w=150&h=150',
        },
        {
            name: 'Nurse Kweku Mensah',
            rating: 4.7,
            experience: '5 yrs',
            rate: 65,
            status: 'available',
            specialty: 'Community Health Nurse',
            avatarUrl: 'https://images.unsplash.com/photo-1622253694242-abeb37a33e97?auto=format&fit=crop&q=80&w=150&h=150',
        },
        {
            name: 'Nurse Yaw Boateng',
            rating: 4.8,
            experience: '10 yrs',
            rate: 80,
            status: 'available',
            specialty: 'Senior Home Care Nurse',
            avatarUrl: 'https://images.unsplash.com/photo-1612531386530-97286d97c2d2?auto=format&fit=crop&q=80&w=150&h=150',
        },
    ];
    for (const n of samples) {
        await addDoc(collection(db, 'nurses'), n);
    }
    console.log('Nurses seeded ✓');
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDICAL RECORDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch medical records for a given phone number.
 */
export async function fetchMedicalRecords(phoneNumber) {
    const q = query(
        collection(db, 'medical_records'),
        where('phoneNumber', '==', phoneNumber),
        orderBy('date', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Seed 3 dummy medical records linked to 0552354808.
 * Call this ONCE from a dev/admin context.
 */
export async function seedMedicalRecords() {
    const PHONE = '0552354808';
    const records = [
        {
            phoneNumber: PHONE,
            patientName: 'Kofi Mensah',
            date: '2025-12-10',
            type: 'Pharmacy Vitals Check',
            provider: 'HealthPlus Pharmacy',
            chief_complaint: 'Persistent headaches and dizziness',
            diagnosis: 'Mild hypertension (Stage 1)',
            vitals: {
                blood_pressure: '142/90',
                heart_rate: '82 bpm',
                temperature: '36.8°C',
                spo2: '97%',
                weight: '78 kg',
            },
            prescription: [
                { name: 'Amlodipine 5mg', dosage: '1 tablet daily', duration: '30 days' },
                { name: 'Paracetamol 500mg', dosage: '2 tablets as needed', duration: '7 days' },
            ],
            notes: 'Patient advised to reduce salt intake and monitor blood pressure weekly. Follow-up in 4 weeks.',
            status: 'completed',
        },
        {
            phoneNumber: PHONE,
            patientName: 'Kofi Mensah',
            date: '2025-11-22',
            type: 'Nurse Home Visit',
            provider: 'Sister Abena Osei',
            chief_complaint: 'Fever, body aches, and fatigue for 3 days',
            diagnosis: 'Malaria (Plasmodium falciparum — positive RDT)',
            vitals: {
                blood_pressure: '118/76',
                heart_rate: '96 bpm',
                temperature: '38.9°C',
                spo2: '96%',
                weight: '78 kg',
            },
            prescription: [
                { name: 'Artemether-Lumefantrine (Coartem)', dosage: '4 tablets twice daily', duration: '3 days' },
                { name: 'Paracetamol 1g', dosage: 'Every 8 hours', duration: '3 days' },
                { name: 'ORS sachets', dosage: '1 litre daily', duration: '3 days' },
            ],
            notes: 'Malaria RDT positive. Patient was dehydrated. IV fluids administered on site. Rest and hydration advised.',
            status: 'completed',
        },
        {
            phoneNumber: PHONE,
            patientName: 'Kofi Mensah',
            date: '2025-10-05',
            type: 'Pharmacy Vitals Check',
            provider: 'Ernest Chemists',
            chief_complaint: 'Routine check-up, no active complaints',
            diagnosis: 'Normal vitals — no abnormalities detected',
            vitals: {
                blood_pressure: '120/78',
                heart_rate: '74 bpm',
                temperature: '36.5°C',
                spo2: '98%',
                weight: '77 kg',
            },
            prescription: [],
            notes: 'Routine wellness check. All vitals within normal range. Patient in good health. Advised to continue healthy lifestyle.',
            status: 'completed',
        },
    ];

    for (const rec of records) {
        await addDoc(collection(db, 'medical_records'), rec);
    }
    console.log('Medical records seeded ✓ (3 records for 0552354808)');
}
