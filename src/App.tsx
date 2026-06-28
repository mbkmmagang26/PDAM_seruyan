import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './authContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import StaffDashboard from './pages/staff/Tasks';
import MeterReading from './pages/staff/MeterReading';
import DisconnectionFlow from './pages/staff/DisconnectionFlow';
// PERBAIKAN: Import menggunakan 'dashboard' (huruf kecil) agar tidak bentrok
import AccountingDashboard from './pages/accounting/dashboard'; 

import { TaskProvider } from './taskContext';
import { LanguageProvider } from './languageContext';
import { RequestProvider } from './requestContext';
import { ThemeProvider } from './themeContext';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
      <LanguageProvider>
      <TaskProvider>
      <RequestProvider>
        <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/accounting/*" 
            element={
              <ProtectedRoute allowedRoles={['accounting']}>
                <AccountingDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/direktur/*" 
            element={
              <ProtectedRoute allowedRoles={['direktur']}>
                <AccountingDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/staff/meter-reading" 
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <MeterReading />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/staff/disconnection/:taskId" 
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <DisconnectionFlow />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/staff/*" 
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <StaffDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
        </Router>
      </RequestProvider>
      </TaskProvider>
      </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

