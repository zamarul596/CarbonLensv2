import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SubscriptionPlans.css';
import '../shared/HeaderStyles.css';
import carbonlensLogo from '../images/vectorlogo.svg';

function SubscriptionPlans() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState('Professional');
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = {
    Basic: {
      name: 'Basic',
      price: { monthly: 1000, annual: 10200 },
      features: [
        'Scope 1 & 2 Emissions Tracking',
        'OCR Document Upload & Processing',
        'Basic Carbon Footprint Calculator',
        'Standard ESG Reporting Templates',
        'Monthly Carbon Reports',
        'Basic Dashboard Analytics'
      ]
    },
    Standard: {
      name: 'Standard',
      price: { monthly: 1500, annual: 15300 },
      features: [
        'Scope 1, 2 & 3 Emissions Tracking',
        'OCR Document Upload & Processing',
        'Special web app for tracking scope 3 emissions',
        'Employee Commuting Tracking',
        'Business Travel Analytics',
        'Supply Chain Emissions Analysis',
        'Advanced Dashboard Analytics',

      ],
      popular: true
    },
    Professional: {
      name: 'Professional',
      price: { monthly: 3500, annual: 35700 },
      features: [
        'Complete Scope 1, 2 & 3 Tracking',
        'Social Impact Assessment Tools',
        'Stakeholder Engagement Platform',
        'Advanced Analytics & Dashboards',
        'Real-time Emissions Monitoring',
        'White-label Reporting',
        'Advanced Data Visualization',
      ]
    },
    Enterprise: {
      name: 'Enterprise',
      price: { monthly: 7500, annual: 76500 },
      features: [
        'Full ESG Coverage (E+S+G)',
        'Complete Scope 1, 2 & 3 Tracking',
        'Governance & Compliance Tools',
        'Advanced Social Impact Metrics',
        'White-label Solutions',
        'Advanced Security & Compliance',
      ]
    }
  };

  const handlePlanSelect = (planName) => {
    setSelectedPlan(planName);
  };

  const handleContinue = () => {
    const selectedPlanData = {
      name: selectedPlan,
      billingCycle: billingCycle,
      price: plans[selectedPlan].price[billingCycle],
      features: plans[selectedPlan].features
    };
    navigate('/signup', { state: { selectedPlan: selectedPlanData } });
  };

  return (
    <div className="page-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo" onClick={() => navigate('/')}>
          <img src={carbonlensLogo} alt="CarbonLens Logo" />
          <span>CarbonLens</span>
        </div>
      </header>

      <main className="subscription-main">
        {/* Hero Section */}
        <section className="plans-hero">
          <div className="hero-content">
            <h1>Choose Your ESG Journey</h1>
            <p>Select the perfect plan to track your environmental, social, and governance impact with CarbonLens.</p>
          </div>
        </section>

        {/* Billing Toggle */}
        <div className="billing-toggle">
          <span className={billingCycle === 'monthly' ? 'active' : ''}>Monthly</span>
          <button 
            className="toggle-switch"
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
          >
            <div className={`toggle-slider ${billingCycle === 'annual' ? 'annual' : ''}`}></div>
          </button>
          <span className={billingCycle === 'annual' ? 'active' : ''}>
            Annual <span className="save-badge">Save 15%</span>
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="pricing-cards">
          {Object.entries(plans).map(([planName, planData]) => (
            <div 
              key={planName}
              className={`pricing-card ${planData.popular ? 'popular' : ''} ${selectedPlan === planName ? 'selected' : ''}`}
              onClick={() => handlePlanSelect(planName)}
            >
              {planData.popular && <div className="popular-badge">Most Popular</div>}
              
              <div className="plan-header">
                <h3>{planName}</h3>
                <div className="price">
                  <span className="currency">RM</span>
                  <span className="amount">{planData.price[billingCycle]}</span>
                  <span className="period">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
              </div>

              <ul className="features-list">
                {planData.features.map((feature, index) => (
                  <li key={index}>
                    <span className="check-icon">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button 
                className="auth-button"
                onClick={handleContinue}
              >
                Select {planName} Plan
              </button>
            </div>
          ))}
        </div>

        {/* Feature Comparison */}
        <section className="feature-comparison">
          <h2>Compare CarbonLens Features</h2>
          <div className="comparison-table">
            <div className="comparison-header">
              <div className="feature-column">ESG Features</div>
              <div className="plan-column">Basic</div>
              <div className="plan-column">Standard</div>
              <div className="plan-column">Professional</div>
              <div className="plan-column">Enterprise</div>
            </div>
            
            <div className="comparison-row">
              <div className="feature-name">Scope Coverage</div>
              <div className="feature-value">1 & 2</div>
              <div className="feature-value">1, 2 & 3</div>
              <div className="feature-value">1, 2 & 3</div>
              <div className="feature-value">1, 2 & 3</div>
            </div>
            
            <div className="comparison-row">
              <div className="feature-name">OCR Document Processing</div>
              <div className="feature-value">Basic</div>
              <div className="feature-value">Advanced</div>
              <div className="feature-value">Premium</div>
              <div className="feature-value">Custom</div>
            </div>
            
            <div className="comparison-row">
              <div className="feature-name">Scope 3 Web App</div>
              <div className="feature-value">❌</div>
              <div className="feature-value">✓</div>
              <div className="feature-value">✓</div>
              <div className="feature-value">✓</div>
            </div>
            
            <div className="comparison-row">
              <div className="feature-name">Employee Tracking</div>
              <div className="feature-value">❌</div>
              <div className="feature-value">Commuting & Travel</div>
              <div className="feature-value">Full Analytics</div>
              <div className="feature-value">Complete</div>
            </div>
            
            <div className="comparison-row">
              <div className="feature-name">Supply Chain Analysis</div>
              <div className="feature-value">❌</div>
              <div className="feature-value">Basic</div>
              <div className="feature-value">Advanced</div>
              <div className="feature-value">Complete</div>
            </div>
            
            <div className="comparison-row">
              <div className="feature-name">Social Impact (S)</div>
              <div className="feature-value">❌</div>
              <div className="feature-value">❌</div>
              <div className="feature-value">✓</div>
              <div className="feature-value">✓</div>
            </div>
            
            <div className="comparison-row">
              <div className="feature-name">Governance (G)</div>
              <div className="feature-value">❌</div>
              <div className="feature-value">❌</div>
              <div className="feature-value">❌</div>
              <div className="feature-value">✓</div>
            </div>
            
            <div className="comparison-row">
              <div className="feature-name">Dashboard Analytics</div>
              <div className="feature-value">Basic</div>
              <div className="feature-value">Advanced</div>
              <div className="feature-value">Premium</div>
              <div className="feature-value">Custom</div>
            </div>
            
            <div className="comparison-row">
              <div className="feature-name">Real-time Monitoring</div>
              <div className="feature-value">❌</div>
              <div className="feature-value">❌</div>
              <div className="feature-value">✓</div>
              <div className="feature-value">✓</div>
            </div>
            
            <div className="comparison-row">
              <div className="feature-name">Custom Report Builder</div>
              <div className="feature-value">❌</div>
              <div className="feature-value">❌</div>
              <div className="feature-value">❌</div>
              <div className="feature-value">✓</div>
            </div>
            
            <div className="comparison-row">
              <div className="feature-name">White-label Solutions</div>
              <div className="feature-value">❌</div>
              <div className="feature-value">❌</div>
              <div className="feature-value">Basic</div>
              <div className="feature-value">Complete</div>
            </div>
            
            <div className="comparison-row">
              <div className="feature-name">Advanced Security</div>
              <div className="feature-value">Basic</div>
              <div className="feature-value">Standard</div>
              <div className="feature-value">Enhanced</div>
              <div className="feature-value">Enterprise</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="auth-footer">
        <p>© 2025 CarbonLens. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default SubscriptionPlans; 