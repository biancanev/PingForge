import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { sessionAPI } from '../services/api'; // Change from webhookAPI to sessionAPI
import RequestInspector from './RequestInspector';
import { Activity, Wifi, WifiOff, RefreshCw, ChevronDown, ChevronRight, Clock, Globe } from 'lucide-react';

const RequestDashboard = ({ session, onRequestsUpdate }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRequest, setExpandedRequest] = useState(null);
  const { messages, isConnected } = useWebSocket(session?.id); // Use session.id instead of session.session_id

  // Load existing requests when session changes
  useEffect(() => {
    if (session?.id) { // Change from session_id to id
      loadRequests();
    } else {
      setRequests([]);
    }
  }, [session]);

  // Add new real-time messages
  useEffect(() => {
    if (messages.length > 0) {
      setRequests(prev => [messages[0], ...prev]);
    }
  }, [messages]);

  // Notify parent component of requests updates
  useEffect(() => {
    if (onRequestsUpdate) {
      onRequestsUpdate(requests);
    }
  }, [requests, onRequestsUpdate]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      // Use the new session API endpoint
      const data = await sessionAPI.getSessionRequests(session.id);
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getMethodStyle = (method) => {
    const styles = {
      GET: 'bg-green-100 text-green-800 border-green-200',
      POST: 'bg-blue-100 text-blue-800 border-blue-200',
      PUT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      DELETE: 'bg-red-100 text-red-800 border-red-200',
      PATCH: 'bg-purple-100 text-purple-800 border-purple-200',
    };
    return styles[method] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const toggleExpanded = (requestId) => {
    setExpandedRequest(expandedRequest === requestId ? null : requestId);
  };

  if (!session) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-[600px] flex items-center justify-center">
        <div className="text-center">
          <Activity className="mx-auto mb-4 text-gray-400" size={64} />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Session</h3>
          <p className="text-gray-600">
            Create a webhook URL to start capturing requests
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Incoming Requests
            </h3>
            
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-700 font-medium">Live</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-red-700 font-medium">Disconnected</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {requests.length} request{requests.length !== 1 ? 's' : ''}
            </span>
            
            <button 
              onClick={loadRequests}
              disabled={loading}
              className="text-gray-500 hover:text-gray-700 p-1 rounded"
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="h-[500px] overflow-y-auto">
        {loading && requests.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="mx-auto mb-2 text-gray-400 animate-spin" size={32} />
              <p className="text-gray-600">Loading requests...</p>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Activity className="mx-auto mb-4 text-gray-400" size={48} />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Waiting for requests...
              </h4>
              <p className="text-gray-600 mb-4">
                Send a request to your webhook URL to see it appear here
              </p>
              <div className="bg-gray-50 rounded-lg p-4 max-w-md">
                <p className="text-sm text-gray-700 mb-2">Try this PowerShell command:</p>
                <code className="text-xs bg-gray-800 text-green-400 p-2 rounded block break-all">
                  Invoke-RestMethod -Uri "http://pingforge.onrender.com{session.webhook_url}" -Method Post -Body '{`{"test": "data"}`}' -Headers @{`{"Content-Type"="application/json"`}
                </code>
              </div>
            </div>
          </div>
        ) : (
          /* Table Layout */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 w-4"></th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 w-20">Method</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 w-32">Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 w-32">Source IP</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Body Preview</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 w-24">Headers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.map((request, index) => (
                  <React.Fragment key={request.id || index}>
                    <tr 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => toggleExpanded(request.id)}
                    >
                      <td className="py-3 px-4">
                        <button className="text-gray-400 hover:text-gray-600">
                          {expandedRequest === request.id ? 
                            <ChevronDown size={16} /> : 
                            <ChevronRight size={16} />
                          }
                        </button>
                      </td>
                      
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${getMethodStyle(request.method)}`}>
                          {request.method}
                        </span>
                      </td>
                      
                      <td className="py-3 px-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Clock size={12} />
                          <span>{formatTime(request.timestamp)}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDate(request.timestamp)}
                        </div>
                      </td>
                      
                      <td className="py-3 px-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Globe size={12} />
                          <span>{request.ip_address || 'unknown'}</span>
                        </div>
                      </td>
                      
                      <td className="py-3 px-4 text-sm text-gray-900">
                        <div className="font-mono text-xs bg-gray-100 rounded px-2 py-1">
                          {truncateText(request.body)}
                        </div>
                      </td>
                      
                      <td className="py-3 px-4 text-sm text-gray-600">
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                          {Object.keys(request.headers || {}).length} headers
                        </span>
                      </td>
                    </tr>
                    
                    {expandedRequest === request.id && (
                      <tr>
                        <td colSpan="6" className="bg-gray-50">
                          <RequestInspector 
                            request={request} 
                            sessionId={session.id} // Use session.id instead of session.session_id
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestDashboard;