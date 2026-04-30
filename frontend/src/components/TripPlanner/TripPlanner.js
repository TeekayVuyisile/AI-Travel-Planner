import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Badge, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const TripPlanner = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [currencyData, setCurrencyData] = useState(null);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    destination_city: '',
    destination_country: '',
    start_date: null,
    end_date: null,
    total_budget: '',
    travelers_count: 1,
    interests: []
  });

  const interestOptions = [
    { id: 'history', label: 'History & Culture', icon: 'fas fa-landmark' },
    { id: 'nature', label: 'Nature & Outdoors', icon: 'fas fa-tree' },
    { id: 'food', label: 'Food & Dining', icon: 'fas fa-utensils' },
    { id: 'shopping', label: 'Shopping', icon: 'fas fa-shopping-bag' },
    { id: 'adventure', label: 'Adventure', icon: 'fas fa-hiking' },
    { id: 'nightlife', label: 'Nightlife', icon: 'fas fa-cocktail' },
    { id: 'beach', label: 'Beach & Relax', icon: 'fas fa-umbrella-beach' },
    { id: 'art', label: 'Art & Museums', icon: 'fas fa-palette' }
  ];

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (formData.destination_city && formData.start_date) {
        fetchWeatherData();
        fetchCurrencyData();
      }
    }, 1000);

    return () => clearTimeout(debounceTimer);
  }, [formData.destination_city, formData.start_date]);

  const fetchWeatherData = async () => {
    try {
      const response = await axios.get(`${API_URL}/weather/current`, {
        params: {
          city: formData.destination_city,
          country: formData.destination_country
        }
      });
      setWeatherData(response.data);
    } catch (error) {
      console.error('Weather data fetch failed:', error);
    }
  };

  const fetchCurrencyData = async () => {
    try {
      const response = await axios.get(`${API_URL}/currency/convert`, {
        params: {
          amount: 1000,
          from: 'ZAR',
          to: 'USD'
        }
      });
      setCurrencyData(response.data);
    } catch (error) {
      console.error('Currency data fetch failed:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleDateChange = (name, date) => {
    setFormData(prev => ({
      ...prev,
      [name]: date
    }));
  };

  const handleInterestToggle = (interestId) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(id => id !== interestId)
        : [...prev.interests, interestId]
    }));
  };

  const calculateTripDuration = () => {
    if (formData.start_date && formData.end_date) {
      const diffTime = Math.abs(formData.end_date - formData.start_date);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
    return 0;
  };

  const calculateDailyBudget = () => {
    const duration = calculateTripDuration();
    if (duration > 0 && formData.total_budget) {
      return (formData.total_budget / duration / formData.travelers_count).toFixed(2);
    }
    return 0;
  };

  const validateStep1 = () => {
    return formData.destination_city && formData.start_date && formData.end_date;
  };

  const validateStep2 = () => {
    return formData.total_budget && formData.travelers_count > 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const tripData = {
        ...formData,
        start_date: formData.start_date.toISOString().split('T')[0],
        end_date: formData.end_date.toISOString().split('T')[0],
        total_budget: parseFloat(formData.total_budget)
      };

      const response = await axios.post(`${API_URL}/trips`, tripData);
      
      // Generate itinerary
      await axios.post(`${API_URL}/trips/${response.data.trip.id}/generate-itinerary`);
      
      navigate(`/trip/${response.data.trip.id}`);
    } catch (error) {
      console.error('Trip creation failed:', error);
      setError(error.response?.data?.error || 'Failed to create trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const popularDestinations = [
    { city: 'Cape Town', country: 'South Africa', emoji: '🏔️' },
    { city: 'Johannesburg', country: 'South Africa', emoji: '🌆' },
    { city: 'Durban', country: 'South Africa', emoji: '🏖️' },
    { city: 'Paris', country: 'France', emoji: '🗼' },
    { city: 'New York', country: 'USA', emoji: '🗽' },
    { city: 'Tokyo', country: 'Japan', emoji: '🗾' },
    { city: 'London', country: 'UK', emoji: '🇬🇧' },
    { city: 'Dubai', country: 'UAE', emoji: '🏙️' }
  ];

  const selectPopularDestination = (city, country) => {
    setFormData(prev => ({
      ...prev,
      destination_city: city,
      destination_country: country
    }));
  };

  return (
    <Container className="py-5 mt-5">
      <Row className="justify-content-center">
        <Col lg={10}>
          <Card className="travel-card shadow-lg border-0">
            <Card.Header className="bg-transparent border-0 text-center py-4">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <i className="fas fa-map-marked-alt fa-2x me-3" style={{ color: 'var(--primary-color)' }}></i>
                <h1 className="display-5 fw-bold mb-0">Plan Your Adventure</h1>
              </div>
              
              {/* Progress Steps */}
              <div className="progress-steps mb-4">
                <div className="d-flex justify-content-between align-items-center">
                  {[1, 2, 3].map((stepNumber) => (
                    <React.Fragment key={stepNumber}>
                      <div className={`step-circle ${step >= stepNumber ? 'active' : ''}`}>
                        {stepNumber}
                      </div>
                      {stepNumber < 3 && (
                        <div className={`step-line ${step > stepNumber ? 'active' : ''}`}></div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div className="d-flex justify-content-between mt-2">
                  <span className={`step-label ${step >= 1 ? 'active' : ''}`}>Destination</span>
                  <span className={`step-label ${step >= 2 ? 'active' : ''}`}>Budget</span>
                  <span className={`step-label ${step >= 3 ? 'active' : ''}`}>Interests</span>
                </div>
              </div>
            </Card.Header>

            <Card.Body className="p-4 p-md-5">
              {error && (
                <Alert variant="danger" className="text-center">
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                {/* Step 1: Destination & Dates */}
                {step === 1 && (
                  <div className="slide-up">
                    <Row>
                      <Col lg={6}>
                        <Form.Group className="mb-4">
                          <Form.Label className="fw-bold fs-5">
                            <i className="fas fa-map-marker-alt me-2"></i>
                            Where do you want to go?
                          </Form.Label>
                          <Form.Control
                            type="text"
                            name="destination_city"
                            value={formData.destination_city}
                            onChange={handleInputChange}
                            placeholder="Enter city name"
                            className="form-control-lg"
                            required
                          />
                        </Form.Group>

                        <Form.Group className="mb-4">
                          <Form.Label className="fw-bold">Country (Optional)</Form.Label>
                          <Form.Control
                            type="text"
                            name="destination_country"
                            value={formData.destination_country}
                            onChange={handleInputChange}
                            placeholder="Enter country name"
                          />
                        </Form.Group>

                        {/* Popular Destinations */}
                        <div className="mb-4">
                          <Form.Label className="fw-bold">Popular Destinations</Form.Label>
                          <div className="d-flex flex-wrap gap-2">
                            {popularDestinations.map((dest, index) => (
                              <Badge
                                key={index}
                                bg="light"
                                text="dark"
                                className="p-2 cursor-pointer destination-badge"
                                onClick={() => selectPopularDestination(dest.city, dest.country)}
                              >
                                {dest.emoji} {dest.city}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </Col>

                      <Col lg={6}>
                        <Form.Group className="mb-4">
                          <Form.Label className="fw-bold fs-5">
                            <i className="fas fa-calendar-alt me-2"></i>
                            Travel Dates
                          </Form.Label>
                          <div className="row">
                            <div className="col-md-6">
                              <Form.Label>Start Date</Form.Label>
                              <DatePicker
                                selected={formData.start_date}
                                onChange={(date) => handleDateChange('start_date', date)}
                                minDate={new Date()}
                                className="form-control form-control-lg"
                                placeholderText="Select start date"
                                required
                              />
                            </div>
                            <div className="col-md-6">
                              <Form.Label>End Date</Form.Label>
                              <DatePicker
                                selected={formData.end_date}
                                onChange={(date) => handleDateChange('end_date', date)}
                                minDate={formData.start_date || new Date()}
                                className="form-control form-control-lg"
                                placeholderText="Select end date"
                                required
                              />
                            </div>
                          </div>
                          {calculateTripDuration() > 0 && (
                            <div className="mt-2">
                              <Badge bg="primary" className="p-2">
                                <i className="fas fa-clock me-1"></i>
                                {calculateTripDuration()} days
                              </Badge>
                            </div>
                          )}
                        </Form.Group>

                        {/* Weather Preview */}
                        {weatherData && (
                          <Card className="travel-card-primary text-white">
                            <Card.Body>
                              <h6 className="mb-3">
                                <i className="fas fa-cloud-sun me-2"></i>
                                Weather in {weatherData.city}
                              </h6>
                              <div className="d-flex align-items-center">
                                <div className="me-3">
                                  <i className={`fas fa-${weatherData.temperature > 20 ? 'sun' : 'cloud'} fa-2x`}></i>
                                </div>
                                <div>
                                  <h4 className="mb-0">{weatherData.temperature}°C</h4>
                                  <small>{weatherData.description}</small>
                                </div>
                              </div>
                            </Card.Body>
                          </Card>
                        )}
                      </Col>
                    </Row>

                    <div className="text-center mt-4">
                      <Button 
                        onClick={nextStep}
                        disabled={!validateStep1()}
                        className="btn-travel btn-lg px-5"
                      >
                        Continue to Budget <i className="fas fa-arrow-right ms-2"></i>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 2: Budget & Travelers */}
                {step === 2 && (
                  <div className="slide-up">
                    <Row>
                      <Col lg={6}>
                        <Form.Group className="mb-4">
                          <Form.Label className="fw-bold fs-5">
                            <i className="fas fa-coins me-2"></i>
                            Total Budget (ZAR)
                          </Form.Label>
                          <Form.Control
                            type="number"
                            name="total_budget"
                            value={formData.total_budget}
                            onChange={handleInputChange}
                            placeholder="Enter your total budget"
                            className="form-control-lg"
                            min="100"
                            required
                          />
                          <Form.Text className="text-muted">
                            This includes accommodation, activities, food, and transportation
                          </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-4">
                          <Form.Label className="fw-bold fs-5">
                            <i className="fas fa-users me-2"></i>
                            Number of Travelers
                          </Form.Label>
                          <Form.Control
                            type="number"
                            name="travelers_count"
                            value={formData.travelers_count}
                            onChange={handleInputChange}
                            min="1"
                            max="20"
                            className="form-control-lg"
                            required
                          />
                        </Form.Group>
                      </Col>

                      <Col lg={6}>
                        {/* Budget Summary */}
                        <Card className="travel-card-accent text-white h-100">
                          <Card.Body className="d-flex flex-column justify-content-center">
                            <h5 className="mb-3">Budget Summary</h5>
                            {calculateDailyBudget() > 0 && (
                              <>
                                <div className="d-flex justify-content-between mb-2">
                                  <span>Total Budget:</span>
                                  <strong>R {formData.total_budget}</strong>
                                </div>
                                <div className="d-flex justify-content-between mb-2">
                                  <span>Trip Duration:</span>
                                  <strong>{calculateTripDuration()} days</strong>
                                </div>
                                <div className="d-flex justify-content-between mb-2">
                                  <span>Travelers:</span>
                                  <strong>{formData.travelers_count}</strong>
                                </div>
                                <hr className="my-3" />
                                <div className="d-flex justify-content-between mb-2">
                                  <span>Daily Budget per Person:</span>
                                  <strong>R {calculateDailyBudget()}</strong>
                                </div>
                                {currencyData && (
                                  <div className="mt-2 small">
                                    ≈ ${(calculateDailyBudget() * currencyData.exchange_rate).toFixed(2)} USD per day
                                  </div>
                                )}
                              </>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    <div className="d-flex justify-content-between mt-4">
                      <Button 
                        variant="outline-secondary" 
                        onClick={prevStep}
                        className="px-4"
                      >
                        <i className="fas fa-arrow-left me-2"></i>
                        Back
                      </Button>
                      <Button 
                        onClick={nextStep}
                        disabled={!validateStep2()}
                        className="btn-travel px-5"
                      >
                        Continue to Interests <i className="fas fa-arrow-right ms-2"></i>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Interests */}
                {step === 3 && (
                  <div className="slide-up">
                    <Row>
                      <Col>
                        <Form.Group className="mb-4">
                          <Form.Label className="fw-bold fs-5 text-center d-block">
                            <i className="fas fa-heart me-2"></i>
                            What are you interested in?
                          </Form.Label>
                          <p className="text-muted text-center mb-4">
                            Select your interests to personalize your itinerary
                          </p>
                          
                          <Row>
                            {interestOptions.map((interest) => (
                              <Col md={6} lg={4} key={interest.id} className="mb-3">
                                <div
                                  className={`interest-card p-3 rounded cursor-pointer ${
                                    formData.interests.includes(interest.id) ? 'active' : ''
                                  }`}
                                  onClick={() => handleInterestToggle(interest.id)}
                                >
                                  <div className="d-flex align-items-center">
                                    <i className={`${interest.icon} fa-2x me-3`}></i>
                                    <div>
                                      <h6 className="mb-0">{interest.label}</h6>
                                    </div>
                                  </div>
                                </div>
                              </Col>
                            ))}
                          </Row>
                        </Form.Group>

                        {/* Trip Summary */}
                        <Card className="travel-card border-primary">
                          <Card.Header className="bg-primary text-white">
                            <h5 className="mb-0">
                              <i className="fas fa-check-circle me-2"></i>
                              Trip Summary
                            </h5>
                          </Card.Header>
                          <Card.Body>
                            <Row>
                              <Col md={6}>
                                <strong>Destination:</strong> {formData.destination_city}
                                {formData.destination_country && `, ${formData.destination_country}`}
                              </Col>
                              <Col md={6}>
                                <strong>Duration:</strong> {calculateTripDuration()} days
                              </Col>
                              <Col md={6}>
                                <strong>Travelers:</strong> {formData.travelers_count}
                              </Col>
                              <Col md={6}>
                                <strong>Total Budget:</strong> R {formData.total_budget}
                              </Col>
                              <Col md={12} className="mt-2">
                                <strong>Interests:</strong>{' '}
                                {formData.interests.length > 0 
                                  ? formData.interests.map(id => 
                                      interestOptions.find(i => i.id === id)?.label
                                    ).join(', ')
                                  : 'None selected'
                                }
                              </Col>
                            </Row>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    <div className="d-flex justify-content-between mt-4">
                      <Button 
                        variant="outline-secondary" 
                        onClick={prevStep}
                        className="px-4"
                      >
                        <i className="fas fa-arrow-left me-2"></i>
                        Back
                      </Button>
                      <Button 
                        type="submit"
                        disabled={loading || formData.interests.length === 0}
                        className="btn-travel-accent px-5"
                      >
                        {loading ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Creating Your Trip...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-magic me-2"></i>
                            Generate AI Itinerary
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default TripPlanner;