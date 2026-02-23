import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './screens/HomeScreen';

SplashScreen.preventAutoHideAsync();

export default function App() {
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <HomeScreen />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
