import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './screens/HomeScreen';
import ResultsScreen from './screens/ResultsScreen';
import BookingScreen from './screens/BookingScreen';
import EnterPhoneScreen from './screens/EnterPhoneScreen';
import OtpScreen from './screens/OtpScreen';
import PaymentScreen from './screens/PaymentScreen';
import WaitingScreen from './screens/WaitingScreen';
import VideoScreen from './screens/VideoScreen';
import SummaryScreen from './screens/SummaryScreen';
import DashboardScreen from './screens/DashboardScreen';

SplashScreen.preventAutoHideAsync();

// Simulate whether the user has been here before.
// In a real app this would come from AsyncStorage / auth state.
const IS_RETURNING_USER = true;

export default function App() {
  const [screen, setScreen] = useState(IS_RETURNING_USER ? 'dashboard' : 'home');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [triageSummary, setTriageSummary] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      {/* ── Returning-user dashboard ── */}
      {screen === 'dashboard' && (
        <DashboardScreen onStartTriage={() => setScreen('home')} />
      )}

      {/* ── AI triage (first-time & returning re-entry) ── */}
      {screen === 'home' && (
        <HomeScreen
          onSubmit={(summary) => {
            setTriageSummary(summary);
            setScreen('results');
          }}
        />
      )}
      {screen === 'results' && (
        <ResultsScreen
          triageSummary={triageSummary}
          onBack={() => setScreen('home')}
          onConfirm={() => setScreen('booking')}
          onConfirmAppointment={() => setScreen('enterPhone')}
        />
      )}
      {screen === 'booking' && (
        <BookingScreen onBack={() => setScreen('results')} onConfirm={() => setScreen('enterPhone')} />
      )}
      {screen === 'enterPhone' && (
        <EnterPhoneScreen
          onBack={() => setScreen('booking')}
          onSendOtp={(num) => {
            setPhoneNumber(num);
            setScreen('otp');
          }}
        />
      )}
      {screen === 'otp' && (
        <OtpScreen
          onBack={() => setScreen('enterPhone')}
          onVerify={() => setScreen('payment')}
          phoneNumber={phoneNumber}
        />
      )}
      {screen === 'payment' && (
        <PaymentScreen
          onBack={() => setScreen('otp')}
          onPay={() => setScreen('waiting')}
          phoneNumber={phoneNumber}
        />
      )}
      {screen === 'waiting' && (
        <WaitingScreen
          onBack={() => setScreen('payment')}
          onCheckConnection={() => setScreen('video')}
          onCancel={() => setScreen('dashboard')}
          onJoin={() => setScreen('video')}
        />
      )}
      {screen === 'video' && (
        <VideoScreen
          onEnd={() => setScreen('summary')}
        />
      )}
      {screen === 'summary' && (
        <SummaryScreen
          onBack={() => setScreen('video')}
        />
      )}
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
