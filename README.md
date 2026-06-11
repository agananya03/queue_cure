# Queue Cure 🏥

> Real-time hospital queue management — built for Queue Cure '26 on Wooble.

[![React](https://img.shields.io/badge/React-18.3-blue?logo=react&logoColor=white)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-10.12-orange?logo=firebase&logoColor=white)](https://firebase.google.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-v5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Live Demo](https://img.shields.io/badge/Demo-Active-success?style=flat&logo=live)](https://wooble.com)

Queue Cure is a real-time, low-latency hospital queue management application designed to streamline receptionist check-ins, eliminate patient wait-time anxiety, and provide high-visibility status cast boards for clinical waiting lobbies.

---

## 📸 Screenshots

### Receptionist Control Console
`[ADD SCREENSHOT HERE: Receptionist Panel Dashboard]`

### Public Lobby Scoreboard
`[ADD SCREENSHOT HERE: Lobby Display TV Screen]`

---

## ✨ Features

- **🏥 Clean Hospital-Themed Landing**: Glowing gradients, dark navy airport-meets-hospital aesthetic, and custom diagnostic portals.
- **⚡ Count-Up Animation HUD**: Statistical counters (`Currently Serving`, `Waiting`, `Average Wait Time`) count up dynamically on changes using `requestAnimationFrame`.
- **🏥 Receptionist Registration & Triage**: Issue patient tokens sequentially (`T001`, `T002`, ...) with custom toasts (`Token T00X issued to [Name]`).
- **🎛️ Synced Consultation Slider**: Synchronized slider and numeric inputs that adjust global patient consultation pacing in real-time.
- **🎟️ Split-Flap Digit Roller**: Renders current tokens as vertically translating number rolls that spin like slot machines when a new patient is called.
- **🚨 Lobby Sound Alert & Strobe Flash**: Automatically synthesizes a soothing double-tone chime (E5 and A5 frequencies) using the native browser Web Audio API, accompanied by a 1.2s screen flash highlight.
- **📋 CSV History Exporter**: Downloads complete patient wait lists as structured spreadsheet files.
- **📲 Scan-to-Cast QR Code**: Integrates a responsive QR code in the lobby display so patients can cast the board to their own mobile devices.
- **🩺 Double Confirmation Reset**: Protects data with nested security confirmation checkpoints before resetting tokens.
- **🧩 Offline Tab-Sync Fallback**: If run without Firebase, it transparently triggers `LocalStorage` multi-tab sync, allowing complete offline functionality!

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18.3 (Vite) | Single-page architecture with state-driven renders. |
| **Routing** | React Router v6 | Client-side navigation (`/receptionist`, `/waiting-room`, `*`). |
| **Real-time Database** | Firebase Realtime DB | Real-time web-socket synchronization using modular SDK v9. |
| **Styling Library** | Tailwind CSS (v3 CDN) | Custom-themed utility colors (`#0A1628` and `#1A56DB`) and responsiveness. |
| **Icons** | Lucide React | Medical, triage, and administrative vector sets. |
| **Utility Modules** | qrcode.react | Vector QR code rendering. |

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/queue-cure.git
cd queue-cure
```

### 2. Install Project Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a local `.env` file by copying the example template:
```bash
cp .env.example .env
```
Open `.env` and fill in your Firebase project credentials (see the guide below).

### 4. Run the Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 🏥 Firebase Setup Guide (Beginner Friendly)

1. Go to the [Google Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project**, enter a name (e.g. `Queue-Cure`), and click **Create Project**.
3. Once created, click on the **Web Icon (`</>`)** on the dashboard to register a new web app. Name it `Queue-Cure Web`.
4. Copy the config block keys. You only need the field values.
5. In the Firebase Console left menu, navigate to **Build** > **Realtime Database** and click **Create Database**.
6. Select a database location closest to you, click **Next**, choose **Start in test mode** (for hackathon testing), and click **Enable**.
7. Copy the Database URL (e.g. `https://your-app.firebaseio.com/`).
8. Paste the values into your `.env` file:
   ```env
   VITE_FIREBASE_API_KEY=your_copied_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com/
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

---

## ⚡ How the Real-Time Sync Works

Queue Cure relies on a hybrid abstraction layer built into `src/firebase.js`:

```
                             +-----------------------+
                             |  isFirebaseConfigured |
                             +-----------+-----------+
                                         |
                       +-----------------+-----------------+
                       | Yes                               | No (Fallback)
                       v                                   v
          +------------+------------+         +------------+------------+
          | Firebase RT Database    |         | LocalStorage Storage    |
          | Web-Socket Listener     |         | Multi-Tab Event Sync    |
          +------------+------------+         +------------+------------+
                       |                                   |
                       +-----------------+-----------------+
                                         |
                                         v
                            +------------+------------+
                            |     React UI Updates    |
                            +-------------------------+
```

1. **Firebase Connection**: When credentials are set in `.env`, the app binds listeners using `onValue` to the `/queue` path. Renders update instantly as changes sync via WebSockets.
2. **Local Multi-Tab Sync Fallback**: If variables are missing, the app defaults to local storage. It utilizes a `window.addEventListener('storage', callback)` handler. When a receptionist issues a token in one tab, the waiting room tab hears the storage change and plays the chime instantly!

---

## 📂 Project Structure

```
queue_cure/
├── public/
├── src/
│   ├── components/
│   │   ├── HomePage.jsx          # Landing page with diagnostic portals
│   │   ├── ReceptionistView.jsx  # Light-themed admin control console
│   │   ├── WaitingRoomView.jsx   # Public lobby TV cast display
│   │   └── NotFound.jsx          # Medical-themed 404 page
│   ├── App.jsx                   # Router mappings and heartbeat loading screen
│   ├── firebase.js               # Safe Firebase v9 config & database helper APIs
│   └── main.jsx                  # React DOM mounting
├── .env.example                  # Environment key templates
├── .gitignore                    # Git tracking ignore rules
├── index.html                    # Tailwind CDN and Google Fonts loading
├── package.json                  # Scripts and packages
└── vite.config.js                # React JSX Vite loader configurations
```

---

**Built for Queue Cure '26 Hackathon on Wooble**
🏥 Eliminating queue anxiety, one token at a time.
