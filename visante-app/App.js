import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './screens/HomeScreen';
import ResultsScreen from './screens/ResultsScreen';
import ServiceSelectionScreen from './screens/ServiceSelectionScreen';
import BookingScreen from './screens/BookingScreen';
import EnterPhoneScreen from './screens/EnterPhoneScreen';
import OtpScreen from './screens/OtpScreen';
import PaymentScreen from './screens/PaymentScreen';
import WaitingScreen from './screens/WaitingScreen';
import VideoScreen from './screens/VideoScreen';
import SummaryScreen from './screens/SummaryScreen';
import DashboardScreen from './screens/DashboardScreen';

import { saveTriageSession, setSessionServiceType, createAppointment } from './services/firestoreService';

SplashScreen.preventAutoHideAsync();

// Simulate whether the user has been here before.
// In a real app this would come from AsyncStorage / auth state.
const IS_RETURNING_USER = true;

export default function App() {
  const [screen, setScreen] = useState(IS_RETURNING_USER ? 'dashboard' : 'home');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [triageSummary, setTriageSummary] = useState(null);

  // ── Firestore state ──
  const [sessionId, setSessionId] = useState(null);
  const [appointmentId, setAppointmentId] = useState(null);
  const [selectedService, setSelectedService] = useState(null); // 'pharmacy' | 'nurse'
  const [selectedProvider, setSelectedProvider] = useState(null); // pharmacy or nurse doc
  const [serviceAmount, setServiceAmount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  // ── Save triage to Firestore when results are shown ──
  async function handleTriageComplete(summary) {
    setTriageSummary(summary);
    setScreen('results');
    try {
      const id = await saveTriageSession(summary);
      setSessionId(id);
    } catch (e) {
      console.warn('Could not save triage session:', e);
    }
  }

  // ── Pharmacy selected ──
  async function handleSelectPharmacy(pharmacy) {
    setSelectedService('pharmacy');
    setSelectedProvider(pharmacy);
    setServiceAmount(0); // free
    setScreen('enterPhone');
    try {
      if (sessionId) await setSessionServiceType(sessionId, 'pharmacy');
    } catch (e) {
      console.warn('Could not update session service type:', e);
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
    }
  }

  // ── After booking confirmed, create appointment and go to enterPhone ──
  async function handleBookingConfirm({ date, time }) {
    setScreen('enterPhone');
    try {
      const id = await createAppointment({
        sessionId,
        providerType: selectedService,
        providerId: selectedProvider?.id ?? null,
        providerName: selectedProvider?.name ?? 'Unknown',
        date,
        time,
        amount: serviceAmount,
      });
      setAppointmentId(id);
    } catch (e) {
      console.warn('Could not create appointment:', e);
    }
  }

  return (
    <SafeAreaProvider>
      {/* ── Returning-user dashboard ── */}
      {screen === 'dashboard' && (
        <DashboardScreen onStartTriage={() => setScreen('home')} />
      )}

      {/* ── AI triage ── */}
      {screen === 'home' && (
        <HomeScreen
          onSubmit={handleTriageComplete}
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

      {/* ── NEW: service selection (pharmacy vs nurse) ── */}
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

      {/* ── Phone entry ── */}
      {screen === 'enterPhone' && (
        <EnterPhoneScreen
          onBack={() =>
            selectedService === 'nurse'
              ? setScreen('booking')
              : setScreen('serviceSelection')
          }
          onSendOtp={(num) => {
            setPhoneNumber(num);
            setScreen('otp');
          }}
        />
      )}

      {/* ── OTP ── */}
      {screen === 'otp' && (
        <OtpScreen
          onBack={() => setScreen('enterPhone')}
          onVerify={() => setScreen('payment')}
          phoneNumber={phoneNumber}
        />
      )}

      {/* ── Payment ── */}
      {screen === 'payment' && (
        <PaymentScreen
          onBack={() => setScreen('otp')}
          onPay={() => setScreen('waiting')}
          phoneNumber={phoneNumber}
          amount={serviceAmount}
          selectedService={selectedService}
          provider={selectedProvider}
          appointmentId={appointmentId}
        />
      )}

      {/* ── Waiting room ── */}
      {screen === 'waiting' && (
        <WaitingScreen
          onBack={() => setScreen('payment')}
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
    </SafeAreaProvider>
  );
}
