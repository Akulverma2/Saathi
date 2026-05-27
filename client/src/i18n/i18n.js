import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import hi from './hi.json';
import ur from './ur.json';

const bn = {
  ...en,
  app_name: "সাথী",
  tagline: "আপনার নিরাপদ স্থান, সর্বদা",
  welcome_sub: "আপনার মানসিক সুস্থতার যাত্রায় একটি যত্নশীল সঙ্গী",
  start_guest: "বেনামে শুরু করুন",
  sign_in: "সাইন ইন করুন",
  loading: "লোড হচ্ছে...",
  done: "সম্পন্ন",
  back: "ফিরে যান",
  chat_welcome_title: "নমস্কার {{name}}, আমি সাথী 🌿",
  chat_placeholder: "আপনার মনের কথা শেয়ার করুন..."
};

const te = {
  ...en,
  app_name: "సార్థి",
  tagline: "మీ సురక్షిత స్థలం, ఎల్లప్పుడూ",
  welcome_sub: "మీ మానసిక శ్రేయస్సు ప్రయాణంలో ఒక సంరక్షణ సహచరుడు",
  start_guest: "అజ్ఞాతంగా ప్రారంభించండి",
  sign_in: "లాగిన్ అవ్వండి",
  loading: "లోడ్ అవుతోంది...",
  done: "పూర్తయింది",
  back: "వెనుకకు",
  chat_welcome_title: "నమస్కారం {{name}}, నేను సార్థి 🌿",
  chat_placeholder: "మీ మనస్సులో ఏముందో పంచుకోండి..."
};

const ta = {
  ...en,
  app_name: "சாதி",
  tagline: "எப்போதும் உங்கள் பாதுகாப்பான இடம்",
  welcome_sub: "உங்கள் மன நலப் பயணத்தில் ஒரு அக்கறையுள்ள துணை",
  start_guest: "அநாமதேயமாகத் தொடங்குங்கள்",
  sign_in: "உள்நுழைக",
  loading: "ஏற்றுகிறது...",
  done: "முடிந்தது",
  back: "பின்னால்",
  chat_welcome_title: "வணக்கம் {{name}}, நான் சாதி 🌿",
  chat_placeholder: "உங்கள் மனதில் உள்ளதைப் பகிர்ந்து கொள்ளுங்கள்..."
};

const mr = {
  ...en,
  app_name: "साथी",
  tagline: "तुमची सुरक्षित जागा, नेहमीच",
  welcome_sub: "तुमच्या मानसिक स्वास्थ्याच्या प्रवासातील एक काळजीवाहू सोबती",
  start_guest: "अनामिकपणे सुरू करा",
  sign_in: "साइन इन करा",
  loading: "लोड होत आहे...",
  done: "पूर्ण झाले",
  back: "मागे",
  chat_welcome_title: "नमस्कार {{name}}, मी साथी आहे 🌿",
  chat_placeholder: "तुमच्या मनात काय आहे ते सांगा..."
};

const kn = {
  ...en,
  app_name: "ಸಾಥಿ",
  tagline: "ನಿಮ್ಮ ಸುರಕ್ಷಿತ ತಾಣ, ಯಾವಾಗಲೂ",
  welcome_sub: "ನಿಮ್ಮ ಮಾನಸಿಕ ಕ್ಷೇಮದ ಪ್ರಯಾಣದಲ್ಲಿ ಕಾಳಜಿಯುಳ್ಳ ಸಂಗಾತಿ",
  start_guest: "ಅನಾಮಧೇಯವಾಗಿ ಪ್ರಾರಂಭಿಸಿ",
  sign_in: "ಸೈನ್ ಇನ್ ಮಾಡಿ",
  loading: "ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
  done: "ಮುಗಿದಿದೆ",
  back: "ಹಿಂದಕ್ಕೆ",
  chat_welcome_title: "ನಮಸ್ಕಾರ {{name}}, ನಾನು ಸಾಥಿ 🌿",
  chat_placeholder: "ನಿಮ್ಮ ಮನಸ್ಸಿನಲ್ಲಿ ಏನಿದೆ ಎಂಬುದನ್ನು ಹಂಚಿಕೊಳ್ಳಿ..."
};

const gu = {
  ...en,
  app_name: "સાથી",
  tagline: "તમારું ಸುರಕ್ಷಿತ સ્થાન, હંમેશા",
  welcome_sub: "તમારી માનસિક સુખાકારીની યાત્રામાં એક પ્રેમાળ સાથી",
  start_guest: "અનામી રીતે શરૂ કરો",
  sign_in: "સાઇન ઇન કરો",
  loading: "લોડ થઈ રહ્યું છે...",
  done: "પૂર્ણ થયું",
  back: "પાછા",
  chat_welcome_title: "નમસ્તે {{name}}, હું સાથી છું 🌿",
  chat_placeholder: "તમારા મનની વાત શેર કરો..."
};

i18n.use(initReactI18next).init({
  resources: { 
    en: { translation: en }, 
    hi: { translation: hi }, 
    ur: { translation: ur },
    bn: { translation: bn },
    te: { translation: te },
    ta: { translation: ta },
    mr: { translation: mr },
    kn: { translation: kn },
    gu: { translation: gu }
  },
  lng: localStorage.getItem('saathi_lang') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
