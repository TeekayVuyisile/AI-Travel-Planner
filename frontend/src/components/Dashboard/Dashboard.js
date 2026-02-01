import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tripToDelete, setTripToDelete] = useState(null);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const response = await axios.get(`${API_URL}/trips`);
      setTrips(response.data);
    } catch (error) {
      console.error('Failed to fetch trips:', error);
      setError('Failed to load your trips');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (trip) => {
    setTripToDelete(trip);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API_URL}/trips/${tripToDelete.id}`);
      setTrips(trips.filter(trip => trip.id !== tripToDelete.id));
      setShowDeleteModal(false);
      setTripToDelete(null);
    } catch (error) {
      console.error('Failed to delete trip:', error);
      setError('Failed to delete trip');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  if (loading) {
    return (
      <Container className="py-5 mt-5">
        <div className="text-center py-5">
          <Spinner animation="border" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading your trips...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-5 mt-5">
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete your trip to {tripToDelete?.destination_city}? 
          This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete Trip
          </Button>
        </Modal.Footer>
      </Modal>

      <Row>
        <Col>
          <div className="text-center mb-5">
            <h1 className="display-4 fw-bold mb-3">Your Travel Dashboard</h1>
            <p className="lead text-muted">Manage your trips and plan new adventures</p>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="text-center">
          {error}
        </Alert>
      )}
      
      {/* Quick Actions */}
      <Row className="mb-5">
        <Col md={8} className="mx-auto">
          <Card className="travel-card text-center p-5">
            <Card.Body>
              <i className="fas fa-compass fa-4x mb-4" style={{ color: 'var(--primary-color)' }}></i>
              <h3 className="mb-3">Start Your Journey</h3>
              <p className="text-muted mb-4">
                Plan your next amazing trip with our AI-powered travel assistant. 
                Get personalized itineraries, weather forecasts, and budget planning.
              </p>
              <Button as={Link} to="/plan-trip" className="btn-travel btn-travel-accent">
                <i className="fas fa-plus me-2"></i>
                Plan New Trip
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Trips List */}
      <Row>
        <Col>
          <Card className="travel-card">
            <Card.Header className="bg-transparent border-0 d-flex justify-content-between align-items-center">
              <h4 className="mb-0">Your Trips ({trips.length})</h4>
              {trips.length > 0 && (
                <span className="text-muted">
                  <i className="fas fa-suitcase me-1"></i>
                  {trips.length} trip{trips.length !== 1 ? 's' : ''}
                </span>
              )}
            </Card.Header>
            <Card.Body>
              {trips.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-suitcase-rolling fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">No trips planned yet</h5>
                  <p className="text-muted mb-4">Start planning your first adventure!</p>
                  <Button as={Link} to="/plan-trip" className="btn-travel">
                    Plan Your First Trip
                  </Button>
                </div>
              ) : (
                <Row>
                  {trips.map((trip) => (
                    <Col lg={6} key={trip.id} className="mb-4">
                      <Card className="travel-card h-100 trip-card">
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <div>
                              <h5 className="card-title mb-1">
                                <i className="fas fa-map-marker-alt me-2" style={{ color: 'var(--primary-color)' }}></i>
                                {trip.destination_city}
                                {trip.destination_country && `, ${trip.destination_country}`}
                              </h5>
                              <p className="text-muted mb-2">
                                <i className="fas fa-calendar me-1"></i>
                                {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                              </p>
                            </div>
                            <div className="dropdown">
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                className="dropdown-toggle"
                                data-bs-toggle="dropdown"
                              >
                                <i className="fas fa-ellipsis-v"></i>
                              </Button>
                              <ul className="dropdown-menu">
                                <li>
                                  <Button 
                                    variant="link" 
                                    className="dropdown-item"
                                    onClick={() => navigate(`/trip/${trip.id}`)}
                                  >
                                    <i className="fas fa-eye me-2"></i>View Details
                                  </Button>
                                </li>
                                <li>
                                  <hr className="dropdown-divider" />
                                </li>
                                <li>
                                  <Button 
                                    variant="link" 
                                    className="dropdown-item text-danger"
                                    onClick={() => handleDeleteClick(trip)}
                                  >
                                    <i className="fas fa-trash me-2"></i>Delete
                                  </Button>
                                </li>
                              </ul>
                            </div>
                          </div>

                          <div className="trip-meta mb-3">
                            <div className="d-flex flex-wrap gap-2">
                              <span className="travel-badge">
                                <i className="fas fa-users me-1"></i>
                                {trip.travelers_count} traveler{trip.travelers_count !== 1 ? 's' : ''}
                              </span>
                              <span className="travel-badge">
                                <i className="fas fa-clock me-1"></i>
                                {calculateDuration(trip.start_date, trip.end_date)} days
                              </span>
                              <span className="travel-badge">
                                <i className="fas fa-coins me-1"></i>
                                R {trip.total_budget}
                              </span>
                            </div>
                          </div>

                          {trip.interests && trip.interests.length > 0 && (
                            <div className="mb-3">
                              <small className="text-muted d-block mb-1">Interests:</small>
                              <div className="d-flex flex-wrap gap-1">
                                {trip.interests.map((interest, index) => (
                                  <span key={index} className="badge bg-light text-dark">
                                    {interest}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="d-grid gap-2">
                            <Button 
                              variant="primary"
                              onClick={() => navigate(`/trip/${trip.id}`)}
                              className="btn-travel"
                            >
                              <i className="fas fa-eye me-2"></i>
                              View Itinerary
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;