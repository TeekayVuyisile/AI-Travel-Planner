import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import Navigation from '../src/components/Layout/Navigation';
import Home from '../src/components/Home/Home';
import Login from '../src/components/Auth/Login';
import Register from '../src/components/Auth/Register';
import Dashboard from '../src/components/Dashboard/Dashboard';
import TripPlanner from '../src/components/TripPlanner/TripPlanner';
import TripDetails from '../src/components/TripDetails/TripDetails';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/dashboard" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navigation />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } />
              <Route path="/register" element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/plan-trip" element={
                <ProtectedRoute>
                  <TripPlanner />
                </ProtectedRoute>
              } />
              <Route path="/trip/:tripId" element={
                <ProtectedRoute>
                  <TripDetails />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;