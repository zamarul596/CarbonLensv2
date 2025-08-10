import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './AuthStyles.css';
import '../shared/HeaderStyles.css';
import carbonlensLogo from '../images/vectorlogo.svg';
import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

function SignUp() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedPlan = location.state?.selectedPlan;
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyId: '',
    companyName: '',
    contactPerson: '',
    isCompanyAdmin: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Basic validation
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match!');
      }
      if (!formData.companyId.trim()) {
        throw new Error('Company ID is required!');
      }
      if (!agreedToTerms) {
        throw new Error('Please agree to the Terms of Service and Privacy Policy');
      }

      console.log('Starting registration process...');

      // Step 1: Create auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;
      console.log('Auth user created:', user.uid);

      // Wait a moment for auth to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Create user document
      const userRef = doc(db, 'users', user.uid);
      const userData = {
        email: formData.email,
        companyId: formData.companyId,
        companyName: formData.companyName,
        contactPerson: formData.contactPerson || formData.email.split('@')[0],
        isCompanyAdmin: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        userType: 'admin',
        platform: 'web'
      };

      console.log('Creating user document...');
      await setDoc(userRef, userData);
      console.log('User document created successfully');

      // Step 3: Create company document
      const companyRef = doc(db, 'companies', formData.companyId);
      const companyData = {
        companyName: formData.companyName,
        createdAt: new Date().toISOString(),
        plan: selectedPlan,
        adminUid: user.uid,
        totalEmployees: 1,
        isActive: true
      };

      console.log('Creating company document...');
      await setDoc(companyRef, companyData);
      console.log('Company document created successfully');

      // Step 4: Create employee document
      const employeeRef = doc(db, 'employeeData', user.uid);
      const employeeData = {
        userId: user.uid,
        companyId: formData.companyId,
        email: formData.email,
        role: 'admin',
        createdAt: new Date().toISOString(),
        isWebAdmin: true,
        status: 'active'
      };

      console.log('Creating employee document...');
      await setDoc(employeeRef, employeeData);
      console.log('Employee document created successfully');

      console.log('Registration completed successfully');
      setSuccess(true);

      // Navigate to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { state: { selectedPlan } });
      }, 3000);

    } catch (error) {
      console.error('Registration error:', error);
      // Log additional error details
      if (error.code) {
        console.error('Error code:', error.code);
      }
      if (error.details) {
        console.error('Error details:', error.details);
      }
      
      setError(error.message);
      
      // If auth user was created but document creation failed, clean up
      if (auth.currentUser) {
        try {
          await auth.currentUser.delete();
          console.log('Cleaned up auth user after failed registration');
        } catch (cleanupError) {
          console.error('Failed to clean up auth user:', cleanupError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

      if (!selectedPlan) {
      navigate('/subscription');
      return null;
    }

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
            <h1>Register Your Company</h1>
            <p>Create your company's admin account to start managing ESG reporting.</p>
            <div className="admin-portal-badge">
              Admin Portal Registration
            </div>
          </div>

          {/* Selected Plan Summary */}
          <div className="selected-plan-summary">
            <h3>Selected Plan: {selectedPlan.name}</h3>
            <p className="plan-price">
              RM{selectedPlan.price} / {selectedPlan.billingCycle === 'monthly' ? 'mo' : 'yr'}
            </p>
            <button 
              type="button" 
              className="auth-button-secondary"
              onClick={() => navigate('/subscription')}
            >
              Change Plan
            </button>
          </div>

          {error && (
            <div className="auth-error">
              <p>{error}</p>
              <small>If the error persists, please contact support.</small>
            </div>
          )}

          {success ? (
            <div className="auth-success">
              <div className="success-icon">✅</div>
              <h2>Company Registration Complete!</h2>
              <p>Your company admin account has been created successfully.</p>
              <div className="company-id-notice">
                <strong>Important:</strong> Share your Company ID <code>{formData.companyId}</code> with your employees. 
                They will need this ID to register in the mobile app.
              </div>
              <p className="redirect-notice">Redirecting to login page in 3 seconds...</p>
              <button 
                className="auth-button" 
                onClick={() => navigate('/login', { state: { selectedPlan } })}
                style={{ marginTop: '10px' }}
              >
                Go to Admin Login Now
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="companyId">Company ID <span style={{color:'#dc2626'}}>*</span></label>
                <input
                  type="text"
                  id="companyId"
                  name="companyId"
                  placeholder="Create a unique company identifier"
                  value={formData.companyId}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <small className="input-help">
                  This ID will be used by your employees to register in the mobile app. 
                  Choose a simple, memorable ID.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="companyName">Company Name <span style={{color:'#dc2626'}}>*</span></label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  placeholder="Your Company Inc."
                  value={formData.companyName}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Admin Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="admin@company.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <small className="input-help">This email will be used for your admin portal access.</small>
              </div>

              <div className="form-group">
                <label htmlFor="password">Admin Password</label>
                <div className="input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
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

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="contactPerson">Admin Name (Optional)</label>
                <input
                  type="text"
                  id="contactPerson"
                  name="contactPerson"
                  placeholder="Full Name"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>

              <div className="terms-checkbox">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  disabled={loading}
                />
                <label htmlFor="terms">
                  I agree to the <a href="#terms" className="auth-link">Terms of Service</a> and{' '}
                  <a href="#privacy" className="auth-link">Privacy Policy</a>
                </label>
              </div>

              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? 'Creating Admin Account...' : 'Create Admin Account'}
              </button>

              <div className="divider">
                <span>Already have an admin account?</span>
              </div>

              <button 
                type="button" 
                className="auth-button-secondary"
                onClick={() => navigate('/login', { state: { selectedPlan } })}
                disabled={loading}
              >
                Admin Login
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="auth-footer">
        <p>© 2025 CarbonLens. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default SignUp; 