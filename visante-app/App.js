import { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showErrorToast } from './utils/toast';

import HomeScreen from './screens/HomeScreen';
import ResultsScreen from './screens/ResultsScreen';
import PhoneVerifyScreen from './screens/PhoneVerifyScreen';
import PaymentScreen from './screens/PaymentScreen';
import NurseMatchingScreen from './screens/NurseMatchingScreen';
import PharmacyCodeScreen from './screens/PharmacyCodeScreen';
import WaitingScreen from './screens/WaitingScreen';
import VideoScreen from './screens/VideoScreen';
import ChatScreen from './screens/ChatScreen';
import SummaryScreen from './screens/SummaryScreen';
import DashboardScreen from './screens/DashboardScreen';

import {
  saveTriageSession,
  setSessionServiceType,
  createAppointment,
  fetchUserProfile,
  saveUserProfile,
} from './services/firestoreService';

const PHONE_STORAGE_KEY = '@visante_phone';
const PROFILE_STORAGE_KEY = '@visante_profile';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [screen, setScreen] = useState('loading'); // start with loading while we check storage
  const [phoneNumber, setPhoneNumber] = useState('');
  const [triageSummary, setTriageSummary] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  // Pending profile collected during triage (before phone is verified)
  const pendingProfileRef = useRef(null);

  // ── Firestore state ──
  const [sessionId, setSessionId] = useState(null);
  const [appointmentId, setAppointmentId] = useState(null);
  const [selectedService, setSelectedService] = useState(null); // 'pharmacy' | 'nurse'
  const [selectedProvider, setSelectedProvider] = useState(null); // pharmacy or nurse doc
  const [serviceAmount, setServiceAmount] = useState(0);

  // ── On launch: load persisted phone/profile, route accordingly ──
  useEffect(() => {
    async function bootstrap() {
      console.log('[App] bootstrap: starting...');
      try {
        const [savedPhone, savedProfileJson] = await Promise.all([
          AsyncStorage.getItem(PHONE_STORAGE_KEY),
          AsyncStorage.getItem(PROFILE_STORAGE_KEY),
        ]);
        console.log('[App] bootstrap: savedPhone =', savedPhone ?? '(null)');
        console.log('[App] bootstrap: savedProfile =', savedProfileJson ? 'found' : '(null)');

        if (savedPhone) {
          setPhoneNumber(savedPhone);
          console.log('[App] bootstrap: fetching Firestore profile for', savedPhone);
          const profile = await fetchUserProfile(savedPhone);
          console.log('[App] bootstrap: Firestore profile =', profile ? JSON.stringify(profile) : '(null)');
          if (profile) {
            setUserProfile(profile);
            console.log('[App] bootstrap: → dashboard (phone + Firestore profile)');
            setScreen('dashboard');
          } else if (savedProfileJson) {
            const localProfile = JSON.parse(savedProfileJson);
            setUserProfile(localProfile);
            console.log('[App] bootstrap: → dashboard (phone + local profile)', JSON.stringify(localProfile));
            setScreen('dashboard');
          } else {
            console.log('[App] bootstrap: → home (phone found but no profile)');
            setScreen('home');
          }
        } else if (savedProfileJson) {
          const localProfile = JSON.parse(savedProfileJson);
          setUserProfile(localProfile);
          console.log('[App] bootstrap: → dashboard (local profile only, no phone)', JSON.stringify(localProfile));
          setScreen('dashboard');
        } else {
          console.log('[App] bootstrap: → home (no phone, no profile — fresh user)');
          setScreen('home');
        }
      } catch (e) {
        console.warn('[App] bootstrap: ERROR:', e);
        setScreen('home');
      } finally {
        SplashScreen.hideAsync();
      }
    }
    bootstrap();
  }, []);

  // Load/refresh user profile when phone number changes (e.g. after verification)
  useEffect(() => {
    if (!phoneNumber) return;
    async function loadProfile() {
      console.log('[App] loadProfile: phone changed to', phoneNumber, '— fetching Firestore profile...');
      try {
        const profile = await fetchUserProfile(phoneNumber);
        console.log('[App] loadProfile: result =', profile ? JSON.stringify(profile) : '(null)');
        if (profile) setUserProfile(profile);
      } catch (e) {
        console.warn('[App] loadProfile: ERROR:', e);
        showErrorToast(e, 'Could Not Load Profile');
      }
    }
    loadProfile();
  }, [phoneNumber]);

  // ── Global quit: return to dashboard from anywhere ──
  function handleQuit() {
    console.log('[App] handleQuit: returning to dashboard');
    setScreen('dashboard');
  }

  // ── Save triage to Firestore when results are shown ──
  async function handleTriageComplete(summary) {
    console.log('[App] handleTriageComplete: summary =', JSON.stringify(summary));
    console.log('[App] handleTriageComplete: phoneNumber =', phoneNumber || '(empty)', '| userName =', userProfile?.name || '(null)');
    setTriageSummary(summary);
    setScreen('results');
    try {
      const id = await saveTriageSession(summary, {
        phoneNumber: phoneNumber || null,
        userName: userProfile?.name || null,
      });
      setSessionId(id);
      console.log('[App] handleTriageComplete: session saved → sessionId =', id);
    } catch (e) {
      console.warn('[App] handleTriageComplete: ERROR saving session:', e);
      showErrorToast(e, 'Could Not Save Session');
    }
  }

  // ── Pharmacy selected — show code screen (give code to MCA) ──
  // Pharmacy flow: Triage → Results → PharmacyCode (wait for vitals) → Summary
  // No video/waiting room — user physically goes to the pharmacy
  async function handleSelectPharmacy(pharmacy) {
    console.log('[App] handleSelectPharmacy:', pharmacy?.name, '| sessionId =', sessionId);
    setSelectedService('pharmacy');
    setSelectedProvider(pharmacy);
    setServiceAmount(0); // free
    try {
      if (sessionId) await setSessionServiceType(sessionId, 'pharmacy');
      console.log('[App] handleSelectPharmacy: session service type updated');
    } catch (e) {
      console.warn('[App] handleSelectPharmacy: ERROR updating session:', e);
      showErrorToast(e, 'Could Not Update Session');
    }
    // Create appointment so Firestore can track it
    try {
      const id = await createAppointment({
        sessionId,
        providerType: 'pharmacy',
        providerId: pharmacy?.id ?? null,
        providerName: pharmacy?.name ?? 'Unknown',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        amount: 0,
        phoneNumber: phoneNumber || null,
      });
      setAppointmentId(id);
      console.log('[App] handleSelectPharmacy: appointment created → id =', id);
    } catch (e) {
      console.warn('[App] handleSelectPharmacy: ERROR creating appointment:', e);
      showErrorToast(e, 'Could Not Create Appointment');
    }
    setScreen('pharmacyCode');
  }

  // ── Nurse selected — instant booking (like Uber), go straight to matching ──
  // Nurse flow: Triage → Results → NurseMatching → PhoneVerify → Payment → Summary
  // No video/waiting room — nurse comes to you physically
  async function handleSelectNurse(nurse) {
    console.log('[App] handleSelectNurse:', nurse?.name, '| rate =', nurse?.rate, '| sessionId =', sessionId);
    setSelectedService('nurse');
    setSelectedProvider(nurse);
    setServiceAmount(nurse.rate ?? 60);
    try {
      if (sessionId) await setSessionServiceType(sessionId, 'nurse');
      console.log('[App] handleSelectNurse: session service type updated');
    } catch (e) {
      console.warn('[App] handleSelectNurse: ERROR updating session:', e);
      showErrorToast(e, 'Could Not Update Session');
    }
    // Create appointment immediately (instant booking)
    try {
      const id = await createAppointment({
        sessionId,
        providerType: 'nurse',
        providerId: nurse?.id ?? null,
        providerName: nurse?.name ?? 'Unknown',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        amount: nurse.rate ?? 60,
        phoneNumber: phoneNumber || null,
      });
      setAppointmentId(id);
      console.log('[App] handleSelectNurse: appointment created → id =', id);
    } catch (e) {
      console.warn('[App] handleSelectNurse: ERROR creating appointment:', e);
      showErrorToast(e, 'Could Not Create Appointment');
    }
    setScreen('nurseMatching');
  }

  // ── After nurse vitals complete, proceed to phone verify → payment → summary ──
  function handleNurseVitalsComplete() {
    console.log('[App] handleNurseVitalsComplete: → phoneVerify');
    setScreen('phoneVerify');
  }

  // ── After payment, go straight to summary (no video for nurse flow) ──
  function handlePaymentComplete() {
    console.log('[App] handlePaymentComplete: → summary');
    setScreen('summary');
  }

  // ── Pharmacy vitals complete → go to waiting room for doctor video ──
  function handlePharmacyVitalsComplete() {
    console.log('[App] handlePharmacyVitalsComplete: → waiting (for doctor consultation)');
    setScreen('waiting');
  }

  // ── View last appointment from dashboard — navigate back to its last step ──
  function handleViewLastAppointment(appointment) {
    console.log('[App] handleViewLastAppointment:', JSON.stringify({ id: appointment.id, providerType: appointment.providerType, status: appointment.status }));
    setScreen('results');
  }

  // ── Profile icon tapped ──
  function handleViewProfile() {
    console.log('[App] handleViewProfile: showing profile info');
    setScreen('home');
  }

  // ── View active booking from dashboard ──
  function handleViewActiveBooking(booking) {
    console.log('[App] handleViewActiveBooking:', JSON.stringify({ id: booking.id, status: booking.status, providerType: booking.providerType, providerName: booking.providerName }));
    setAppointmentId(booking.id);
    setSelectedService(booking.providerType);
    setSelectedProvider({
      id: booking.providerId,
      name: booking.providerName,
    });
    const isVitalsReady = booking.status === 'vitals_complete' || booking.status === 'consultation_ready';
    if (isVitalsReady) {
      // Only pharmacy flow goes through waiting room for doctor
      if (booking.providerType === 'pharmacy') {
        console.log('[App] handleViewActiveBooking: → waiting (vitals ready, pharmacy flow)');
        setScreen('waiting');
      } else {
        // Nurse flow goes straight to summary after vitals
        console.log('[App] handleViewActiveBooking: → summary (vitals ready, nurse flow)');
        setScreen('summary');
      }
    } else if (booking.providerType === 'pharmacy') {
      console.log('[App] handleViewActiveBooking: → pharmacyCode');
      setScreen('pharmacyCode');
    } else {
      console.log('[App] handleViewActiveBooking: → nurseMatching');
      setScreen('nurseMatching');
    }
  }

  // While loading, show nothing (splash screen is still visible)
  if (screen === 'loading') return null;

  return (
    <SafeAreaProvider>
      {/* ── Returning-user dashboard ── */}
      {screen === 'dashboard' && (
        <DashboardScreen
          onStartTriage={() => setScreen('home')}
          onViewActiveBooking={handleViewActiveBooking}
          onViewLastAppointment={handleViewLastAppointment}
          onViewProfile={handleViewProfile}
          userProfile={userProfile}
          phoneNumber={phoneNumber}
        />
      )}

      {/* ── AI triage ── */}
      {screen === 'home' && (
        <HomeScreen
          onSubmit={handleTriageComplete}
          onClose={(userProfile || triageSummary) ? () => setScreen('dashboard') : null}
          userProfile={userProfile}
          phoneNumber={phoneNumber}
          onProfileCollected={async (profile) => {
            console.log('[App] onProfileCollected:', JSON.stringify(profile));
            console.log('[App] onProfileCollected: phoneNumber =', phoneNumber || '(empty)');
            if (!phoneNumber) {
              pendingProfileRef.current = profile;
              console.log('[App] onProfileCollected: stashed in pendingProfileRef (no phone yet)');
            }
            setUserProfile(profile);
            try {
              await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
              console.log('[App] onProfileCollected: saved to AsyncStorage');
            } catch (e) {
              console.warn('[App] onProfileCollected: ERROR persisting:', e);
            }
          }}
        />
      )}

      {/* ── AI results + service selection (pharmacy / nurse) ── */}
      {screen === 'results' && (
        <ResultsScreen
          triageSummary={triageSummary}
          onBack={() => setScreen('home')}
          onQuit={handleQuit}
          onSelectPharmacy={handleSelectPharmacy}
          onSelectNurse={handleSelectNurse}
        />
      )}

      {/* ── Pharmacy code screen (give code to MCA) ── */}
      {/* After vitals, pharmacy flow goes to waiting room for doctor video */}
      {screen === 'pharmacyCode' && (
        <PharmacyCodeScreen
          onBack={() => setScreen('results')}
          onGoToDashboard={handleQuit}
          onVitalsComplete={handlePharmacyVitalsComplete}
          pharmacy={selectedProvider}
          appointmentId={appointmentId}
        />
      )}

      {/* ── Nurse matching (Uber-like: on her way → arrived → vitals) ── */}
      {/* After vitals complete, nurse flow goes to phone verify → payment → summary */}
      {screen === 'nurseMatching' && (
        <NurseMatchingScreen
          onBack={() => setScreen('results')}
          onCancel={handleQuit}
          onGoToDashboard={handleQuit}
          onConsultDoctor={handleNurseVitalsComplete}
          appointmentId={appointmentId}
          provider={selectedProvider}
        />
      )}

      {/* ── Phone auto-detection & verification ── */}
      {screen === 'phoneVerify' && (
        <PhoneVerifyScreen
          onBack={() => setScreen('nurseMatching')}
          onQuit={handleQuit}
          onVerified={async (num) => {
            console.log('[App] onVerified: phone =', num);
            setPhoneNumber(num);
            try {
              await AsyncStorage.setItem(PHONE_STORAGE_KEY, num);
              console.log('[App] onVerified: phone saved to AsyncStorage');
            } catch (e) {
              console.warn('[App] onVerified: ERROR persisting phone:', e);
            }
            if (pendingProfileRef.current) {
              console.log('[App] onVerified: saving pending profile to Firestore...', JSON.stringify(pendingProfileRef.current));
              try {
                await saveUserProfile({ phoneNumber: num, ...pendingProfileRef.current });
                console.log('[App] onVerified: profile saved to Firestore for', num);
                const profile = await fetchUserProfile(num);
                console.log('[App] onVerified: fetched back profile =', profile ? JSON.stringify(profile) : '(null)');
                if (profile) {
                  setUserProfile(profile);
                  await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
                  console.log('[App] onVerified: local profile cache updated');
                }
              } catch (e) {
                console.warn('[App] onVerified: ERROR saving profile:', e);
              }
              pendingProfileRef.current = null;
            } else {
              console.log('[App] onVerified: no pending profile to save');
            }
            console.log('[App] onVerified: → payment');
            setScreen('payment');
          }}
          detectedPhone=""
        />
      )}

      {/* ── Payment (for nurse service) ── */}
      {screen === 'payment' && (
        <PaymentScreen
          onBack={() => setScreen('phoneVerify')}
          onQuit={handleQuit}
          onPay={handlePaymentComplete}
          phoneNumber={phoneNumber}
          amount={serviceAmount}
          selectedService={selectedService}
          provider={selectedProvider}
          appointmentId={appointmentId}
        />
      )}

      {/* ── Waiting room (ONLY for doctor video consultation — pharmacy flow) ── */}
      {screen === 'waiting' && (
        <WaitingScreen
          onBack={() => setScreen(selectedService === 'pharmacy' ? 'pharmacyCode' : 'dashboard')}
          onJoinVideo={() => setScreen('video')}
          onJoinChat={() => setScreen('chat')}
          onCancel={handleQuit}
          appointmentId={appointmentId}
          provider={selectedProvider}
          serviceType={selectedService}
          userProfile={userProfile}
          triageSummary={triageSummary}
        />
      )}

      {/* ── Video (doctor consultation only) ── */}
      {screen === 'video' && (
        <VideoScreen
          onEnd={() => setScreen('summary')}
          onQuit={handleQuit}
          appointmentId={appointmentId}
          userProfile={userProfile}
          triageSummary={triageSummary}
        />
      )}

      {/* ── Text chat (fallback when doctor is unavailable for video) ── */}
      {screen === 'chat' && (
        <ChatScreen
          onEnd={() => setScreen('summary')}
          onQuit={handleQuit}
          appointmentId={appointmentId}
          provider={selectedProvider}
          userProfile={userProfile}
          triageSummary={triageSummary}
        />
      )}

      {/* ── Summary ── */}
      {screen === 'summary' && (
        <SummaryScreen
          onBack={handleQuit}
          onGoHome={handleQuit}
          sessionId={sessionId}
          appointmentId={appointmentId}
          provider={selectedProvider}
          serviceType={selectedService}
          userProfile={userProfile}
          triageSummary={triageSummary}
        />
      )}

      <StatusBar style="dark" />
      <Toast />
    </SafeAreaProvider>
  );
}
