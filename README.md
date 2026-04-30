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
1. Create a new PostgreSQL database named `ai_travel_planner`.
2. Run the provided SQL script to set up the tables:
```bash
psql -U your_username -d ai_travel_planner -f backend/database_structure.sql
```

### 3. Backend Configuration
1. Navigate to the backend folder:
```bash
cd backend
npm install
```
2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```
3. Fill in your database credentials and API keys in the `.env` file.

### 4. Frontend Configuration
1. Navigate to the frontend folder:
```bash
cd ../frontend
npm install
```
2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

### 5. Running the Application
**Start Backend:**
```bash
# Inside /backend
npm run dev
```

**Start Frontend:**
```bash
# Inside /frontend
npm start
```

---

## 📁 Project Structure

```text
ai-travel-assistant/
├── backend/
│   ├── config/         # Database & environment config
│   ├── middleware/     # Auth & validation middleware
│   ├── models/         # Database models (PostgreSQL)
│   ├── routes/         # API endpoints
│   ├── services/       # Business logic & external API integrations
│   └── database_structure.sql # DB Schema
├── frontend/
│   ├── public/         # Static assets
│   └── src/
│       ├── components/ # React components
│       ├── contexts/   # Auth state management
│       └── App.js      # Main application routing
└── (root files)
```

## 🔒 Security Features
- **Environment Variables:** All sensitive keys and credentials are kept out of source control.
- **Input Validation:** Robust server-side validation using `express-validator` to prevent malformed data.
- **CORS & Helmet:** Protected against common web vulnerabilities.
- **Password Hashing:** Industry-standard salt/hashing with Bcrypt.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author
**Teekay Vuyisile Manale**

---

