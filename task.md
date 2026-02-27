Design a detailed implementation plan for integrating Firebase Firestore into the Visante telehealth React Native/Expo app and adding a service selection flow.

## Current Architecture
- React Native + Expo (SDK 54)
- Simple `useState` screen navigation in App.js with screens: dashboard -> home (AI triage) -> results -> booking -> enterPhone -> otp -> payment -> waiting -> video -> summary
- AI triage produces a structured summary with: chief_complaint, symptom_duration, severity, associated_symptoms, vitals, medical_history, ai_recommendation, urgency_level
- Currently everything is hardcoded/mock data (provider "Kwame Ansah", GHS 50.00 cost, etc.)
- No Firebase or backend currently exists

## Requirements
1. **Install Firebase**: Add `@react-native-firebase/app` and `@react-native-firebase/firestore` (or use the web SDK `firebase` package since this is Expo managed workflow - the JS SDK is simpler for managed Expo)
2. **Firebase config**: Create a `services/firebase.js` file with Firebase initialization (user has their own project, will fill in config)
3. **New "Service Selection" screen** after ResultsScreen: User picks between:
   - "Nearest Pharmacy" (for vitals check) - shows pharmacies from Firestore
   - "Book a Nurse" (personal home visit) - GHS 60 and above
4. **Firestore collections needed**:
   - `sessions` - stores each triage session (triage summary, selected service type, status, timestamps)
   - `pharmacies` - pre-seeded pharmacy data (name, address, lat/lng, operating_hours, phone)
   - `nurses` - available nurses (name, rating, experience, rate starting at GHS 60)
   - `appointments` - booked appointments linking session, provider (pharmacy or nurse), date/time, payment status
5. **Loading states**: After AI triage completes, show a loading/processing state while:
   - Saving triage data to Firestore `sessions` collection
   - If pharmacy selected: fetching nearest pharmacies from Firestore
   - If nurse selected: fetching available nurses from Firestore
6. **Real-time listeners**: Use Firestore `onSnapshot` for:
   - Appointment status updates on WaitingScreen
   - Session status on DashboardScreen
7. **Update existing screens**:
   - ResultsScreen: After "Confirm" -> go to new ServiceSelectionScreen instead of BookingScreen
   - BookingScreen: Show nurse data from Firestore when nurse is selected, pharmacy data when pharmacy selected
   - PaymentScreen: Dynamic pricing (GHS 60+ for nurse, pharmacy rate from Firestore)
   - WaitingScreen: Real-time appointment status from Firestore
   - DashboardScreen: Load past appointments and vitals from Firestore
   - SummaryScreen: Save consultation summary to Firestore

## Key Design Decisions
- Use the Firebase JS SDK (not react-native-firebase) since this is Expo managed workflow - simpler setup
- Use `firebase` npm package v10+
- Keep the existing screen navigation pattern (useState in App.js) but pass Firestore data through props
- Add loading spinner components that match the existing visual style (PRIMARY_RED = #bb5454 / #B8595A)

## Existing Color Tokens & Style
- Primary red: #B8595A / #bb5454 / #ba5559 (slight variations across screens)
- Background: #FEF8F5 / #f7f9fa / #fcfbfa
- Text dark: #1F2937 / #111827
- Text muted: #6B7280 / #64748b
- Orange accent: #F89163 / #f47b2a
- Cards use white bg, border-radius 12-16, subtle shadows
- Buttons use PRIMARY_RED bg, white text, border-radius 12, shadow

Please provide a step-by-step implementation plan with file paths and key code structures.