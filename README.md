# AI Travel Assistant - Project Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [API Documentation](#api-documentation)
5. [Database Schema](#database-schema)
6. [Frontend Components](#frontend-components)
7. [Backend Services](#backend-services)
8. [Installation & Setup](#installation--setup)
9. [Deployment Guide](#deployment-guide)
10. [Troubleshooting](#troubleshooting)

## 🚀 Project Overview

### Purpose
The AI Travel Assistant is a comprehensive web application that helps users plan their trips using AI-powered itinerary generation, real-time weather data, and budget management.

### Key Features
- **User Authentication** - Secure registration and login
- **Trip Planning** - Multi-step trip creation with destination, budget, and interests
- **AI Itinerary Generation** - Smart daily plans based on user preferences
- **Real-time Data** - Weather forecasts and currency conversion
- **Budget Management** - Cost tracking and budget analysis
- **PDF Export** - Professional itinerary downloads
- **Responsive Design** - Mobile-first Bootstrap interface

### Target Users
- Casual travelers planning vacations
- Students researching trip options
- Travel enthusiasts seeking organized itineraries

## 🏗️ System Architecture
**Frontend (React)**
Bootstrap UI 
PDF Generation 
**Backend (Node.js/Express)**
External APIs:
- OpenWeatherMap
- OpenTripMap
- ExchangeRate-API
**Database (PostgreSQL)**


## 💻 Technology Stack

### Frontend
- **React 18** - UI framework
- **React Router DOM** - Navigation
- **Bootstrap 5** - Styling and responsive design
- **React-Bootstrap** - Bootstrap components for React
- **Axios** - HTTP client for API calls
- **React DatePicker** - Date selection
- **React-PDF** - PDF generation and download
- **Font Awesome** - Icons

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **bcryptjs** - Password hashing
- **jsonwebtoken** - Authentication
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security headers
- **Express Validator** - Input validation

### External APIs
- **OpenWeatherMap** - Weather data
- **OpenTripMap** - Places and attractions
- **ExchangeRate-API** - Currency conversion
[Mock data is included to ensure the system can continue functioning and be fully testable even if external APIs are unavailable or temporarily down]

## 🔌 API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

#### POST `/api/auth/login`
Login user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** Same as register endpoint.

### Trip Management Endpoints

#### POST `/api/trips`
Create a new trip.

**Request Body:**
```json
{
  "destination_city": "Cape Town",
  "destination_country": "South Africa",
  "start_date": "2024-01-15",
  "end_date": "2024-01-20",
  "total_budget": 5000,
  "travelers_count": 2,
  "interests": ["nature", "food", "adventure"]
}
```

#### GET `/api/trips`
Get all trips for authenticated user.

#### POST `/api/trips/:tripId/generate-itinerary`
Generate AI itinerary for a trip.

#### GET `/api/trips/:tripId/itineraries`
Get saved itineraries for a trip.

### External API Endpoints

#### GET `/api/weather/current?city=Johannesburg`
Get current weather for a city.

#### GET `/api/weather/forecast?city=Johannesburg`
Get 5-day weather forecast.

#### GET `/api/places/search?city=Johannesburg&interests=nature,food`
Search for places based on interests.

#### GET `/api/currency/convert?amount=1000&from=ZAR&to=USD`
Convert currency amounts.

## 🗃️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Trips Table
```sql
CREATE TABLE trips (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    destination_city VARCHAR(255) NOT NULL,
    destination_country VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_budget DECIMAL(10,2) NOT NULL,
    travelers_count INTEGER NOT NULL,
    interests JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Saved Itineraries Table
```sql
CREATE TABLE saved_itineraries (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
    itinerary_data JSONB NOT NULL,
    weather_data JSONB,
    hotels_data JSONB,
    activities_data JSONB,
    budget_analysis JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🎨 Frontend Components

### Core Components Structure
```
src/
├── components/
│   ├── Auth/
│   │   ├── Login.js
│   │   └── Register.js
│   ├── Dashboard/
│   │   └── Dashboard.js
│   ├── TripPlanner/
│   │   └── TripPlanner.js
│   ├── TripDetails/
│   │   ├── TripDetails.js
│   │   └── TripPDF.js
│   └── Layout/
│       └── Navigation.js
├── contexts/
│   └── AuthContext.js
└── App.js
```

### Key Components Description

#### TripPlanner.js
- Multi-step form for trip creation
- Real-time weather and currency data
- Interest-based activity selection
- Budget calculation and validation

#### TripDetails.js
- Tabbed interface (Itinerary, Weather, Packing)
- Cost breakdown for multiple travelers
- PDF export functionality
- Itinerary regeneration

#### Dashboard.js
- User trip management
- Quick trip statistics
- Empty state handling

## 🔧 Backend Services

### Core Services

#### itineraryService.js
- Generates daily itineraries based on interests
- Calculates activity costs and budgets
- Creates packing lists based on weather and interests
- Budget analysis and recommendations

#### weatherService.js
- Fetches current weather and forecasts
- Fallback to mock data if API fails
- Weather data formatting and normalization

#### placesService.js
- Searches for attractions and activities
- Interest-based place recommendations
- Integration with OpenTripMap API

#### currencyService.js
- Real-time currency conversion
- Exchange rate caching
- ZAR to multiple currency support

### Authentication System
- JWT-based authentication
- Password hashing with bcrypt
- Protected route middleware
- Session management

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Backend Setup
1. Navigate to backend folder:

cd backend


2. Install dependencies:

npm install


3. Set up environment variables (.env):

PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_travel_planner
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
OPENWEATHER_API_KEY=your_key


4. Create database


5. Start backend server:

npm run dev


### Frontend Setup
1. Navigate to frontend folder:

cd frontend


2. Install dependencies:

npm install


3. Set up environment variables (.env):

REACT_APP_API_URL=http://localhost:5000/api


4. Start development server:

npm start


## 🚀 Deployment Guide

### Backend Deployment (Heroku)
1. Create Heroku app
2. Set environment variables in Heroku dashboard
3. Connect GitHub repository
4. Deploy from main branch

### Frontend Deployment (Netlify/Vercel)
1. Build the project:

npm run build


2. Deploy build folder to hosting service
3. Set environment variables for production

### Database Deployment
- Use Heroku PostgreSQL for production
- Or configure external PostgreSQL instance

## 🔍 Troubleshooting

### Common Issues

#### Database Connection Issues
- Verify PostgreSQL is running
- Check environment variables
- Ensure database exists and user has permissions

#### API Key Issues
- Verify API keys are set in environment variables
- Check API rate limits
- Implement proper error handling

#### CORS Issues
- Ensure backend CORS configuration includes frontend URL
- Check for missing headers

#### PDF Generation Issues
- Verify react-pdf dependencies
- Check browser compatibility
- Implement fallback download options

### Performance Optimization

#### Frontend
- Implement lazy loading for components
- Optimize images and assets
- Use React.memo for expensive components

#### Backend
- Implement API response caching
- Use database connection pooling
- Optimize database queries with indexes

#### Database
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_saved_itineraries_trip_id ON saved_itineraries(trip_id);
```

## 📈 Future Enhancements

### Planned Features
1. **Social Features**
   - Trip sharing
   - Collaborative planning
   - User reviews and ratings

2. **Advanced AI**
   - Machine learning recommendations
   - Sentiment analysis for reviews
   - Predictive pricing

3. **Mobile App**
   - React Native implementation
   - Offline functionality
   - Push notifications

4. **Additional Integrations**
   - Flight booking APIs
   - Hotel reservation systems
   - Real-time travel alerts

### Technical Improvements
- GraphQL API implementation
- Microservices architecture
- Real-time updates with WebSockets
- Advanced caching with Redis

##  Support

For technical support or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check server logs for errors
4. Verify all environment variables are set

---

**Project Version:** 1.0  
**Last Updated:** 02 March 2025  
**Developer:** Teekay Vuyisile Manale 

This documentation provides a comprehensive overview of the AI Travel Assistant project. For specific implementation details, refer to the code comments and inline documentation.