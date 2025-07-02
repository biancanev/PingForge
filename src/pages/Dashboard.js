import React, { useState } from 'react';
import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import FeaturesGrid from '../components/FeaturesGrid';
import QuickStartGuide from '../components/QuickStartGuide';
import SessionsDashboard from '../components/SessionsDashboard';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = ({ onSessionCreated }) => {
  const { isAuthenticated } = useAuth();
  const [showSessions, setShowSessions] = useState(false);

  const handleSessionSelect = (session) => {
    onSessionCreated(session);
  };

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {isAuthenticated ? (
            /* Authenticated User Dashboard */
            <div>
              {!showSessions ? (
                /* Show Hero + Sessions Button */
                <div className="text-center py-12">
                  <h2 className="text-4xl font-bold text-gray-900 mb-4">
                    Welcome back!
                  </h2>
                  <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                    Manage your webhook sessions and start debugging
                  </p>
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => setShowSessions(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-colors"
                    >
                      View My Sessions
                    </button>
                    <button
                      onClick={() => onSessionCreated(null)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold transition-colors"
                    >
                      Quick Start (Anonymous)
                    </button>
                  </div>
                </div>
              ) : (
                /* Show Sessions Dashboard */
                <div>
                  <div className="mb-6">
                    <button
                      onClick={() => setShowSessions(false)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      ← Back to Overview
                    </button>
                  </div>
                  <SessionsDashboard onSessionSelect={handleSessionSelect} />
                </div>
              )}
              
              {!showSessions && (
                <>
                  <FeaturesGrid />
                  <QuickStartGuide />
                </>
              )}
            </div>
          ) : (
            /* Non-authenticated Welcome */
            <>
              <HeroSection onSessionCreated={onSessionCreated} />
              <FeaturesGrid />
              <QuickStartGuide />
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Dashboard;