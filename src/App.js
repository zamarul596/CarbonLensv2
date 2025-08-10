import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './authentication_page/Login';
import LandingPage from './landing_page/LandingPage';
import SignUp from './authentication_page/SignUp';
import SubscriptionPlans from './subcription_plan_page/SubscriptionPlans';
import Settings from './settings_page/Settings';
import Dashboard from './dashboard/Dashboard';
import ForgotPassword from './authentication_page/ForgotPassword';
import UploadData from './upload_OCR_scope1,2/upload_data';
import Scope3Page from './scope_3_page/Scope3Page';
import ReportPage from './report_page/report';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/subscription" element={<SubscriptionPlans />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/reports" element={<ReportPage />} />
      <Route path="/scope3" element={<Scope3Page />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/upload-data" element={<UploadData />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
