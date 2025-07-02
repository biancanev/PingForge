import React, { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import ActiveSession from './pages/ActiveSession';

function App() {
  const [currentSession, setCurrentSession] = useState(null);

  const handleBackToSessions = () => {
    setCurrentSession(null);
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {!currentSession ? (
          <Dashboard onSessionCreated={setCurrentSession} />
        ) : (
          <ActiveSession 
            session={currentSession} 
            onSessionCreated={setCurrentSession}
            onBack={handleBackToSessions}
          />
        )}
      </div>
    </AuthProvider>
  );
}

export default App;