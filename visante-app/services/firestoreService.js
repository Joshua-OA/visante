// ─── Firestore helper functions ───────────────────────────────────────────────
// All Firestore reads/writes live here so screens stay lean.

import {
    collection,
    addDoc,
    getDocs,
    doc,
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
// SESSIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save a completed triage session to Firestore.
 * Returns the new document's ID.
 */
export async function saveTriageSession(triageSummary) {
    const ref = await addDoc(collection(db, 'sessions'), {
        ...triageSummary,
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
 * Returns the new appointment ID.
 */
export async function createAppointment({ sessionId, providerType, providerId, providerName, date, time, amount }) {
    const ref = await addDoc(collection(db, 'appointments'), {
        sessionId,
        providerType,   // 'nurse' | 'pharmacy'
        providerId,
        providerName,
        date,
        time,
        amount,
        paymentStatus: 'pending',
        status: 'confirmed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return ref.id;
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
            avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150&h=150',
        },
        {
            name: 'Nurse Kweku Mensah',
            rating: 4.7,
            experience: '5 yrs',
            rate: 65,
            status: 'available',
            specialty: 'Community Health Nurse',
            avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=150&h=150',
        },
        {
            name: 'Sister Adwoa Boateng',
            rating: 4.8,
            experience: '10 yrs',
            rate: 80,
            status: 'available',
            specialty: 'Senior Home Care Nurse',
            avatarUrl: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=150&h=150',
        },
    ];
    for (const n of samples) {
        await addDoc(collection(db, 'nurses'), n);
    }
    console.log('Nurses seeded ✓');
}
