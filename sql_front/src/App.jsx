// App.jsx with Protected Routes

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider, useAuth } from './utils/authContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/loginPage';
import MonitoringDashboard from './pages/MonitoringDashboard';
import SqlQueryTranslator from './pages/SqlQueryTranslator';
import Designer from './pages/Designer';
import QueryOptimizer from './pages/QueryOptimizer';
import QueryDetails from './components/QueryDetails';
import UserDashboard from './pages/userDashboard';
import RegisterationPage from './pages/registrationPage';

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function AppRoutes() {
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState(null);
  const { loading } = useAuth();

  const handleConnect = (details) => {
    console.log('Connecting to:', details);
    setIsConnected(true);
    setConnection(details);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterationPage />} />
        
        {/* Protected routes with navbar */}
        <Route path="/" element={
          <ProtectedRoute>
            <div>
              <Navbar />
              <div className="container mx-auto px-4 py-8">
                <MonitoringDashboard connection={connection} />
              </div>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <div>
              <Navbar />
              <div className="container mx-auto px-4 py-8">
                <UserDashboard isConnected={isConnected} onConnect={handleConnect} />
              </div>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/translator" element={
          <ProtectedRoute>
            <div>
              <Navbar />
              <div className="container mx-auto px-4 py-8">
                <SqlQueryTranslator />
              </div>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/designer" element={
          <ProtectedRoute>
            <div>
              <Navbar />
              <div className="container mx-auto px-4 py-8">
                <Designer />
              </div>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/optimizer" element={
          <ProtectedRoute>
            <div>
              <Navbar />
              <div className="container mx-auto px-4 py-8">
                <QueryOptimizer />
              </div>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/query-details" element={
          <ProtectedRoute>
            <div>
              <Navbar />
              <div className="container mx-auto px-4 py-8">
                <QueryDetails />
              </div>
            </div>
          </ProtectedRoute>
        } />
        
        {/* Catch-all route - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;