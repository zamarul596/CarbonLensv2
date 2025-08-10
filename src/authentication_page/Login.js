import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthStyles.css';
import '../shared/HeaderStyles.css';
import carbonlensLogo from '../images/vectorlogo.svg';
import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        setError('User profile not found.');
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      
      // Verify this is an admin account
      if (!userData.isCompanyAdmin || userData.platform !== 'web') {
        setError('This portal is only for company administrators. Please use the mobile app for employee access.');
        setLoading(false);
        return;
      }

      // Get company ID from user profile
      const companyId = userData.companyId;
      if (!companyId) {
        setError('Company ID not found in user profile.');
        setLoading(false);
        return;
      }

      // Fetch company data to verify it exists and user has access
      const companyDoc = await getDoc(doc(db, 'companies', companyId));
      if (!companyDoc.exists()) {
        setError('Company not found.');
        setLoading(false);
        return;
      }

      // Verify company is active
      const companyData = companyDoc.data();
      if (!companyData.isActive) {
        setError('Company account is inactive. Please contact support.');
        setLoading(false);
        return;
      }

      // Update last login time
      await updateDoc(doc(db, 'users', user.uid), {
        lastLogin: new Date().toISOString()
      });

      // Success: proceed to admin dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to log in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <header className="app-header">
        <div className="app-logo" onClick={() => navigate('/')}>
          <img src={carbonlensLogo} alt="CarbonLens Logo" />
          <span>CarbonLens</span>
        </div>
      </header>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-card-header">
            <h1>Admin Portal Login</h1>
            <p>Access your company's ESG reporting dashboard.</p>
            <div className="admin-portal-badge">
              Company Administrator Access
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Admin Email</label>
              <input
                type="email"
                id="email"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
              <small className="input-help">
                Your administrator email address
              </small>
            </div>

            <div className="form-group">
              <div className="password-label-row">
                <label htmlFor="password">Admin Password</label>
                <button 
                  type="button" 
                  className="auth-link"
                  onClick={() => navigate('/forgot-password')}
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
              <div className="input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Logging In...' : 'Log In to Admin Portal'}
            </button>

            <div className="divider">
              <span>Need to register your company?</span>
            </div>

            <button 
              type="button" 
              className="auth-button-secondary"
              onClick={() => navigate('/subscription')}
              disabled={loading}
            >
              Register Company
            </button>

            <div className="employee-notice">
              <small>
                🔔 Are you an employee? Please use the mobile app to log in or create your account.
              </small>
            </div>
          </form>
        </div>
      </main>

      <footer className="auth-footer">
        <p>© 2025 CarbonLens. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Login; 