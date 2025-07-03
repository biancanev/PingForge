import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import ActiveSession from './pages/ActiveSession';
import APITesting from './pages/APITesting';

function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'session', 'api-testing'
  const [currentSession, setCurrentSession] = useState(null);

  const handleSessionCreated = (session) => {
    setCurrentSession(session);
    setCurrentView('session');
  };

  const handleBackToSessions = () => {
    setCurrentSession(null);
    setCurrentView('dashboard');
  };

  const handleOpenAPITesting = () => {
    setCurrentView('api-testing');
  };

  const handleBackFromAPITesting = () => {
    setCurrentView('dashboard');
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {currentView === 'dashboard' && (
          <Dashboard 
            onSessionCreated={handleSessionCreated}
            onOpenAPITesting={handleOpenAPITesting}
          />
        )}
        
        {currentView === 'session' && (
          <ActiveSession 
            session={currentSession} 
            onSessionCreated={handleSessionCreated}
            onBack={handleBackToSessions}
          />
        )}
        
        {currentView === 'api-testing' && (
          <APITesting 
            onBack={handleBackFromAPITesting}
          />
        )}
      </div>
    </AuthProvider>
  );
}

export default App;