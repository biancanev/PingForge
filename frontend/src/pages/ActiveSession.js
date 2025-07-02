import React, { useState } from 'react';
import Header from '../components/Header';
import WebhookCreator from '../components/WebhookCreator';
import RequestDashboard from '../components/RequestDashboard';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import SessionStats from '../components/SessionStats';
import IPMaskingSettings from '../components/IPMaskingSettings';
import { useIPMasking } from '../hooks/useIPMasking';
import { BarChart3, List, Settings, ArrowLeft } from 'lucide-react';

const ActiveSession = ({ session, onSessionCreated, onBack }) => {
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  
  // Move the hook INSIDE the component function
  const { maskingEnabled, maskingLevel, setMaskingLevel, toggleMasking } = useIPMasking();

  const tabs = [
    { id: 'requests', label: 'Requests', icon: List },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const copyWebhookUrl = async () => {
    if (session?.webhook_url) {
      const url = `http://pingforge.onrender.com${session.webhook_url}`;
      await navigator.clipboard.writeText(url);
      // You could add a toast notification here
      alert('Webhook URL copied to clipboard!');
    }
  };

  return (
    <>
      <Header currentSession={session} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          {session && (
            <div className="mb-6">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <ArrowLeft size={16} />
                <span>Back to Sessions</span>
              </button>
            </div>
          )}

          {/* Session Header */}
          {session && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{session.name}</h2>
                  {session.description && (
                    <p className="text-gray-600 mt-1">{session.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>Session ID: {session.id}</span>
                    <span>•</span>
                    <span>Created: {new Date(session.created_at).toLocaleDateString()}</span>
                    {session.lifespan && (
                      <>
                        <span>•</span>
                        <span>Lifespan: {session.lifespan}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={copyWebhookUrl}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                >
                  Copy URL
                </button>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex space-x-1 mb-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {activeTab === 'requests' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="space-y-8">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Webhook URL</h3>
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <code className="text-sm font-mono text-gray-800 break-all">
                        http://pingforge.onrender.com{session?.webhook_url}
                      </code>
                    </div>
                    <button
                      onClick={copyWebhookUrl}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      Copy URL
                    </button>
                  </div>
                </div>
                <SessionStats session={session} />
              </div>
              <div className="xl:col-span-2">
                <RequestDashboard 
                  session={session} 
                  onRequestsUpdate={setRequests}
                />
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <AnalyticsDashboard requests={requests} session={session} />
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Session Settings */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Session Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Name
                    </label>
                    <input
                      type="text"
                      value={session?.name || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={session?.description || ''}
                      readOnly
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Webhook URL
                    </label>
                    <input
                      type="text"
                      value={`http://pingforge.onrender.com${session?.webhook_url}` || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Session settings are currently read-only. Contact support to modify session details.
                  </p>
                </div>
              </div>

              {/* Privacy Settings */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Privacy Settings</h2>
                <IPMaskingSettings
                  maskingEnabled={maskingEnabled}
                  maskingLevel={maskingLevel}
                  onToggleMasking={toggleMasking}
                  onMaskingLevelChange={setMaskingLevel}
                  showInline={false}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default ActiveSession;