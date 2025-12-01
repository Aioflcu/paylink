import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import themeService from './services/themeService';
import Login from './pages/Login';
import Register from './pages/Register';
import OTPVerification from './pages/OTPVerification';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Wallet from './pages/Wallet';
import TransactionHistory from './pages/TransactionHistory';
import Savings from './pages/Savings';
import Airtime from './pages/Airtime';
import Data from './pages/Data';
import Electricity from './pages/Electricity';
import CableTV from './pages/CableTV';
import Internet from './pages/Internet';
import Insurance from './pages/Insurance';
import Giftcard from './pages/Giftcard';
import Tax from './pages/Tax';
import TransactionPIN from './pages/TransactionPIN';
import SetPIN from './pages/SetPIN';
import Success from './pages/Success';
import Receipts from './pages/Receipts';
import Analytics from './pages/Analytics';
import Rewards from './pages/Rewards';
import Referrals from './pages/Referrals';
import SecurityAlerts from './pages/SecurityAlerts';
import FailedTransactions from './pages/FailedTransactions';
import LoginHistory from './pages/LoginHistory';
import AutoTopup from './pages/AutoTopup';
import Biometrics from './pages/Biometrics';
import BulkPurchase from './pages/BulkPurchase';
import NotificationCenter from './pages/NotificationCenter';
import WalletTransfer from './pages/WalletTransfer';
import Beneficiaries from './pages/Beneficiaries';
import SplitBills from './pages/SplitBills';
import SupportTickets from './pages/SupportTickets';
import VirtualCard from './pages/VirtualCard';
import AdminDashboard from './pages/AdminDashboard';
import DeveloperAPI from './pages/DeveloperAPI';
import SecuritySettings from './pages/SecuritySettings';
import DeviceManagement from './pages/DeviceManagement';
import './App.css';

function App() {
  useEffect(() => {
    // Initialize theme on app mount
    themeService.initializeTheme();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/otp-verification" element={<OTPVerification />} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route path="/wallet" element={<PrivateRoute><Wallet /></PrivateRoute>} />
              <Route path="/transactions" element={<PrivateRoute><TransactionHistory /></PrivateRoute>} />
              <Route path="/savings" element={<PrivateRoute><Savings /></PrivateRoute>} />
              <Route path="/airtime" element={<PrivateRoute><Airtime /></PrivateRoute>} />
              <Route path="/data" element={<PrivateRoute><Data /></PrivateRoute>} />
              <Route path="/electricity" element={<PrivateRoute><Electricity /></PrivateRoute>} />
              <Route path="/cabletv" element={<PrivateRoute><CableTV /></PrivateRoute>} />
                <Route path="/internet" element={<PrivateRoute><Internet /></PrivateRoute>} />
              <Route path="/insurance" element={<PrivateRoute><Insurance /></PrivateRoute>} />
              <Route path="/giftcard" element={<PrivateRoute><Giftcard /></PrivateRoute>} />
              <Route path="/tax" element={<PrivateRoute><Tax /></PrivateRoute>} />
              <Route path="/pin" element={<PrivateRoute><TransactionPIN /></PrivateRoute>} />
              <Route path="/set-pin" element={<PrivateRoute><SetPIN /></PrivateRoute>} />
              <Route path="/security-settings" element={<PrivateRoute><SecuritySettings /></PrivateRoute>} />
              <Route path="/device-management" element={<PrivateRoute><DeviceManagement /></PrivateRoute>} />
              <Route path="/success" element={<PrivateRoute><Success /></PrivateRoute>} />
              <Route path="/receipts" element={<PrivateRoute><Receipts /></PrivateRoute>} />
              <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
              <Route path="/rewards" element={<PrivateRoute><Rewards /></PrivateRoute>} />
              <Route path="/referrals" element={<PrivateRoute><Referrals /></PrivateRoute>} />
              <Route path="/security-alerts" element={<PrivateRoute><SecurityAlerts /></PrivateRoute>} />
              <Route path="/failed-transactions" element={<PrivateRoute><FailedTransactions /></PrivateRoute>} />
              <Route path="/login-history" element={<PrivateRoute><LoginHistory /></PrivateRoute>} />
              <Route path="/auto-topup" element={<PrivateRoute><AutoTopup /></PrivateRoute>} />
              <Route path="/biometrics" element={<PrivateRoute><Biometrics /></PrivateRoute>} />
              <Route path="/bulk-purchase" element={<PrivateRoute><BulkPurchase /></PrivateRoute>} />
              <Route path="/notifications" element={<PrivateRoute><NotificationCenter /></PrivateRoute>} />
              <Route path="/wallet-transfer" element={<PrivateRoute><WalletTransfer /></PrivateRoute>} />
              <Route path="/beneficiaries" element={<PrivateRoute><Beneficiaries /></PrivateRoute>} />
              <Route path="/split-bills" element={<PrivateRoute><SplitBills /></PrivateRoute>} />
              <Route path="/support-tickets" element={<PrivateRoute><SupportTickets /></PrivateRoute>} />
              <Route path="/virtual-card" element={<PrivateRoute><VirtualCard /></PrivateRoute>} />
              <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
              <Route path="/developer-api" element={<PrivateRoute><DeveloperAPI /></PrivateRoute>} />
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return currentUser ? children : <Navigate to="/login" />;
}

export default App;
