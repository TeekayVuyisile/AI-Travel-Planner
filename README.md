# 🌍 AI Travel Assistant

An intelligent, full-stack web application that simplifies trip planning by generating personalized itineraries using real-time weather data, currency conversion, and attraction discovery.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.2.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)

## 🚀 Key Features

- **🔐 Secure Authentication:** JWT-based user registration and login with encrypted password storage.
- **🗺️ Smart Trip Planning:** Multi-step trip creation process considering destination, duration, budget, and personal interests.
- **📅 Automated Itineraries:** Rule-based AI engine that generates daily schedules including morning, afternoon, and evening activities.
- **🌤️ Real-time Weather:** Integration with OpenWeatherMap API to provide 5-day forecasts and clothing recommendations.
- **💰 Budget Management:** Sophisticated cost tracking that breaks down expenses per person and for the entire group.
- **💱 Currency Conversion:** Real-time exchange rate integration for international travelers.
- **📄 PDF Export:** Professional-grade itinerary downloads using `@react-pdf/renderer`.
- **📱 Responsive Design:** Modern, mobile-first UI built with React-Bootstrap.

## 💻 Tech Stack

### Frontend
- **React 18** (Functional Components, Hooks)
- **Context API** (State Management)
- **React Router 6** (Navigation)
- **Bootstrap 5 & React-Bootstrap** (UI Components)
- **Axios** (API Requests)

### Backend
- **Node.js & Express.js**
- **PostgreSQL** (Relational Database)
- **JSON Web Tokens (JWT)** (Authentication)
- **Bcrypt.js** (Password Hashing)
- **Express Validator** (Input Validation)

### External APIs
- **OpenWeatherMap** (Weather Data)
- **OpenTripMap** (Attractions & Places)
- **ExchangeRate-API** (Currency Conversion)

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/ai-travel-assistant.git
cd ai-travel-assistant
```

### 2. Database Setup
Create an empty PostgreSQL database named `ai_travel_planner`. The tables are created by the migrations in the next step.

### 3. Backend
```bash
cd backend
npm install
cp .env.example .env   # then fill in database credentials and API keys
npm run migrate        # create or update the tables
npm run seed           # optional: demo travellers and a sample group trip
npm run dev            # API on http://localhost:5000
```
`GROQ_API_KEY` enables the AI planner and trip assistant. Without it the app falls back to a rule-based planner.

### 4. Web App
```bash
cd web
npm install
npm run dev            # http://localhost:5173, with /api proxied to the backend
```

---

## Project Structure

```text
ai-travel-assistant/
├── backend/
│   ├── config/         # Database connection
│   ├── middleware/     # Auth, trip roles, AI rate limits
│   ├── migrations/     # Numbered SQL migrations (npm run migrate)
│   ├── models/         # SQL models
│   ├── routes/         # API endpoints
│   ├── scripts/        # migrate and seed
│   └── services/       # AI planning, weather, places, currency
└── web/
    └── src/
        ├── components/ # UI, layout and trip workspace components
        ├── contexts/   # Auth state
        ├── lib/        # API client and helpers
        └── pages/      # Routes
```

## Security Features
- **Environment Variables:** All sensitive keys and credentials are kept out of source control.
- **Input Validation:** Robust server-side validation using `express-validator` to prevent malformed data.
- **CORS & Helmet:** Protected against common web vulnerabilities.
- **Password Hashing:** Industry-standard salt/hashing with Bcrypt.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author
**Teekay Vuyisile Manale**

---

