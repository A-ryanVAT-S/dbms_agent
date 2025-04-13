import React, { createContext, useState, useContext } from 'react';

// Create the context
const ConnectionContext = createContext(null);

// Create the provider component
export const ConnectionProvider = ({ children }) => {
  const [connectionState, setConnectionState] = useState({
    connectionId: null,
    host: '',
    port: '',
    user: '',
    database: '',
    isConnected: false,
    version: ''
  });
  
  const updateConnection = (connectionData) => {
    setConnectionState(prevState => ({
      ...prevState,
      ...connectionData
    }));
  };
  
  const resetConnection = () => {
    setConnectionState({
      connectionId: null,
      host: '',
      port: '',
      user: '',
      database: '',
      isConnected: false,
      version: ''
    });
  };
  
  return (
    <ConnectionContext.Provider 
      value={{ 
        ...connectionState, 
        updateConnection, 
        resetConnection 
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

// Create the custom hook
export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};

export default useConnection;