import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import carbonlensLogo from '../images/vectorlogo.svg';
import forestImage from '../images/forest_image.jpg';

// Professional SVG Icon Components
const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 13h4v8H3v-8zm6-10h4v18H9V3zm6 6h4v12h-4V9z" fill="currentColor"/>
    <path d="M4 12V9a1 1 0 011-1h2a1 1 0 011 1v3M10 2V1a1 1 0 011-1h2a1 1 0 011 1v1M16 8V5a1 1 0 011-1h2a1 1 0 011 1v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const CalculatorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 2v3m8-3v3m-9 8h10M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9" cy="16" r="1" fill="currentColor"/>
    <circle cx="15" cy="16" r="1" fill="currentColor"/>
    <circle cx="12" cy="13" r="1" fill="currentColor"/>
  </svg>
);

const AnalyticsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 12l3-3 2 2 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 6h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SecurityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 10 5.16-.26 9-4.45 9-10V7l-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SustainabilityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3c7.5 0 9 4.5 9 7.5 0 3-1.5 4.5-3 6-1.5 1.5-3 1.5-6 1.5s-4.5 0-6-1.5c-1.5-1.5-3-3-3-6C3 7.5 4.5 3 12 3z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 18v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 21h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const EmailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M2 6l10 7L22 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9" cy="10" r="1" fill="currentColor"/>
    <circle cx="15" cy="10" r="1" fill="currentColor"/>
    <circle cx="12" cy="10" r="1" fill="currentColor"/>
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 4.01c-1 .49-1.98.689-3 .99-1.121-1.265-2.783-1.335-4.38-.737S11.977 6.323 12 8v1c-3.245.083-6.135-1.395-8-4 0 0-4.182 7.433 4 11-1.872 1.247-3.739 2.088-6 2 3.308 1.803 6.913 2.423 10.034 1.517 3.58-1.04 6.522-3.723 7.651-7.742a13.84 13.84 0 0 0 .497-3.753C20.18 7.773 21.692 5.25 22 4.01z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" fill="currentColor"/>
    <circle cx="4" cy="4" r="2" fill="currentColor"/>
  </svg>
);

function LandingPage() {
  const navigate = useNavigate();

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <header className="app-header">
        <div className="app-logo">
          <img src={carbonlensLogo} alt="CarbonLens" />
          <span>CarbonLens</span>
        </div>
        
        <nav className="nav-links">
          <a href="#features" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>
            Features
          </a>
          <a href="#about" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>
            About
          </a>
          <a href="#contact" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }}>
            Contact
          </a>
        </nav>
        
        <div className="header-actions">
          <button className="btn btn-login" onClick={() => navigate('/login')}>Log in</button>
          <button className="btn btn-signup" onClick={() => navigate('/subscription')}>Sign up</button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <img src={forestImage} alt="Forest landscape" />
          <div className="hero-overlay"></div>
        </div>
        <div className="hero-container">
          <div className="hero-content">
            <h1>Transform Your ESG Reporting</h1>
            <p>Streamline environmental data collection, emissions calculation, and compliance reporting with CarbonLens.</p>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => navigate('/subscription')}>Get Started Free</button>
              <button className="btn btn-outline-light">Watch Demo</button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card">
              <div className="card-icon">
                <DashboardIcon />
              </div>
              <h3>Real-time Dashboard</h3>
              <p>Monitor your carbon footprint with live data visualization</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2>Everything You Need for ESG Success</h2>
          <p>Powerful tools designed to make sustainability reporting simple and accurate</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <CalculatorIcon />
            </div>
            <h3>Emissions Calculator</h3>
            <p>Accurate Scope 1, 2, and 3 emissions calculation using industry-standard methodologies.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <AnalyticsIcon />
            </div>
            <h3>Smart Analytics</h3>
            <p>AI-powered insights to identify reduction opportunities and track progress over time.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <CheckIcon />
            </div>
            <h3>Automated Reports</h3>
            <p>Generate compliant ESG reports automatically, saving hours of manual work.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <SecurityIcon />
            </div>
            <h3>Enterprise Security</h3>
            <p>Bank-level security with role-based access controls and data encryption.</p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="about-content">
          <div className="about-text">
            <h2>Built for the Future of Sustainability</h2>
            <p>CarbonLens was created to democratize ESG reporting, making it accessible to organizations of all sizes. Our platform combines cutting-edge technology with deep sustainability expertise to help you achieve your environmental goals.</p>
            <div className="stats">
              <div className="stat">
                <h3>500+</h3>
                <p>Organizations</p>
              </div>
              <div className="stat">
                <h3>99.9%</h3>
                <p>Accuracy</p>
              </div>
              <div className="stat">
                <h3>24/7</h3>
                <p>Support</p>
              </div>
            </div>
          </div>
          <div className="about-visual">
            <div className="visual-card">
              <div className="visual-icon">
                <SustainabilityIcon />
              </div>
              <h4>Sustainability First</h4>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Start Your ESG Journey?</h2>
          <p>Join hundreds of organizations already using CarbonLens to drive their sustainability initiatives.</p>
          <div className="cta-actions">
            <button className="btn btn-primary" onClick={() => navigate('/subscription')}>Start Free Trial</button>
            <button className="btn btn-outline">Schedule Demo</button>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="contact-content">
          <div className="contact-info">
            <h2>Get in Touch</h2>
            <p>Have questions? Our team is here to help you get started with CarbonLens.</p>
            <div className="contact-methods">
              <div className="contact-method">
                <div className="contact-icon">
                  <EmailIcon />
                </div>
                <div>
                  <h4>Email</h4>
                  <a 
                    href="mailto:terrametric2025@gmail.com?subject=Inquiry about CarbonLens"
                    className="email-link"
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.href = 'mailto:terrametric2025@gmail.com?subject=Inquiry about CarbonLens';
                    }}
                  >
                    terrametric2025@gmail.com
                  </a>
                </div>
              </div>
              <div className="contact-method">
                <div className="contact-icon">
                  <ChatIcon />
                </div>
                <div>
                  <h4>Live Chat</h4>
                  <p>Available 24/7</p>
                </div>
              </div>
            </div>
          </div>
          <div className="contact-form">
            <h3>Send us a Message</h3>
            <form onSubmit={e => e.preventDefault()}>
              <div className="form-group">
                <input type="text" placeholder="Your Name" required />
              </div>
              <div className="form-group">
                <input type="email" placeholder="Your Email" required />
              </div>
              <div className="form-group">
                <textarea placeholder="Your Message" rows="4" required></textarea>
              </div>
              <button type="submit" className="btn btn-primary">Send Message</button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="footer-social">
            <a href="#" aria-label="Twitter">
              <TwitterIcon />
            </a>
            <a href="#" aria-label="LinkedIn">
              <LinkedInIcon />
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2025 CarbonLens. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage; 