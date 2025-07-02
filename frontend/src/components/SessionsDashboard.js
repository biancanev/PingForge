import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Play, Pause, Copy, Calendar, Activity, Globe, MoreVertical } from 'lucide-react';
import { sessionAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const SessionsDashboard = ({ onSessionSelect }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const userSessions = await sessionAPI.getUserSessions();
      setSessions(userSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (sessionData) => {
    try {
      const newSession = await sessionAPI.createSession(sessionData.name, sessionData.description);
      setSessions(prev => [newSession, ...prev]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to create session. Please try again.');
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session? All webhook data will be lost.')) {
      return;
    }

    try {
      await sessionAPI.deleteSession(sessionId);
      setSessions(prev => prev.filter(session => session.id !== sessionId));
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  const copyWebhookUrl = async (session) => {
    const url = `pingforge.onrender.com${session.webhook_url}`;
    await navigator.clipboard.writeText(url);
    // You could add a toast notification here
    alert('Webhook URL copied to clipboard!');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Your Webhook Sessions</h2>
            <p className="text-gray-600 mt-1">
              Manage and monitor your webhook debugging sessions
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>New Session</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Activity className="text-white" size={16} />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Sessions</p>
                <p className="text-2xl font-bold text-blue-900">{sessions.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <Globe className="text-white" size={16} />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">Active Sessions</p>
                <p className="text-2xl font-bold text-green-900">
                  {sessions.filter(s => s.is_active).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Activity className="text-white" size={16} />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">Total Requests</p>
                <p className="text-2xl font-bold text-purple-900">
                  {sessions.reduce((total, session) => total + (session.request_count || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-6"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
          <Activity className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No sessions yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first webhook session to start debugging and monitoring webhooks
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Create Your First Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onSelect={() => onSessionSelect(session)}
              onDelete={() => handleDeleteSession(session.id)}
              onCopyUrl={() => copyWebhookUrl(session)}
            />
          ))}
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <CreateSessionModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateSession}
        />
      )}
    </div>
  );
};

// Session Card Component
const SessionCard = ({ session, onSelect, onDelete, onCopyUrl }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-200">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{session.name}</h3>
            {session.description && (
              <p className="text-sm text-gray-600">{session.description}</p>
            )}
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <MoreVertical size={16} />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={() => {
                    onCopyUrl();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <Copy size={14} />
                  <span>Copy Webhook URL</span>
                </button>
                <button
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                >
                  <Trash2 size={14} />
                  <span>Delete Session</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 font-medium">Requests</p>
            <p className="text-lg font-bold text-gray-900">{session.request_count || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 font-medium">Status</p>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${session.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium text-gray-900">
                {session.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <Calendar size={12} />
            <span>{new Date(session.created_at).toLocaleDateString()}</span>
          </div>
          
          <button
            onClick={onSelect}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
          >
            <Play size={14} />
            <span>Open</span>
          </button>
        </div>
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

// Create Session Modal Component
const CreateSessionModal = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    lifespan: '24h',
    filters: {
      allowed_ips: [],
      allowed_methods: [],
      blocked_ips: []
    }
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const lifespanOptions = [
    { value: '1h', label: '1 Hour', description: 'Good for quick testing' },
    { value: '24h', label: '24 Hours', description: 'Default option' },
    { value: '7d', label: '7 Days', description: 'Extended debugging' },
    { value: '14d', label: '2 Weeks', description: 'Maximum duration' }
  ];

  const methodOptions = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Session</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Basic Settings</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., Stripe Payment Webhooks"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Lifespan
              </label>
              <div className="grid grid-cols-2 gap-3">
                {lifespanOptions.map(option => (
                  <label key={option.value} className="relative">
                    <input
                      type="radio"
                      name="lifespan"
                      value={option.value}
                      checked={formData.lifespan === option.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, lifespan: e.target.value }))}
                      className="sr-only"
                    />
                    <div className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.lifespan === option.value 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Filters</span>
              <ChevronDown className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} size={16} />
            </button>
          </div>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900">Request Filters</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allowed HTTP Methods
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {methodOptions.map(method => (
                    <label key={method} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.filters.allowed_methods.includes(method)}
                        onChange={(e) => {
                          const methods = e.target.checked
                            ? [...formData.filters.allowed_methods, method]
                            : formData.filters.allowed_methods.filter(m => m !== method);
                          setFormData(prev => ({
                            ...prev,
                            filters: { ...prev.filters, allowed_methods: methods }
                          }));
                        }}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm font-mono">{method}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to allow all methods
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allowed IP Addresses
                </label>
                <textarea
                  value={formData.filters.allowed_ips.join('\n')}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    filters: {
                      ...prev.filters,
                      allowed_ips: e.target.value.split('\n').filter(ip => ip.trim())
                    }
                  }))}
                  placeholder="192.168.1.1&#10;10.0.0.0/8&#10;Leave empty to allow all IPs"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  rows="3"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 

export default SessionsDashboard;