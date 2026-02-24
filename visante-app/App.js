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

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [screen, setScreen] = useState('home');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      {screen === 'home' && (
        <HomeScreen onSubmit={() => setScreen('results')} />
      )}
      {screen === 'results' && (
        <ResultsScreen
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
        />
      )}
      {screen === 'waiting' && (
        <WaitingScreen
          onBack={() => setScreen('payment')}
          onCheckConnection={() => setScreen('video')}
          onCancel={() => setScreen('home')}
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
