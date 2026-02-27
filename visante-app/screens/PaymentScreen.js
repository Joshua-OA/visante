import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Line, Polyline, Path } from 'react-native-svg';
import { SvgXml } from 'react-native-svg';

// ─── Colors ───────────────────────────────────────────────────────────────────
const PRIMARY_RED = '#ba5559';
const TEXT_DARK = '#0f172a';
const TEXT_GRAY = '#64748b';
const TEXT_CRIMSON = '#6e1c24';
const TEXT_CRIMSON_LT = '#b04652';
const BG_MAIN = '#fcfbfa';
const CARD_BG = '#fcf1f3';
const CARD_BORDER = '#f7d4d8';
const CARD_DIVIDER = '#f1d3d6';
const BORDER_LIGHT = '#e2e8f0';
const BG_WHITE = '#ffffff';
const ICON_BG = '#fce8eb';

// ─── SVG logo XML strings ────────────────────────────────────────────────────

// AirtelTigo — CSS classes replaced with inline fill colours
const AIRTELTIGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32.22 29.21">
  <g>
    <g>
      <path fill="#1c4077" d="M23.63,0v4.92c.26.26,6.23-.18,7.5,0l.25.48.25-.48c.87.41.57,1.88.39,2.6-.91,3.72-5.51,2.73-8.39,2.81v11.07c0,1.76,2.75,2.03,3,2.21.11.08-.45.83.73,1.02s2.11.16,1.77-1.02c.49-.02,1.03.06,1.5,0,.9,1.53.69,3.16-.5,4.43-4.55,2.96-10.9-.07-12.5-4.92.04-.65-.02-1.31,0-1.97v-.49c.07-3.11-.07-6.24,0-9.35.09-4.33-.87-7.89,2.5-11.31h3.5z"/>
      <path fill="#2a4b7f" d="M30.63,23.61c.18-.02.74-.82,1.5-.49.21,2.63.2,3.48-2,4.92,1.19-1.26,1.4-2.9.5-4.43z"/>
      <path fill="#2a4b7f" d="M29.13,23.61c.33,1.18-.61,1.21-1.77,1.02s-.61-.94-.73-1.02c.83-.02,1.67.03,2.5,0z"/>
      <path fill="#032967" d="M31.13,4.92c.18.02.39-.05.5,0l-.25.48-.25-.48z"/>
      <path fill="#04417e" d="M17.63,21.15c0-.16,0-.33,0-.49v.49z"/>
    </g>
    <path fill="#eb2028" d="M17.63,11.31c-.07,3.11.07,6.24,0,9.35,0,.16,0,.33,0,.49-.02.65.04,1.32,0,1.97-.17,3.01.12,3.26-2.98,4.7-3.84,1.78-9.72,2.06-12.8-1.23-2.6-2.79-2.67-8.93,1.08-10.78,1.18-.58,1.98-.31,2.82-.58.43-.14.36-.86.72-.94,1.05-.25,5.4.23,5.65-.02.03-6.19-5.68-3.62-9.5-2.46.08-.77-1.28-3.05-1-3.42.16-.21,4.34-1.7,4.99-1.8s4.64-.25,5.21-.19c2.63.28,4.5,2.93,5.8,4.91zM12.13,18.2c-2.76-.45-6.6.14-6.48,3.64.09,2.51,1.4,3.27,3.72,3.28,4.65.01,2.19-3.56,2.76-6.92z"/>
  </g>
</svg>`;

// Telecel — the provided SVG, no text label
const TELECEL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
  <path d="M48.19 28.6833C40.4333 28.605 34.1983 34.9933 34.2183 42.58C34.2383 50.625 40.9883 56.56 48.0333 56.4317C55.5033 56.5017 61.8867 50.53 61.9517 42.7583C62.02 34.62 55.575 28.76 48.19 28.6833ZM53.7333 38.1633C53.6017 39.2783 52.9467 39.9367 51.93 40.29C51.3683 40.4867 50.7833 40.4917 50.195 40.4917C49.8333 40.49 49.4683 40.46 49.1067 40.5183C48.8467 40.5617 48.7033 40.6917 48.6667 40.97C48.6133 41.3467 48.6917 41.7133 48.6883 42.085C48.6867 43.6083 48.6883 45.135 48.6867 46.6583C48.6867 46.9117 48.7133 47.1617 48.7667 47.4067C48.9833 48.3783 49.7917 48.955 50.7817 48.8333C51.5417 48.7383 52.31 48.7333 53.0733 48.6683C53.3933 48.6417 53.495 48.7833 53.4717 49.1233C53.435 49.6333 53.4383 50.1433 53.47 50.655C53.535 51.715 53.0383 52.4717 52.1333 52.8467C49.6867 53.8583 47.2717 53.835 45.065 52.2417C43.8517 51.3667 43.2033 50.115 43.1333 48.57C43.0467 46.585 43.0117 44.6 42.9517 42.6117C42.8883 40.605 42.9083 38.5967 42.9233 36.59C42.9333 35.2433 43.5583 34.15 44.5517 33.265C45.1033 32.7717 45.7183 32.37 46.3867 32.05C46.9933 31.7583 47.6283 31.6483 48.295 31.6583C48.5333 31.6633 48.6233 31.7533 48.6467 31.9983C48.7117 32.6333 48.68 33.27 48.6933 33.8517C48.6933 34.3667 48.6883 34.8317 48.6933 35.295C48.695 35.6983 48.8383 35.845 49.2467 35.905C49.5283 35.9483 49.8083 35.9117 50.09 35.91C51.06 35.8983 52.0267 35.8983 52.9967 35.905C53.5683 35.9117 53.745 36.0867 53.7283 36.6517C53.7117 37.1567 53.7967 37.655 53.7383 38.1633H53.7333Z" fill="#E32526"/>
  <path d="M48.665 40.9682C48.6117 41.3448 48.69 41.7115 48.6867 42.0832C48.685 43.6065 48.6867 45.1332 48.685 46.6565C48.685 46.9098 48.7117 47.1598 48.765 47.4048C48.9817 48.3765 49.79 48.9532 50.78 48.8315C51.54 48.7365 52.3083 48.7315 53.0717 48.6665C53.3917 48.6398 53.4933 48.7815 53.47 49.1215C53.4333 49.6315 53.4367 50.1415 53.4683 50.6532C53.5333 51.7132 53.0367 52.4698 52.1317 52.8448C49.685 53.8565 47.27 53.8332 45.0633 52.2398C43.85 51.3648 43.2017 50.1132 43.1317 48.5682C43.045 46.5832 43.01 44.5982 42.95 42.6098C42.8867 40.6032 42.9067 38.5948 42.9217 36.5882C42.9317 35.2415 43.5567 34.1482 44.55 33.2632C45.1017 32.7698 45.7167 32.3682 46.385 32.0482C46.9917 31.7565 47.6267 31.6465 48.2933 31.6565C48.5317 31.6615 48.6217 31.7515 48.645 31.9965C48.71 32.6315 48.6783 33.2682 48.6917 33.8498C48.6917 34.3648 48.6867 34.8298 48.6917 35.2932C48.6933 35.6965 48.8367 35.8432 49.245 35.9032C49.5267 35.9465 49.8067 35.9098 50.0883 35.9082C51.0583 35.8965 52.025 35.8965 52.995 35.9032C53.5667 35.9098 53.7433 36.0848 53.7267 36.6498C53.71 37.1548 53.795 37.6532 53.7367 38.1615C53.605 39.2765 52.95 39.9348 51.9333 40.2882C51.3717 40.4848 50.7867 40.4898 50.1983 40.4898C49.8367 40.4882 49.4717 40.4582 49.11 40.5165C48.85 40.5598 48.7067 40.6898 48.67 40.9682H48.665Z" fill="white"/>
  <path d="M70.9433 70.5166C71.8283 70.5349 72.85 70.4083 73.8167 69.9666C74.0517 69.8599 74.095 70.0383 74.1267 70.2033C74.3217 71.2116 73.8183 72.2516 72.8967 72.7549C72.3033 73.0783 71.6683 73.2699 71.0017 73.3399C69.615 73.4849 68.2483 73.4349 66.9383 72.7683C65.1283 71.8466 64.0567 69.9249 64.0633 67.8933C64.0667 66.6599 64.28 65.4816 64.9467 64.4166C66.0317 62.6799 67.5983 61.7616 69.6617 61.7199C71.1217 61.6899 72.4267 62.0933 73.5367 63.0666C74.8583 64.2249 75.09 65.7916 74.6033 67.3466C74.4033 67.9833 73.8433 68.3166 73.2183 68.5099C72.47 68.7416 71.6883 68.7583 70.9183 68.8349C70.015 68.9233 69.1133 69.0016 68.2033 68.9616C67.935 68.9499 67.8733 69.0499 67.98 69.3033C68.2633 69.9816 68.8167 70.3099 69.51 70.4416C69.9283 70.5216 70.3533 70.5083 70.9417 70.5149L70.9433 70.5166ZM68.89 66.4616C69.4833 66.4733 70.0717 66.4183 70.655 66.3199C71.2383 66.2216 71.4667 65.7283 71.11 65.2499C70.9167 64.9916 70.6767 64.7849 70.3667 64.6849C69.0417 64.2533 68.0983 65.1316 67.82 66.1966C67.77 66.3866 67.8717 66.4583 68.0433 66.4599C68.325 66.4616 68.6083 66.4599 68.89 66.4599V66.4616Z" fill="#E32526"/>
  <path d="M48.0433 70.5134C49.0933 70.5234 50.0467 70.4 50.9367 69.9634C51.1717 69.8484 51.215 69.9734 51.2467 70.1584C51.4433 71.315 50.9167 72.3417 49.8533 72.8534C49.285 73.1267 48.6817 73.29 48.055 73.3484C46.8083 73.4634 45.58 73.435 44.4033 72.9217C42.665 72.1617 41.625 70.8284 41.2933 68.9917C40.94 67.035 41.3133 65.205 42.6217 63.655C43.6533 62.4334 44.98 61.7584 46.605 61.73C47.8717 61.7084 49.0817 61.9117 50.1433 62.655C51.55 63.64 52.1317 64.9984 51.9217 66.6734C51.8133 67.5334 51.1867 68.25 50.3483 68.47C49.2783 68.75 48.1767 68.82 47.085 68.96C46.5317 69.0317 45.9717 69.025 45.4167 68.9717C45.03 68.935 44.965 69.0434 45.1167 69.395C45.3083 69.8434 45.65 70.1167 46.1117 70.2534C46.765 70.4467 47.43 70.54 48.0417 70.5167L48.0433 70.5134ZM45.5433 66.5067C46.1833 66.4284 46.9417 66.4734 47.6883 66.3367C48.0283 66.275 48.2983 66.1067 48.3833 65.7517C48.47 65.3934 48.2483 65.1567 47.995 64.96C46.9733 64.1717 45.3933 64.6667 44.9983 65.8934C44.8117 66.4734 44.8417 66.5167 45.545 66.5067H45.5433Z" fill="#E32526"/>
  <path d="M28.1983 70.5149C29.15 70.5399 30.1833 70.4099 31.16 69.9665C31.36 69.8765 31.4267 69.9749 31.4667 70.1599C31.6817 71.1849 31.18 72.2516 30.2367 72.7666C29.5967 73.1166 28.905 73.2849 28.1833 73.3432C26.9467 73.4432 25.7283 73.4249 24.565 72.8866C22.5983 71.9732 21.6 70.4182 21.4417 68.2849C21.37 67.3299 21.42 66.3849 21.7833 65.4882C22.5633 63.5632 23.8583 62.1965 25.98 61.8265C27.4233 61.5749 28.825 61.7316 30.1267 62.4949C31.1017 63.0666 31.7883 64.0415 32.0283 65.1449C32.475 67.1982 31.7883 68.1632 30.5167 68.5149C29.8233 68.7066 29.105 68.7449 28.3933 68.8199C27.7817 68.8849 27.17 68.9416 26.5583 69.0016C26.215 69.0349 25.8733 68.9749 25.5317 68.9599C25.3033 68.9499 25.24 69.0565 25.325 69.2632C25.6017 69.9399 26.12 70.3082 26.8233 70.4432C27.2417 70.5232 27.6667 70.5115 28.1983 70.5149ZM25.6117 66.5082C26.355 66.4649 27.1 66.4316 27.8417 66.3716C28.1667 66.3449 28.5033 66.2699 28.61 65.8932C28.7167 65.5165 28.5383 65.2315 28.26 64.9932C27.4017 64.2615 25.6317 64.5049 25.2083 65.9316C25.045 66.4832 25.0483 66.5166 25.6133 66.5066L25.6117 66.5082Z" fill="#E32526"/>
  <path d="M18.7266 61.7868C19.07 61.8034 19.5233 61.7601 19.9766 61.8234C20.2316 61.8584 20.325 61.9884 20.3216 62.2251C20.3183 62.4868 20.3216 62.7501 20.3216 63.0118C20.3183 64.0418 19.7216 64.7034 18.6916 64.8401C18.26 64.8984 17.8266 64.9068 17.3933 64.8951C17.1466 64.8884 17.0566 64.9934 17.0433 65.2334C16.9816 66.4734 16.9583 67.7118 17.0533 68.9501C17.1266 69.9018 17.6266 70.2968 18.565 70.1818C19.0033 70.1284 19.45 70.1234 19.8916 70.0968C20.0733 70.0851 20.1683 70.1368 20.155 70.3551C20.135 70.6634 20.1033 70.9734 20.1366 71.2801C20.2266 72.1068 19.8833 72.6601 19.17 72.9568C17.595 73.6118 16.0633 73.5384 14.6583 72.5334C13.8316 71.9418 13.3716 71.0851 13.3366 70.0551C13.2533 67.5468 13.2016 65.0368 13.2 62.5251C13.2 61.3251 13.7416 60.4718 14.6416 59.7801C15.195 59.3551 15.8033 59.0518 16.515 59.0068C16.99 58.9768 17.0433 59.0284 17.0466 59.4968C17.05 60.0418 17.0433 60.5868 17.0433 61.1301C17.0433 61.7101 17.1133 61.7801 17.68 61.7834C17.9933 61.7851 18.305 61.7834 18.7283 61.7834L18.7266 61.7868Z" fill="#E32526"/>
  <path d="M62.7616 65.0916C62.7433 65.22 62.8666 65.51 62.7166 65.6183C62.5433 65.7433 62.355 65.4833 62.1716 65.3983C61.1383 64.9183 60.0716 64.775 58.9666 65.1316C57.9233 65.4683 57.2283 66.4716 57.305 67.565C57.3966 68.9016 58.1366 69.9116 59.2333 70.0516C60.2483 70.1816 61.27 70.1466 62.2416 69.7483C62.6183 69.5933 62.6566 69.6183 62.6966 70.0316C62.8466 71.5483 62.1766 72.5266 60.7566 73.0566C57.555 74.2516 53.6633 71.8533 53.5216 68.065C53.5016 67.5166 53.5166 66.9816 53.5833 66.44C53.8933 63.93 56.5183 61.8583 58.7333 61.7683C59.2933 61.745 59.8416 61.7683 60.3883 61.8616C61.7966 62.1016 62.685 63.13 62.76 64.5866C62.7666 64.7283 62.76 64.8683 62.76 65.0916H62.7616Z" fill="#E32526"/>
  <path d="M80.4967 62.8767C80.5567 64.5867 80.5533 66.595 80.555 68.6017C80.555 68.7534 80.555 68.905 80.57 69.055C80.62 69.61 81.0817 70.04 81.6367 70.085C81.9767 70.1117 82.3167 70.1317 82.6583 70.135C82.885 70.1367 82.9967 70.215 82.9917 70.4517C82.9833 70.845 83.01 71.2384 82.9583 71.63C82.8683 72.32 82.4866 72.7817 81.8366 73C80.4633 73.4617 79.1633 73.315 77.995 72.4317C77.1166 71.7684 76.76 70.8134 76.7383 69.7567C76.68 66.9284 76.6167 64.0984 76.72 61.2684C76.7533 60.3467 76.685 59.425 76.6933 58.5017C76.6933 58.3467 76.7567 58.245 76.9183 58.2367C77.755 58.1967 78.5983 58.1434 79.3833 58.5284C80.0466 58.8534 80.4016 59.3834 80.4483 60.13C80.4983 60.9467 80.5116 61.7634 80.4983 62.8767H80.4967Z" fill="#E32526"/>
  <path d="M34.0467 63.8866C34.0467 62.1516 34.0467 60.4183 34.0467 58.6833C34.0467 58.2666 34.0817 58.2349 34.4933 58.2233C35.1583 58.2049 35.8217 58.1933 36.4667 58.4183C37.3167 58.7166 37.75 59.3183 37.81 60.2033C37.8183 60.3333 37.82 60.4649 37.8217 60.5966C37.87 63.2383 37.8817 65.8783 37.8767 68.5199C37.8767 68.7316 37.8867 68.9416 37.93 69.1516C38.055 69.7516 38.37 70.0383 38.9883 70.0816C39.33 70.1066 39.6717 70.1299 40.0133 70.1316C40.245 70.1316 40.3517 70.2283 40.3467 70.4533C40.3367 70.9633 40.3233 71.4733 40.2217 71.9749C40.1567 72.2983 39.9583 72.5899 39.6733 72.7566C37.9417 73.7733 35.1133 73.2183 34.32 70.9949C34.0917 70.3583 34.0633 69.6899 34.0567 69.0266C34.04 67.3133 34.0517 65.5983 34.0517 63.8849H34.045L34.0467 63.8866Z" fill="#E32526"/>
</svg>`;

// ─── Logo components ──────────────────────────────────────────────────────────
const AirtelTigoLogo = ({ size = 42 }) => (
  <SvgXml xml={AIRTELTIGO_SVG} width={size} height={size} />
);

const TelecelLogo = ({ size = 42 }) => (
  <SvgXml xml={TELECEL_SVG} width={size} height={size} />
);

// ─── Provider definitions & prefix maps ──────────────────────────────────────
const PROVIDERS = [
  {
    id: 'mtn',
    name: 'MTN MoMo',
    label: 'MTN',
    bgColor: '#ffcc00',
    textColor: '#000000',
    fontSize: 13,
    prefixes: ['024', '054', '055', '059', '025', '053'],
    LogoComponent: null,
  },
  {
    id: 'airteltigo',
    name: 'AirtelTigo Money',
    label: null,
    bgColor: '#ffffff',
    textColor: '#ffffff',
    fontSize: 11,
    prefixes: ['027', '057', '026', '056'],
    LogoComponent: AirtelTigoLogo,
  },
  {
    id: 'telecel',
    name: 'Telecel Cash',
    label: null,
    bgColor: '#fff0f0',
    textColor: '#ffffff',
    fontSize: 11,
    prefixes: ['050', '020'],
    LogoComponent: TelecelLogo,
  },
];

// Derive provider id from the stored phone string "0XX XXX XXXX"
function detectProvider(phoneNumber) {
  if (!phoneNumber) return null;
  const digits = phoneNumber.replace(/\s/g, '');   // strip spaces → "0XXXXXXXXX"
  const prefix = digits.slice(0, 3);               // "0XX"
  for (const p of PROVIDERS) {
    if (p.prefixes.includes(prefix)) return p.id;
  }
  return null;
}

// ─── Icons ───────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke="#334155" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="19" y1="12" x2="5" y2="12" />
    <Polyline points="12 19 5 12 12 5" />
  </Svg>
);

const LockIcon = ({ size = 20, color = PRIMARY_RED }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

const CheckIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none"
    stroke={PRIMARY_RED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <Polyline points="22 4 12 14.01 9 11.01" />
  </Svg>
);

const ShieldIcon = () => (
  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none"
    stroke={PRIMARY_RED} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Svg>
);

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function PaymentScreen({ onBack, onQuit, onPay, phoneNumber, amount, selectedService, provider, appointmentId }) {
  const insets = useSafeAreaInsets();
  const detectedId = detectProvider(phoneNumber);
  const [selected, setSelected] = useState(detectedId || 'mtn');

  // Dynamic pricing
  const isPharmacy = selectedService === 'pharmacy';
  const displayAmount = isPharmacy ? 0 : (amount ?? 60);
  const providerName = provider?.name ?? (isPharmacy ? 'Pharmacy Visit' : 'Nurse Home Visit');
  const serviceLabel = isPharmacy ? 'Vitals Check at Pharmacy' : 'Nurse Home Visit';
  const priceLabel = isPharmacy ? 'FREE' : `GH₵ ${displayAmount}.00`;

  // Modal state for mismatched provider selection
  const [pendingId, setPendingId] = useState(null);
  const [modalPhone, setModalPhone] = useState('');
  const [modalError, setModalError] = useState('');

  function handleSelect(id) {
    const provider = PROVIDERS.find(p => p.id === id);
    // If this provider has no detectable prefixes (Tigo) or the number already
    // matches, just select directly.
    if (!detectedId || id === detectedId || provider.prefixes.length === 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelected(id);
      return;
    }
    // Number was detected for a different provider — ask them to verify
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPendingId(id);
    setModalPhone('');
    setModalError('');
  }

  function handleModalConfirm() {
    const pending = PROVIDERS.find(p => p.id === pendingId);
    const digits = modalPhone.replace(/\s/g, '');
    // Validate: must be 10 digits starting with a matching prefix
    const validPrefix = pending.prefixes.some(px => digits.startsWith(px));
    if (digits.length !== 10 || !validPrefix) {
      setModalError(
        `Please enter a valid ${pending.name} number (${pending.prefixes.join(', ')})`
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelected(pendingId);
    setPendingId(null);
  }

  function handleModalCancel() {
    setPendingId(null);
    setModalError('');
  }

  function handlePay() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPay && onPay();
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={styles.progressFill} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.iconBtn}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CHECKOUT</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 140 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Lock icon */}
        <View style={styles.lockWrapper}>
          <LockIcon size={20} color={PRIMARY_RED} />
        </View>

        <Text style={styles.title}>Secure Payment</Text>
        <Text style={styles.subtitle}>Complete your consultation booking</Text>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryTitle}>{serviceLabel}</Text>
              <Text style={styles.summarySubtitle}>{providerName}</Text>
            </View>
            <Text style={styles.summaryPrice}>{priceLabel}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalValue}>{priceLabel}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{priceLabel}</Text>
          </View>
        </View>

        {/* Provider section */}
        <Text style={styles.sectionTitle}>Mobile Money Provider</Text>

        {PROVIDERS.map((provider, index) => {
          const isSelected = selected === provider.id;
          // Dim providers that don't match the detected network
          // (but never dim if nothing was detected, or if provider has no prefixes)
          const isDimmed =
            detectedId !== null &&
            detectedId !== provider.id &&
            provider.prefixes.length > 0 &&
            !isSelected;

          return (
            <TouchableOpacity
              key={provider.id}
              style={[
                styles.providerCard,
                index > 0 && styles.providerCardMargin,
                isSelected && styles.providerCardActive,
                isDimmed && styles.providerCardDimmed,
              ]}
              onPress={() => handleSelect(provider.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.radioBtn, isSelected && styles.radioBtnActive]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
              <View style={[
                styles.logo,
                { backgroundColor: provider.bgColor, opacity: isDimmed ? 0.4 : 1 },
                provider.LogoComponent && styles.logoBorderless,
              ]}>
                {provider.LogoComponent
                  ? <provider.LogoComponent size={42} />
                  : <Text style={[styles.logoText, { color: provider.textColor, fontSize: provider.fontSize }]}>
                    {provider.label}
                  </Text>
                }
              </View>
              <View style={styles.providerInfo}>
                <Text style={[styles.providerName, isDimmed && styles.textDimmed]}>
                  {provider.name}
                </Text>
                {isSelected && phoneNumber ? (
                  <View style={styles.providerMeta}>
                    <CheckIcon />
                    <Text style={styles.providerMetaText}>{phoneNumber}</Text>
                  </View>
                ) : isDimmed ? (
                  <Text style={[styles.providerMetaText, styles.textDimmed]}>
                    Tap to use a different number
                  </Text>
                ) : (
                  <Text style={styles.providerMetaText}>
                    Pay with {provider.name}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.payBtn} onPress={handlePay} activeOpacity={0.85}>
          <LockIcon size={18} color={BG_WHITE} />
          <Text style={styles.payBtnText}>
            {isPharmacy ? 'Confirm (Free)' : `Pay GH₵ ${displayAmount}.00`}
          </Text>
        </TouchableOpacity>
        <View style={styles.securityBadge}>
          <ShieldIcon />
          <Text style={styles.securityText}>BANK-LEVEL SECURITY ENCRYPTED</Text>
        </View>
        {onQuit && (
          <TouchableOpacity onPress={onQuit} activeOpacity={0.7} style={styles.quitBtn}>
            <Text style={styles.quitBtnText}>Return to Dashboard</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Change-number verification modal ── */}
      {pendingId !== null && (
        <Modal transparent animationType="fade" onRequestClose={handleModalCancel}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {/* Provider logo */}
              {(() => {
                const p = PROVIDERS.find(pr => pr.id === pendingId);
                return (
                  <View style={[
                    styles.modalLogo,
                    { backgroundColor: p.bgColor },
                    p.LogoComponent && styles.logoBorderless,
                  ]}>
                    {p.LogoComponent
                      ? <p.LogoComponent size={52} />
                      : <Text style={[styles.logoText, { color: p.textColor, fontSize: p.fontSize }]}>
                        {p.label}
                      </Text>
                    }
                  </View>
                );
              })()}

              <Text style={styles.modalTitle}>Verify your number</Text>
              <Text style={styles.modalSubtitle}>
                Your current number ({phoneNumber}) doesn't match this network.{'\n'}
                Enter your {PROVIDERS.find(p => p.id === pendingId)?.name} number to continue.
              </Text>

              {/* Phone input */}
              <View style={styles.modalInputRow}>
                <View style={styles.modalPrefix}>
                  <Text style={styles.modalPrefixText}>+233</Text>
                </View>
                <TextInput
                  style={styles.modalInput}
                  placeholder="0XX XXX XXXX"
                  placeholderTextColor="#aab"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={modalPhone}
                  onChangeText={t => { setModalPhone(t); setModalError(''); }}
                  autoFocus
                />
              </View>

              {modalError ? (
                <Text style={styles.modalError}>{modalError}</Text>
              ) : null}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={handleModalCancel} activeOpacity={0.7}>
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleModalConfirm} activeOpacity={0.85}>
                  <Text style={styles.modalBtnConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

// ─── Responsive helpers ─────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const LOCK_SIZE = Math.min(SCREEN_W * 0.13, 50);
const LOGO_SIZE = Math.min(SCREEN_W * 0.11, 42);
const MODAL_LOGO_SIZE = Math.min(SCREEN_W * 0.14, 52);

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_MAIN,
  },

  progressBar: {
    height: 4,
    backgroundColor: '#f1f5f9',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: PRIMARY_RED,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#475569',
  },
  headerSpacer: {
    width: 36,
  },

  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 10,
    alignItems: 'center',
  },

  lockWrapper: {
    width: LOCK_SIZE,
    height: LOCK_SIZE,
    borderRadius: LOCK_SIZE / 2,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: TEXT_GRAY,
    marginBottom: 24,
    textAlign: 'center',
  },

  summaryCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 16,
    width: '100%',
    padding: 20,
    marginBottom: 30,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryTitle: {
    color: TEXT_CRIMSON,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  summarySubtitle: {
    color: TEXT_CRIMSON_LT,
    fontSize: 12,
  },
  summaryPrice: {
    color: TEXT_CRIMSON,
    fontWeight: '700',
    fontSize: 16,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: CARD_DIVIDER,
    marginVertical: 16,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subtotalLabel: {
    color: TEXT_CRIMSON_LT,
    fontSize: 14,
  },
  subtotalValue: {
    color: TEXT_CRIMSON,
    fontSize: 14,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: TEXT_CRIMSON,
    fontWeight: '700',
    fontSize: 15,
  },
  totalValue: {
    color: TEXT_CRIMSON,
    fontWeight: '700',
    fontSize: 18,
  },

  sectionTitle: {
    width: '100%',
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
    textAlign: 'left',
  },

  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_LIGHT,
    backgroundColor: BG_WHITE,
    width: '100%',
  },
  providerCardMargin: {
    marginTop: 12,
  },
  providerCardActive: {
    borderWidth: 1.5,
    borderColor: PRIMARY_RED,
    backgroundColor: '#fffafa',
  },
  providerCardDimmed: {
    opacity: 0.55,
  },

  radioBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioBtnActive: {
    borderColor: PRIMARY_RED,
    borderWidth: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY_RED,
  },

  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  logoBorderless: {
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
  logoText: {
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 14,
  },

  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontWeight: '600',
    color: TEXT_DARK,
    fontSize: 14,
    marginBottom: 4,
  },
  providerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  providerMetaText: {
    fontSize: 12,
    color: TEXT_GRAY,
  },
  textDimmed: {
    color: '#94a3b8',
  },

  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY_RED,
    borderRadius: 12,
    paddingVertical: 18,
    marginBottom: 12,
    shadowColor: PRIMARY_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 5,
  },
  payBtnText: {
    color: BG_WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 4,
  },
  securityText: {
    fontSize: 10,
    color: PRIMARY_RED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: BG_WHITE,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  modalLogo: {
    width: MODAL_LOGO_SIZE,
    height: MODAL_LOGO_SIZE,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: TEXT_GRAY,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalInputRow: {
    flexDirection: 'row',
    width: '100%',
    borderWidth: 1.5,
    borderColor: BORDER_LIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  modalPrefix: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRightWidth: 1,
    borderRightColor: BORDER_LIGHT,
  },
  modalPrefixText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  modalInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 17,
    color: TEXT_DARK,
    letterSpacing: 1,
  },
  modalError: {
    fontSize: 12,
    color: PRIMARY_RED,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 6,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_LIGHT,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_GRAY,
  },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PRIMARY_RED,
    alignItems: 'center',
    shadowColor: PRIMARY_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  modalBtnConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: BG_WHITE,
  },
  quitBtn: {
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: 4,
  },
  quitBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_GRAY,
  },
});
