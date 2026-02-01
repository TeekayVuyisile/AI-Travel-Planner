import React from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Home = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: 'fas fa-robot',
      title: 'AI-Powered Planning',
      description: 'Get intelligent itinerary suggestions based on your preferences and budget.'
    },
    {
      icon: 'fas fa-cloud-sun',
      title: 'Real-time Weather',
      description: 'Plan your activities with accurate weather forecasts for your destination.'
    },
    {
      icon: 'fas fa-map-marked-alt',
      title: 'Smart Maps',
      description: 'Discover the best attractions and hotels with interactive maps.'
    },
    {
      icon: 'fas fa-coins',
      title: 'Budget Management',
      description: 'Stay within your budget with smart cost calculations and recommendations.'
    },
    {
      icon: 'fas fa-hotel',
      title: 'Hotel Suggestions',
      description: 'Find the perfect accommodation that fits your style and budget.'
    },
    {
      icon: 'fas fa-umbrella-beach',
      title: 'Activity Planning',
      description: 'Discover amazing activities and attractions tailored to your interests.'
    }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section">
        <Container>
          <Row className="align-items-center min-vh-80 pt-5">
            <Col lg={8} className="mx-auto text-center text-white fade-in">
              <h1 className="display-3 fw-bold mb-4">
                Plan Your Perfect Trip with AI
              </h1>
              <p className="lead mb-4 fs-4">
                Let artificial intelligence create your dream vacation itinerary. 
                Smart planning, real-time data, and personalized recommendations.
              </p>
              <div className="mb-5">
                {user ? (
                  <Button 
                    as={Link} 
                    to="/plan-trip" 
                    size="lg" 
                    className="btn-travel btn-travel-accent me-3"
                  >
                    Plan New Trip
                  </Button>
                ) : (
                  <>
                    <Button 
                      as={Link} 
                      to="/register" 
                      size="lg" 
                      className="btn-travel btn-travel-accent me-3"
                    >
                      Get Started Free
                    </Button>
                    <Button 
                      as={Link} 
                      to="/login" 
                      variant="outline-light" 
                      size="lg"
                      className="rounded-pill mb-1"
                    >
                      Sign In
                    </Button>
                  </>
                )}
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Features Section */}
      <section className="py-5">
        <Container>
          <Row className="mb-5">
            <Col lg={8} className="mx-auto text-center">
              <h2 className="display-5 fw-bold mb-3">Why Choose TravelAI?</h2>
              <p className="lead text-muted">
                Our intelligent travel assistant takes the stress out of trip planning
              </p>
            </Col>
          </Row>
          
          <Row>
            {features.map((feature, index) => (
              <Col lg={4} md={6} key={index} className="mb-4">
                <Card className="travel-card h-100 text-center slide-up" 
                      style={{ animationDelay: `${index * 0.1}s` }}>
                  <Card.Body className="p-4">
                    <div className="feature-icon mb-3">
                      <i className={`${feature.icon} fa-3x`} 
                         style={{ color: 'var(--primary-color)' }}></i>
                    </div>
                    <Card.Title className="h5 fw-bold mb-3">{feature.title}</Card.Title>
                    <Card.Text className="text-muted">
                      {feature.description}
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-5" style={{ background: 'var(--gradient-primary)' }}>
        <Container>
          <Row>
            <Col lg={8} className="mx-auto text-center text-white">
              <h2 className="display-5 fw-bold mb-3">Ready to Explore?</h2>
              <p className="lead mb-4">
                Join thousands of travelers who trust AI to plan their perfect vacations
              </p>
              {!user && (
                <Button 
                  as={Link} 
                  to="/register" 
                  size="lg" 
                  className="btn-travel btn-travel-secondary"
                >
                  Start Your Journey Today
                </Button>
              )}
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  );
};

export default Home;