import { createContext, useContext, useState } from 'react';
import { useAuth } from './authContext';

// Create context
const ConnectionManagerContext = createContext(null);

export const ConnectionManagerProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionId, setConnectionId] = useState(null);
  const [connectionDetails, setConnectionDetails] = useState({
    host: '',
    port: '',
    user: '',
    database: '',
    version: ''
  });

  const connectToDatabase = async (details) => {
    if (!isAuthenticated) {
      throw new Error('You must be logged in to connect to a database');
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/connection/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(details)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Connection failed');
      }

      setIsConnected(true);
      setConnectionId(data.connectionId);
      setConnectionDetails({
        host: details.host,
        port: details.port,
        user: details.user,
        database: details.database,
        version: data.version || ''
      });

      return data.connectionId;
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  };

  const disconnectDatabase = async () => {
    if (!connectionId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/connection/disconnect/${connectionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Disconnection failed');
      }

      setIsConnected(false);
      setConnectionId(null);
      setConnectionDetails({
        host: '',
        port: '',
        user: '',
        database: '',
        version: ''
      });
    } catch (error) {
      console.error('Database disconnection error:', error);
      throw error;
    }
  };

  const fetchDatabaseMetadata = async () => {
    if (!connectionId) {
      throw new Error('No active database connection');
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/connection/metadata/${connectionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch metadata');
      }

      return data;
    } catch (error) {
      console.error('Metadata fetch error:', error);
      throw error;
    }
  };

  const value = {
    isConnected,
    connectionId,
    connectionDetails,
    connectToDatabase,
    disconnectDatabase,
    fetchDatabaseMetadata
  };

  return <ConnectionManagerContext.Provider value={value}>{children}</ConnectionManagerContext.Provider>;
};

// Custom hook for using connection manager
export const useConnectionManager = () => {
  const context = useContext(ConnectionManagerContext);
  if (!context) {
    throw new Error('useConnectionManager must be used within a ConnectionManagerProvider');
  }
  return context;
};

export default useConnectionManager;