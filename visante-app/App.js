import { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showErrorToast } from './utils/toast';

import HomeScreen from './screens/HomeScreen';
import ResultsScreen from './screens/ResultsScreen';
import ServiceSelectionScreen from './screens/ServiceSelectionScreen';
import BookingScreen from './screens/BookingScreen';
import PhoneVerifyScreen from './screens/PhoneVerifyScreen';
import PaymentScreen from './screens/PaymentScreen';
import NurseMatchingScreen from './screens/NurseMatchingScreen';
import WaitingScreen from './screens/WaitingScreen';
import VideoScreen from './screens/VideoScreen';
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

  // ── On launch: load persisted phone, fetch profile, route accordingly ──
  useEffect(() => {
    async function bootstrap() {
      try {
        const savedPhone = await AsyncStorage.getItem(PHONE_STORAGE_KEY);
        if (savedPhone) {
          setPhoneNumber(savedPhone);
          const profile = await fetchUserProfile(savedPhone);
          if (profile) {
            setUserProfile(profile);
            setScreen('dashboard');
          } else {
            // Phone saved but no profile — start fresh triage
            setScreen('home');
          }
        } else {
          setScreen('home');
        }
      } catch (e) {
        console.warn('Bootstrap error:', e);
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
      try {
        const profile = await fetchUserProfile(phoneNumber);
        if (profile) setUserProfile(profile);
      } catch (e) {
        console.warn('Could not load user profile:', e);
        showErrorToast(e, 'Could Not Load Profile');
      }
    }
    loadProfile();
  }, [phoneNumber]);

  // ── Save triage to Firestore when results are shown ──
  async function handleTriageComplete(summary) {
    setTriageSummary(summary);
    setScreen('results');
    try {
      const id = await saveTriageSession(summary, {
        phoneNumber: phoneNumber || null,
        userName: userProfile?.name || null,
      });
      setSessionId(id);
    } catch (e) {
      console.warn('Could not save triage session:', e);
      showErrorToast(e, 'Could Not Save Session');
    }
  }

  // ── Pharmacy selected ──
  async function handleSelectPharmacy(pharmacy) {
    setSelectedService('pharmacy');
    setSelectedProvider(pharmacy);
    setServiceAmount(0); // free
    setScreen('phoneVerify');
    try {
      if (sessionId) await setSessionServiceType(sessionId, 'pharmacy');
    } catch (e) {
      console.warn('Could not update session service type:', e);
      showErrorToast(e, 'Could Not Update Session');
    }
  }

  // ── Nurse selected ──
  async function handleSelectNurse(nurse) {
    setSelectedService('nurse');
    setSelectedProvider(nurse);
    setServiceAmount(nurse.rate ?? 60);
    setScreen('booking');
    try {
      if (sessionId) await setSessionServiceType(sessionId, 'nurse');
    } catch (e) {
      console.warn('Could not update session service type:', e);
      showErrorToast(e, 'Could Not Update Session');
    }
  }

  // ── After booking confirmed, create appointment and go to enterPhone ──
  async function handleBookingConfirm({ date, time }) {
    setScreen('phoneVerify');
    try {
      const id = await createAppointment({
        sessionId,
        providerType: selectedService,
        providerId: selectedProvider?.id ?? null,
        providerName: selectedProvider?.name ?? 'Unknown',
        date,
        time,
        amount: serviceAmount,
        phoneNumber: phoneNumber || null,
      });
      setAppointmentId(id);
    } catch (e) {
      console.warn('Could not create appointment:', e);
      showErrorToast(e, 'Could Not Create Appointment');
    }
  }

  // ── After payment, go to nurse matching (nurse) or waiting room (pharmacy) ──
  function handlePaymentComplete() {
    if (selectedService === 'nurse') {
      setScreen('nurseMatching');
    } else {
      // Pharmacy flow: go to waiting room for video consultation
      setScreen('waiting');
    }
  }

  // ── View active booking from dashboard ──
  function handleViewActiveBooking(booking) {
    setAppointmentId(booking.id);
    setSelectedService(booking.providerType);
    setSelectedProvider({
      id: booking.providerId,
      name: booking.providerName,
    });
    const isVitalsReady = booking.status === 'vitals_complete' || booking.status === 'consultation_ready';
    if (isVitalsReady) {
      // Go straight to waiting room for doctor consultation
      setScreen('waiting');
    } else {
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
          onProfileCollected={(profile) => {
            // If phone is already known, profile is saved in the hook.
            // Otherwise stash it so we can save after phone verification.
            if (!phoneNumber) {
              pendingProfileRef.current = profile;
            }
            setUserProfile(profile);
          }}
        />
      )}

      {/* ── AI results ── */}
      {screen === 'results' && (
        <ResultsScreen
          triageSummary={triageSummary}
          onBack={() => setScreen('home')}
          onConfirm={() => setScreen('serviceSelection')}
          onConfirmAppointment={() => setScreen('serviceSelection')}
        />
      )}

      {/* ── Service selection (pharmacy vs nurse) ── */}
      {screen === 'serviceSelection' && (
        <ServiceSelectionScreen
          onBack={() => setScreen('results')}
          onSelectPharmacy={handleSelectPharmacy}
          onSelectNurse={handleSelectNurse}
        />
      )}

      {/* ── Booking (nurse flow only) ── */}
      {screen === 'booking' && (
        <BookingScreen
          onBack={() => setScreen('serviceSelection')}
          onConfirm={handleBookingConfirm}
          provider={selectedProvider}
          serviceType={selectedService}
          amount={serviceAmount}
        />
      )}

      {/* ── Phone auto-detection & verification ── */}
      {screen === 'phoneVerify' && (
        <PhoneVerifyScreen
          onBack={() =>
            selectedService === 'nurse'
              ? setScreen('booking')
              : setScreen('serviceSelection')
          }
          onVerified={async (num) => {
            setPhoneNumber(num);
            // Persist phone so returning users land on dashboard
            try {
              await AsyncStorage.setItem(PHONE_STORAGE_KEY, num);
            } catch (e) {
              console.warn('Could not persist phone number:', e);
            }
            // If AI collected a profile during triage but couldn't save
            // (no phone yet), save it now
            if (pendingProfileRef.current) {
              try {
                await saveUserProfile({ phoneNumber: num, ...pendingProfileRef.current });
                console.log('[App] Saved pending user profile for', num);
                const profile = await fetchUserProfile(num);
                if (profile) setUserProfile(profile);
              } catch (e) {
                console.warn('Could not save pending profile:', e);
              }
              pendingProfileRef.current = null;
            }
            setScreen('payment');
          }}
          detectedPhone=""
        />
      )}

      {/* ── Payment ── */}
      {screen === 'payment' && (
        <PaymentScreen
          onBack={() => setScreen('phoneVerify')}
          onPay={handlePaymentComplete}
          phoneNumber={phoneNumber}
          amount={serviceAmount}
          selectedService={selectedService}
          provider={selectedProvider}
          appointmentId={appointmentId}
        />
      )}

      {/* ── Nurse matching (Uber-like flow) ── */}
      {screen === 'nurseMatching' && (
        <NurseMatchingScreen
          onBack={() => setScreen('payment')}
          onCancel={() => setScreen('dashboard')}
          onGoToDashboard={() => setScreen('dashboard')}
          onConsultDoctor={() => setScreen('waiting')}
          appointmentId={appointmentId}
          provider={selectedProvider}
          serviceType={selectedService}
        />
      )}

      {/* ── Waiting room (for video consultation) ── */}
      {screen === 'waiting' && (
        <WaitingScreen
          onBack={() => selectedService === 'nurse' ? setScreen('nurseMatching') : setScreen('payment')}
          onCheckConnection={() => setScreen('video')}
          onCancel={() => setScreen('dashboard')}
          onJoin={() => setScreen('video')}
          appointmentId={appointmentId}
          provider={selectedProvider}
          serviceType={selectedService}
        />
      )}

      {/* ── Video ── */}
      {screen === 'video' && (
        <VideoScreen
          onEnd={() => setScreen('summary')}
        />
      )}

      {/* ── Summary ── */}
      {screen === 'summary' && (
        <SummaryScreen
          onBack={() => setScreen('video')}
          sessionId={sessionId}
          provider={selectedProvider}
          serviceType={selectedService}
        />
      )}

      <StatusBar style="dark" />
      <Toast />
    </SafeAreaProvider>
  );
}
