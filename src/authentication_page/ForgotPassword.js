import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthStyles.css';
import '../shared/HeaderStyles.css';
import carbonlensLogo from '../images/vectorlogo.svg';

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Here you would implement the actual password reset logic
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSubmitted(true);
    } catch (err) {
      setError('Failed to send reset instructions. Please try again.');
    } finally {
      setIsLoading(false);
    }
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

      <main className="auth-main">
        <div className="auth-card">
          {!isSubmitted ? (
            <>
              <div className="auth-card-header">
                <h1>Reset Password</h1>
                <p>Enter your email address and we'll send you instructions to reset your password.</p>
              </div>

              <form className="auth-form" onSubmit={handleSubmit}>
                {error && (
                  <div className="auth-error">
                    {error}
                  </div>
                )}
                
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={isLoading}
                  />
                </div>

                <button 
                  type="submit" 
                  className="auth-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Reset Instructions'}
                </button>

                <button 
                  type="button" 
                  className="auth-button-secondary"
                  onClick={() => navigate('/login')}
                  disabled={isLoading}
                >
                  Back to Login
                </button>
              </form>
            </>
          ) : (
            <div className="auth-success">
              <div className="success-icon">✉️</div>
              <h2>Check Your Email</h2>
              <p>
                We've sent password reset instructions to <strong>{email}</strong>. 
                Please check your inbox and follow the instructions to reset your password.
              </p>
              <p className="auth-note">
                If you don't receive the email within a few minutes, please check your spam folder.
              </p>
              <button 
                className="auth-button-secondary"
                onClick={() => navigate('/login')}
              >
                Return to Login
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="auth-footer">
        <p>© 2025 CarbonLens. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default ForgotPassword; 