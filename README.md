# Project Saathi 🌱

Project Saathi is an AI-powered Progressive Web App (PWA) designed to support mental wellness for rural teens through empathetic AI conversations, mood tracking, multilingual accessibility, and offline-first support.

---

## 🌍 Problem Statement

Many teenagers, especially in rural and underserved communities, lack access to affordable mental health support, emotional guidance, and wellness resources.

Project Saathi aims to provide:
- Accessible emotional support
- AI-powered conversations
- Wellness activities
- Crisis awareness
- Offline accessibility
- Multilingual communication

---

## ✨ Features

### 💬 AI Wellness Chat
- Context-aware AI conversations
- Empathetic responses
- Offline queue support
- Fast response system using Gemini API

### 😊 Mood Tracking
- Daily mood check-ins
- Mood timeline/history
- Emotional streak tracking

### 🎙️ Voice Features
- Speech-to-text input
- Text-to-speech responses
- Accessibility-focused interaction

### 🌿 Wellness Hub
- Breathing exercises
- Grounding activities
- Calming UI animations

### 🚨 Crisis Detection
- Detects harmful or crisis-related keywords
- Displays emergency guidance and helpline UI

### 🌐 Multilingual Support
- English
- Hindi
- Urdu

### 📶 Offline-First PWA
- IndexedDB storage
- Background sync
- Service Worker support
- Installable mobile experience

---

## 🛠️ Tech Stack

### Frontend
- React 18
- Vite
- React Router
- i18next
- IndexedDB (idb)

### Backend
- Node.js
- Express.js
- better-sqlite3

### AI
- Google Gemini API (`gemini-2.0-flash`)

### Other
- Docker
- PWA
- Workbox
- Web Speech API

---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/project-saathi.git
```

### Install Dependencies

```bash
cd client
npm install

cd ../server
npm install
```

### Setup Environment Variables

Create a `.env` file inside the `server` folder.

```env
GEMINI_API_KEY=your_api_key
PORT=3001
```

### Run Backend

```bash
cd server
npm run dev
```

### Run Frontend

```bash
cd client
npm run dev
```

---

## 📱 Future Improvements

- AI journaling
- Therapist connection support
- More regional languages
- AI emotion analytics
- Better offline AI caching
- Community wellness features

---

## 👨‍💻 Author

Built with passion during a hackathon to improve mental wellness accessibility for teens.

---

## ⭐ Support

If you liked this project:
- Give it a star ⭐ on GitHub
- Share feedback
- Contribute ideas and improvements
