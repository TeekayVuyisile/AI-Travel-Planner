import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Tab,
  Tabs,
  Spinner,
  Alert,
  Badge,
} from "react-bootstrap";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { PDFDownloadLink } from "@react-pdf/renderer";
import TripPDF from "./TripPDF";

const TripDetails = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("itinerary");

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    fetchTripData();
  }, [tripId]);

  const fetchTripData = async () => {
    try {
      setLoading(true);
      const [tripResponse, itinerariesResponse] = await Promise.all([
        axios.get(`${API_URL}/trips`),
        axios.get(`${API_URL}/trips/${tripId}/itineraries`),
      ]);

      const currentTrip = tripResponse.data.find(
        (t) => t.id === parseInt(tripId)
      );
      if (!currentTrip) {
        setError("Trip not found");
        return;
      }

      setTrip(currentTrip);
      setItineraries(itinerariesResponse.data);
    } catch (error) {
      console.error("Failed to fetch trip data:", error);
      setError("Failed to load trip details");
    } finally {
      setLoading(false);
    }
  };

  const generateNewItinerary = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/trips/${tripId}/generate-itinerary`);
      await fetchTripData(); // Refresh data
    } catch (error) {
      console.error("Failed to generate itinerary:", error);
      setError("Failed to generate new itinerary");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getWeatherIcon = (description) => {
    const icons = {
      sunny: "fas fa-sun",
      cloudy: "fas fa-cloud",
      rainy: "fas fa-cloud-rain",
      "partly cloudy": "fas fa-cloud-sun",
      clear: "fas fa-sun",
    };
    return icons[description] || "fas fa-cloud";
  };

  const getBudgetStatus = (estimatedCost, dailyBudget) => {
    if (estimatedCost <= dailyBudget * 0.8) return "success";
    if (estimatedCost <= dailyBudget) return "warning";
    return "danger";
  };

  if (loading) {
    return (
      <Container className="py-5 mt-5">
        <div className="text-center py-5">
          <Spinner
            animation="border"
            role="status"
            style={{ width: "3rem", height: "3rem" }}
          >
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading your trip details...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5 mt-5">
        <Alert variant="danger" className="text-center">
          {error}
        </Alert>
        <div className="text-center mt-3">
          <Button as={Link} to="/dashboard">
            Back to Dashboard
          </Button>
        </div>
      </Container>
    );
  }

  if (!trip) {
    return (
      <Container className="py-5 mt-5">
        <Alert variant="warning" className="text-center">
          Trip not found
        </Alert>
      </Container>
    );
  }

  const latestItinerary = itineraries[0];
  const dailyBudgetPerPerson =
    trip.total_budget /
    (calculateDuration(trip.start_date, trip.end_date) * trip.travelers_count);

  function calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  return (
    <Container className="py-5 mt-5">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <Button
                as={Link}
                to="/dashboard"
                variant="outline-primary"
                className="mb-3"
              >
                <i className="fas fa-arrow-left me-2"></i>
                Back to Dashboard
              </Button>
              <h1 className="display-5 fw-bold">
                <i
                  className="fas fa-map-marker-alt me-3"
                  style={{ color: "var(--primary-color)" }}
                ></i>
                {trip.destination_city}
                {trip.destination_country && `, ${trip.destination_country}`}
              </h1>
              <p className="lead text-muted">
                {formatDate(trip.start_date)} - {formatDate(trip.end_date)}•{" "}
                {calculateDuration(trip.start_date, trip.end_date)} days •{" "}
                {trip.travelers_count} traveler
                {trip.travelers_count !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="d-flex gap-2">
              {latestItinerary && (
                <PDFDownloadLink
                  document={<TripPDF trip={trip} itinerary={latestItinerary} />}
                  fileName={`${trip.destination_city}-itinerary-${trip.start_date}.pdf`}
                  style={{ textDecoration: "none" }}
                >
                  {({ loading, error }) => (
                    <Button
                      variant="outline-success"
                      disabled={loading || !!error}
                    >
                      <i className="fas fa-download me-2"></i>
                      {loading
                        ? "Generating PDF..."
                        : error
                        ? "Failed to generate PDF"
                        : "Download Itinerary PDF"}
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
              <Button
                onClick={generateNewItinerary}
                disabled={loading}
                className="btn-travel"
              >
                <i className="fas fa-sync-alt me-2"></i>
                Regenerate Itinerary
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Quick Stats */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="travel-card text-center">
            <Card.Body>
              <i
                className="fas fa-coins fa-2x mb-2"
                style={{ color: "var(--accent-color)" }}
              ></i>
              <h4>R {trip.total_budget}</h4>
              <small className="text-muted">Total Budget</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="travel-card text-center">
            <Card.Body>
              <i
                className="fas fa-calendar fa-2x mb-2"
                style={{ color: "var(--primary-color)" }}
              ></i>
              <h4>{calculateDuration(trip.start_date, trip.end_date)}</h4>
              <small className="text-muted">Days</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="travel-card text-center">
            <Card.Body>
              <i
                className="fas fa-users fa-2x mb-2"
                style={{ color: "var(--secondary-color)" }}
              ></i>
              <h4>{trip.travelers_count}</h4>
              <small className="text-muted">Travelers</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="travel-card text-center">
            <Card.Body>
              <i
                className="fas fa-sun fa-2x mb-2"
                style={{ color: "gold" }}
              ></i>
              <h4>R {dailyBudgetPerPerson.toFixed(2)}</h4>
              <small className="text-muted">Daily per Person</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Traveler Info Banner */}
      {trip.travelers_count > 1 && (
        <Row className="mb-4">
          <Col>
            <Alert variant="info" className="d-flex align-items-center">
              <i className="fas fa-info-circle fa-lg me-3"></i>
              <div>
                <strong>Traveling with {trip.travelers_count} people?</strong> 
                <span className="ms-2">
                  All costs are shown per person and as group total for clarity.
                </span>
              </div>
            </Alert>
          </Col>
        </Row>
      )}

      {/* Main Content Tabs */}
      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
        <Tab
          eventKey="itinerary"
          title={
            <span>
              <i className="fas fa-calendar-day me-2"></i>
              Itinerary
            </span>
          }
        >
          {latestItinerary ? (
            <Card className="travel-card">
              <Card.Body>
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <h4 className="mb-0">
                      <i className="fas fa-route me-2"></i>
                      Your AI-Generated Itinerary
                    </h4>
                    {trip.travelers_count > 1 && (
                      <Badge bg="primary" className="fs-6">
                        <i className="fas fa-users me-1"></i>
                        {trip.travelers_count} Travelers
                      </Badge>
                    )}
                  </div>
                  {latestItinerary.budget_analysis?.budget_summary && (
                    <Alert
                      variant={
                        latestItinerary.budget_analysis.budget_summary
                          .budget_difference >= 0
                          ? "success"
                          : "warning"
                      }
                      className="mt-3"
                    >
                      <strong>Budget Summary:</strong>{" "}
                      {
                        latestItinerary.budget_analysis.budget_summary
                          .recommendation
                      }
                    </Alert>
                  )}
                </div>

                {latestItinerary.itinerary_data?.daily_itinerary?.map(
                  (day, index) => {
                    const travelersCount = day.travelers_count || trip.travelers_count;
                    const isGroup = travelersCount > 1;
                    const dailyCostPerPerson = day.estimated_cost?.per_person || (day.estimated_cost / travelersCount);
                    const dailyCostTotal = day.estimated_cost?.total || day.estimated_cost;

                    return (
                      <Card key={index} className="mb-4 day-itinerary">
                        <Card.Header className="bg-light">
                          <h5 className="mb-0">
                            <i className="fas fa-calendar-day me-2"></i>
                            Day {day.day}: {day.date}
                          </h5>
                          {day.weather && (
                            <div className="mt-2">
                              <Badge bg="info" className="me-2">
                                <i
                                  className={`${getWeatherIcon(
                                    day.weather.description
                                  )} me-1`}
                                ></i>
                                {day.weather.max_temp}°C
                              </Badge>
                              <small className="text-muted">
                                {day.weather.description}
                              </small>
                            </div>
                          )}
                        </Card.Header>
                        <Card.Body>
                          <Row>
                            {Object.entries(day.activities).map(
                              ([timeSlot, activity]) => {
                                const costPerPerson = activity.cost?.per_person || activity.cost;
                                const totalCost = activity.cost?.total || (activity.cost * travelersCount);

                                return (
                                  <Col md={4} key={timeSlot} className="mb-3">
                                    <div className="activity-slot">
                                      <h6 className="text-primary">
                                        <i className="fas fa-clock me-1"></i>
                                        {timeSlot}
                                      </h6>
                                      <p className="mb-1 fw-bold">
                                        {activity.activity}
                                      </p>
                                      <small className="text-muted d-block">
                                        <i className="fas fa-map-pin me-1"></i>
                                        {activity.location}
                                      </small>
                                      
                                      {/* Enhanced Cost Display */}
                                      <div className="cost-breakdown mt-2">
                                        {isGroup ? (
                                          <>
                                            <div className="d-flex justify-content-between align-items-center">
                                              <small className="text-muted">Per person:</small>
                                              <Badge bg="outline-primary" className="cost-badge-primary">
                                                R {costPerPerson}
                                              </Badge>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center mt-1">
                                              <small className="text-muted">Total ({travelersCount} people):</small>
                                              <Badge bg="warning" text="dark" className="cost-badge-warning">
                                                R {totalCost}
                                              </Badge>
                                            </div>
                                          </>
                                        ) : (
                                          <div className="d-flex justify-content-between align-items-center">
                                            <small className="text-muted">Cost:</small>
                                            <Badge bg="outline-primary" className="cost-badge-primary">
                                              R {costPerPerson}
                                            </Badge>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </Col>
                                );
                              }
                            )}
                          </Row>
                          
                          {/* Enhanced Daily Summary */}
                          <div className="mt-3 pt-3 border-top">
                            <div className="budget-summary">
                              {isGroup ? (
                                <>
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="fw-bold">Daily Total per Person:</span>
                                    <span className="fw-bold">R {dailyCostPerPerson}</span>
                                  </div>
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="fw-bold text-primary">Daily Total for Group:</span>
                                    <span className="fw-bold text-primary">R {dailyCostTotal}</span>
                                  </div>
                                </>
                              ) : (
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <span className="fw-bold text-primary">Daily Total:</span>
                                  <span className="fw-bold text-primary">R {dailyCostTotal}</span>
                                </div>
                              )}
                              
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="text-muted">Daily Budget per Person:</span>
                                <span className="text-muted">R {dailyBudgetPerPerson.toFixed(2)}</span>
                              </div>
                              
                              <Badge 
                                bg={day.budget_status === 'within_budget' ? 'success' : 'danger'}
                                className="mt-2"
                              >
                                {day.budget_status === 'within_budget' ? 'Within Budget' : 'Over Budget'}
                              </Badge>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    );
                  }
                )}
              </Card.Body>
            </Card>
          ) : (
            <Card className="travel-card">
              <Card.Body className="text-center py-5">
                <i className="fas fa-route fa-3x text-muted mb-3"></i>
                <h5>No Itinerary Generated Yet</h5>
                <p className="text-muted mb-4">
                  Generate your first AI-powered itinerary for this trip
                </p>
                <Button onClick={generateNewItinerary} className="btn-travel">
                  <i className="fas fa-magic me-2"></i>
                  Generate Itinerary
                </Button>
              </Card.Body>
            </Card>
          )}
        </Tab>

        <Tab
          eventKey="weather"
          title={
            <span>
              <i className="fas fa-cloud-sun me-2"></i>
              Weather
            </span>
          }
        >
          {latestItinerary?.weather_data ? (
            <Card className="travel-card">
              <Card.Body>
                <h4 className="mb-4">
                  <i className="fas fa-cloud-sun me-2"></i>
                  Weather Forecast for {latestItinerary.weather_data.city}
                </h4>
                <Row>
                  {latestItinerary.weather_data.forecasts?.map(
                    (forecast, index) => (
                      <Col md={6} lg={4} key={index} className="mb-3">
                        <Card className="weather-card">
                          <Card.Body>
                            <h6 className="mb-2">{forecast.date}</h6>
                            <div className="d-flex align-items-center">
                              <i
                                className={`${getWeatherIcon(
                                  forecast.description
                                )} fa-2x me-3`}
                              ></i>
                              <div>
                                <div className="fw-bold">
                                  {forecast.max_temp}°C / {forecast.min_temp}°C
                                </div>
                                <small className="text-muted">
                                  {forecast.description}
                                </small>
                              </div>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    )
                  )}
                </Row>
              </Card.Body>
            </Card>
          ) : (
            <Card className="travel-card">
              <Card.Body className="text-center py-5">
                <i className="fas fa-cloud-sun fa-3x text-muted mb-3"></i>
                <p className="text-muted">
                  Weather data will appear after generating an itinerary
                </p>
              </Card.Body>
            </Card>
          )}
        </Tab>

        <Tab
          eventKey="packing"
          title={
            <span>
              <i className="fas fa-suitcase me-2"></i>
              Packing List
            </span>
          }
        >
          {latestItinerary?.budget_analysis?.packing_list ? (
            <Card className="travel-card">
              <Card.Body>
                <h4 className="mb-4">
                  <i className="fas fa-suitcase me-2"></i>
                  Smart Packing List
                </h4>
                <Row>
                  <Col md={6}>
                    <h5>Essentials</h5>
                    <ul className="list-unstyled">
                      {latestItinerary.budget_analysis.packing_list.essentials.map(
                        (item, index) => (
                          <li key={index} className="mb-2">
                            <i className="fas fa-check text-success me-2"></i>
                            {item}
                          </li>
                        )
                      )}
                    </ul>
                  </Col>
                  <Col md={6}>
                    <h5>Clothing</h5>
                    <ul className="list-unstyled">
                      {latestItinerary.budget_analysis.packing_list.clothing.map(
                        (item, index) => (
                          <li key={index} className="mb-2">
                            <i className="fas fa-check text-success me-2"></i>
                            {item}
                          </li>
                        )
                      )}
                    </ul>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          ) : (
            <Card className="travel-card">
              <Card.Body className="text-center py-5">
                <i className="fas fa-suitcase fa-3x text-muted mb-3"></i>
                <p className="text-muted">
                  Packing list will appear after generating an itinerary
                </p>
              </Card.Body>
            </Card>
          )}
        </Tab>
      </Tabs>
    </Container>
  );
};

export default TripDetails;