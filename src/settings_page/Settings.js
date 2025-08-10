import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import './Settings.css';
import vectorLogo from '../images/vectorlogo.svg';

function Settings() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('account-overview');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [userData, setUserData] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          // Fetch user profile data
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userProfile = userDoc.data();
            setUserData(userProfile);

            // Fetch company data if companyId exists
            if (userProfile.companyId) {
              const companyDoc = await getDoc(doc(db, 'companies', userProfile.companyId));
              if (companyDoc.exists()) {
                setCompanyData(companyDoc.data());
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to logout. Please try again.');
    }
  };

  const confirmLogout = () => {
    setShowLogoutDialog(true);
  };

  const cancelLogout = () => {
    setShowLogoutDialog(false);
  };

  const menuItems = [
    { id: 'account-overview', label: 'Account Overview', icon: 'user' },
    { id: 'profile-settings', label: 'Profile Settings', icon: 'settings' },
    { id: 'organization', label: 'Organization', icon: 'building' },
    // Removed: Subscription & Billing
    // Removed: Reporting Preferences
    // Removed: Security & Privacy
    { id: 'appearance', label: 'Appearance', icon: 'palette' }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'account-overview':
        return (
          <div className="settings-content">
            <h2>Account Overview</h2>
            <p className="content-description">Quick glance at your account and subscription status.</p>
            
            {loading ? (
              <div className="loading-spinner">Loading account information...</div>
            ) : (
              <div className="overview-cards">
                <div className="overview-item">
                  <label>Name</label>
                  <div className="overview-value">
                    {userData?.contactPerson || userData?.email?.split('@')[0] || 'Not set'}
                  </div>
                </div>
                <div className="overview-item">
                  <label>Email</label>
                  <div className="overview-value">{userData?.email || 'Not available'}</div>
                </div>
                <div className="overview-item">
                  <label>Company Name</label>
                  <div className="overview-value">{companyData?.companyName || userData?.companyName || 'Not set'}</div>
                </div>
                <div className="overview-item">
                  <label>Company ID</label>
                  <div className="overview-value">{userData?.companyId || 'Not available'}</div>
                </div>
                <div className="overview-item">
                  <label>Current Plan</label>
                  <div className="overview-value">
                    {companyData?.plan?.name || 'Basic Plan'}
                    <span className="status-badge active">Active</span>
                  </div>
                </div>
                <div className="overview-item">
                  <label>Plan Price</label>
                  <div className="overview-value">
                    {companyData?.plan ? 
                      `RM${companyData.plan.price} / ${companyData.plan.billingCycle === 'monthly' ? 'mo' : 'yr'}` : 
                      'Not available'
                    }
                  </div>
                </div>
                <div className="overview-item">
                  <label>Account Type</label>
                  <div className="overview-value">
                    {userData?.isCompanyAdmin ? 'Company Administrator' : 'Employee'}
                  </div>
                </div>
                <div className="overview-item">
                  <label>Member Since</label>
                  <div className="overview-value">
                    {userData?.createdAt ? 
                      new Date(userData.createdAt).toLocaleDateString() : 
                      'Not available'
                    }
                  </div>
                </div>
                <div className="overview-item">
                  <label>Last Login</label>
                  <div className="overview-value">
                    {userData?.lastLogin ? 
                      new Date(userData.lastLogin).toLocaleDateString() : 
                      'Not available'
                    }
                  </div>
                </div>
              </div>
            )}

            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="action-buttons">
                <button className="action-btn" onClick={() => setActiveSection('profile-settings')}>
                  Update Profile
                </button>
                {/* Removed Manage Subscription quick action */}
                <button className="action-btn" onClick={() => navigate('/report')}>
                  View Reports
                </button>
              </div>
            </div>
          </div>
        );

      case 'profile-settings':
        return (
          <div className="settings-content">
            <h2>Profile Settings</h2>
            <p className="content-description">Manage your personal information and preferences.</p>
            
            {loading ? (
              <div className="loading-spinner">Loading profile information...</div>
            ) : (
              <form className="settings-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    defaultValue={userData?.contactPerson || ''} 
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    defaultValue={userData?.email || ''} 
                    disabled
                  />
                  <small className="input-help">Email address cannot be changed</small>
                </div>
                <div className="form-group">
                  <label>Company Name</label>
                  <input 
                    type="text" 
                    defaultValue={companyData?.companyName || userData?.companyName || ''} 
                    disabled
                  />
                  <small className="input-help">Company name is set during registration</small>
                </div>
                <div className="form-group">
                  <label>Company ID</label>
                  <input 
                    type="text" 
                    defaultValue={userData?.companyId || ''} 
                    disabled
                  />
                  <small className="input-help">Company ID is set during registration</small>
                </div>
                <div className="form-group">
                  <label>Account Type</label>
                  <input 
                    type="text" 
                    defaultValue={userData?.isCompanyAdmin ? 'Company Administrator' : 'Employee'} 
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label>Member Since</label>
                  <input 
                    type="text" 
                    defaultValue={userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : ''} 
                    disabled
                  />
                </div>
                <button type="submit" className="save-btn">Save Changes</button>
              </form>
            )}
          </div>
        );

      case 'organization':
        return (
          <div className="settings-content">
            <h2>Organization</h2>
            <p className="content-description">Manage your organization details and team members.</p>
            
            {loading ? (
              <div className="loading-spinner">Loading organization information...</div>
            ) : (
              <>
                <div className="org-section">
                  <h3>Organization Details</h3>
                  <form className="settings-form">
                    <div className="form-group">
                      <label>Company Name</label>
                      <input 
                        type="text" 
                        defaultValue={companyData?.companyName || userData?.companyName || ''} 
                        disabled
                      />
                      <small className="input-help">Company name is set during registration</small>
                    </div>
                    <div className="form-group">
                      <label>Company ID</label>
                      <input 
                        type="text" 
                        defaultValue={userData?.companyId || ''} 
                        disabled
                      />
                      <small className="input-help">Company ID is set during registration</small>
                    </div>
                    <div className="form-group">
                      <label>Current Plan</label>
                      <input 
                        type="text" 
                        defaultValue={companyData?.plan?.name || 'Basic Plan'} 
                        disabled
                      />
                    </div>
                    <div className="form-group">
                      <label>Plan Price</label>
                      <input 
                        type="text" 
                        defaultValue={
                          companyData?.plan ? 
                            `RM${companyData.plan.price} / ${companyData.plan.billingCycle === 'monthly' ? 'mo' : 'yr'}` : 
                            'Not available'
                        } 
                        disabled
                      />
                    </div>
                    <div className="form-group">
                      <label>Total Employees</label>
                      <input 
                        type="text" 
                        defaultValue={companyData?.totalEmployees || 1} 
                        disabled
                      />
                    </div>
                    <div className="form-group">
                      <label>Account Status</label>
                      <input 
                        type="text" 
                        defaultValue={companyData?.isActive ? 'Active' : 'Inactive'} 
                        disabled
                      />
                    </div>
                    <div className="form-group">
                      <label>Created Date</label>
                      <input 
                        type="text" 
                        defaultValue={companyData?.createdAt ? new Date(companyData.createdAt).toLocaleDateString() : ''} 
                        disabled
                      />
                    </div>
                  </form>
                </div>

                <div className="team-section">
                  <h3>Admin Account</h3>
                  <div className="team-list">
                    <div className="team-member">
                      <div className="member-info">
                        <div className="member-name">
                          {userData?.contactPerson || userData?.email?.split('@')[0] || 'Admin User'}
                        </div>
                        <div className="member-role">Company Administrator</div>
                        <div className="member-email">{userData?.email}</div>
                      </div>
                      <span className="member-status active">Active</span>
                    </div>
                  </div>
                  <div className="admin-notice">
                    <small>
                      🔔 As the company administrator, you have full access to manage your organization's ESG reporting.
                      Employee accounts are managed through the mobile app.
                    </small>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      

      

      

      case 'security-privacy':
        return (
          <div className="settings-content">
            <h2>Security & Privacy</h2>
            <p className="content-description">Manage your account security and privacy settings.</p>
            
            <div className="security-section">
              <h3>Password & Authentication</h3>
              <div className="security-item">
                <div className="security-info">
                  <h4>Change Password</h4>
                  <p>Last changed 3 months ago</p>
                </div>
                <button className="security-btn">Change Password</button>
              </div>
              
              <div className="security-item">
                <div className="security-info">
                  <h4>Two-Factor Authentication</h4>
                  <p>Add an extra layer of security to your account</p>
                </div>
                <button className="security-btn enabled">Enabled</button>
              </div>
            </div>

            <div className="privacy-section">
              <h3>Privacy Settings</h3>
              <div className="preference-item">
                <label className="checkbox-label">
                  <input type="checkbox" defaultChecked />
                  <span className="checkmark"></span>
                  Allow CarbonLens to use my data for product improvements
                </label>
              </div>
              <div className="preference-item">
                <label className="checkbox-label">
                  <input type="checkbox" />
                  <span className="checkmark"></span>
                  Receive marketing communications
                </label>
              </div>
              <div className="preference-item">
                <label className="checkbox-label">
                  <input type="checkbox" defaultChecked />
                  <span className="checkmark"></span>
                  Share anonymized usage data
                </label>
              </div>
            </div>
            
            <button className="save-btn">Update Security Settings</button>
          </div>
        );

      case 'appearance':
        return (
          <div className="settings-content">
            <h2>Appearance</h2>
            <p className="content-description">Customize the look and feel of your CarbonLens experience.</p>
            
            <div className="appearance-section">
              <h3>Theme</h3>
              <div className="theme-options">
                <div className="theme-option selected">
                  <div className="theme-preview light"></div>
                  <span>Light</span>
                </div>
                <div className="theme-option">
                  <div className="theme-preview dark"></div>
                  <span>Dark</span>
                </div>
                <div className="theme-option">
                  <div className="theme-preview auto"></div>
                  <span>Auto</span>
                </div>
              </div>
            </div>

            <div className="appearance-section">
              <h3>Dashboard Layout</h3>
              <div className="form-group">
                <label>Sidebar Position</label>
                <select defaultValue="left">
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div className="form-group">
                <label>Default Page</label>
                <select defaultValue="dashboard">
                  <option value="dashboard">Dashboard</option>
                  <option value="reports">Reports</option>
                  <option value="calculator">Calculator</option>
                </select>
              </div>
            </div>
            
            <button className="save-btn">Save Appearance Settings</button>
          </div>
        );

      default:
        return (
          <div className="settings-content">
            <h2>Settings</h2>
            <p>Select a section from the sidebar to get started.</p>
          </div>
        );
    }
  };

  return (
    <div className="settings-container">
      {/* Header */}
      <header className="settings-header">
        <div className="settings-logo">
          <img src={vectorLogo} alt="CarbonLens Logo" className="logo-svg" />
          CarbonLens
        </div>
        <nav className="settings-nav">
          <a href="/dashboard" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }} className="nav-link">Dashboard</a>
          <a href="/settings" onClick={(e) => e.preventDefault()} className="active nav-link">Settings</a>
          <a href="/help" onClick={(e) => { e.preventDefault(); navigate('/help'); }} className="nav-link">Help</a>
        </nav>
        <div className="user-menu">
          <button className="logout-btn" onClick={confirmLogout}>
            <i className="icon-logout"></i> Log Out
          </button>
          <div className="notifications">
            <i className="icon-bell"></i>
          </div>
          <div className="user-avatar">
            <i className="icon-user"></i>
          </div>
        </div>
      </header>

      {showLogoutDialog && (
        <div className="logout-dialog">
          <div>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to log out?</p>
            <div className="dialog-buttons">
              <button className="dialog-btn cancel-btn" onClick={cancelLogout}>Cancel</button>
              <button className="dialog-btn confirm-btn" onClick={handleLogout}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      <div className="settings-layout">
        {/* Sidebar */}
        <aside className="settings-sidebar">
          <nav className="sidebar-nav">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => setActiveSection(item.id)}
              >
                <span className={`nav-icon icon-${item.icon}`}></span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="settings-main">
          {renderContent()}
        </main>
      </div>

      {/* Footer */}
      <footer className="settings-footer">
        <p>© 2025 CarbonLens. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Settings; 