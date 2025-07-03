import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import ActiveSession from './pages/ActiveSession';
import APITesting from './pages/APITesting';
import Help from './pages/Help';

// Your existing state-based app component
const MainApp = () => {
  const [currentView, setCurrentView] = useState('dashboard');
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
  );
};

// Main App with minimal routing
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Only route the help page */}
          <Route path="/help" element={<Help />} />
          {/* Everything else goes to your state-based app */}
          <Route path="/*" element={<MainApp />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;