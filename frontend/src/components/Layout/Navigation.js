import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <Navbar bg="white" expand="lg" fixed="top" className="shadow-sm">
      <Container>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <i className="fas fa-plane-departure me-2" style={{ color: 'var(--primary-color)', fontSize: '1.8rem' }}></i>
          <span style={{ 
            fontWeight: 'bold', 
            fontSize: '1.5rem',
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            TravelAI
          </span>
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link 
              as={Link} 
              to="/" 
              className={isActive('/') ? 'active fw-bold' : ''}
              style={{ color: isActive('/') ? 'var(--primary-color)' : 'inherit' }}
            >
              Home
            </Nav.Link>
            {user && (
              <>
                <Nav.Link 
                  as={Link} 
                  to="/dashboard"
                  className={isActive('/dashboard') ? 'active fw-bold' : ''}
                  style={{ color: isActive('/dashboard') ? 'var(--primary-color)' : 'inherit' }}
                >
                  Dashboard
                </Nav.Link>
                <Nav.Link 
                  as={Link} 
                  to="/plan-trip"
                  className={isActive('/plan-trip') ? 'active fw-bold' : ''}
                  style={{ color: isActive('/plan-trip') ? 'var(--primary-color)' : 'inherit' }}
                >
                  Plan Trip
                </Nav.Link>
              </>
            )}
          </Nav>
          
          <Nav>
            {user ? (
              <div className="d-flex align-items-center">
                <span className="me-3 text-dark">
                  Welcome, <strong>{user.first_name}</strong>!
                </span>
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={handleLogout}
                  className="rounded-pill"
                >
                  <i className="fas fa-sign-out-alt me-1"></i>
                  Logout
                </Button>
              </div>
            ) : (
              <div>
                <Button 
                  as={Link} 
                  to="/login" 
                  variant="outline-primary" 
                  size="sm"
                  className="me-2 rounded-pill"
                >
                  Login<i className="fas fa-sign-in-alt mx-1" 
                   ></i>
                </Button>
                <Button 
                  as={Link} 
                  to="/register" 
                  className="btn-travel rounded-pill"
                  size="sm"
                >
                  Sign Up
                </Button>
              </div>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation;