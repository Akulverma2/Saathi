# Project Saathi 🌱

A Progressive Web App (PWA) mental wellness companion for rural teens.

## Features Built
- 💬 **AI Chat**: Empathetic, offline-queued, context-aware AI chat
- 🎙️ **Voice I/O**: Web Speech API for voice recording and text-to-speech
- 😊 **Mood Tracking**: Emoji check-ins, timeline, and streaks
- 🌿 **Wellness Hub**: CSS-animated breathing exercises, grounding
- 🚨 **Crisis Detection**: Client & server keyword matching + helpline UI
- 🌐 **Multilingual**: English, Hindi, Urdu (via i18next)
- 📶 **Offline-First**: IndexedDB storage, Workbox Service Worker, background sync
- 🎨 **Design System**: Calm UI, CSS custom properties, dark mode

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```

2. **Configure Environment**
   Create a `.env` file in the `server` directory:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key
   PORT=3001
   ```

3. **Start Servers**
   Terminal 1 (Backend):
   ```bash
   cd server && npm run dev
   ```
   
   Terminal 2 (Frontend):
   ```bash
   cd client && npm run dev
   ```

## Key Technologies
- Frontend: React 18, Vite, React Router, i18next, idb
- Styling: Vanilla CSS (Custom properties, mobile-first)
- Backend: Node.js, Express, better-sqlite3
- AI: Google Gemini (`gemini-2.0-flash`)
