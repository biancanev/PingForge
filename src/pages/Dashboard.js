import React, { useState } from 'react';
import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import FeaturesGrid from '../components/FeaturesGrid';
import QuickStartGuide from '../components/QuickStartGuide';
import SessionsDashboard from '../components/SessionsDashboard';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import { Code } from 'lucide-react';

const Dashboard = ({ onSessionCreated, onOpenAPITesting }) => {
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
                /* Show Hero + Action Buttons */
                <div className="text-center py-12">
                  <h2 className="text-4xl font-bold text-gray-900 mb-4">
                    Welcome back!
                  </h2>
                  <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                    Choose your tool: Debug webhooks or test APIs
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {/* Webhook Sessions Card */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-shadow">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Webhook Debugging</h3>
                        <p className="text-gray-600 mb-6">Capture and inspect incoming webhooks in real-time</p>
                        <button
                          onClick={() => setShowSessions(true)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                          Manage Sessions
                        </button>
                      </div>
                    </div>

                    {/* API Testing Card */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-shadow">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                          <Code className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">API Testing Suite</h3>
                        <p className="text-gray-600 mb-6">Test APIs with collections and environment management</p>
                        <button
                          onClick={onOpenAPITesting}
                          className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                          Open API Testing
                        </button>
                      </div>
                    </div>
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