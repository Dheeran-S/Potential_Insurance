import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import NewClaimPage from './pages/customer/NewClaimPage';
import ApproverDashboard from './pages/approver/ApproverDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Chatbot from './components/Chatbot';
import { UserRole } from './types';
import './index.css';

function App() {
  return (
    <HashRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          
          <Route 
            path="/customer/dashboard" 
            element={
              <ProtectedRoute roles={[UserRole.CUSTOMER]}>
                <CustomerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customer/new-claim" 
            element={
              <ProtectedRoute roles={[UserRole.CUSTOMER]}>
                <NewClaimPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/approver/dashboard" 
            element={
              <ProtectedRoute roles={[UserRole.APPROVER]}>
                <ApproverDashboard />
              </ProtectedRoute>
            } 
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <Chatbot />
      </AppProvider>
    </HashRouter>
  );
}

export default App;
