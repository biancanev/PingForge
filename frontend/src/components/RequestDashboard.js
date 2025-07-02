import React, { useState, useEffect, useMemo } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { sessionAPI } from '../services/api';
import RequestInspector from './RequestInspector';
import IPMaskingSettings from './IPMaskingSettings';
import { useIPMasking } from '../hooks/useIPMasking';
import { 
  Activity, Wifi, WifiOff, RefreshCw, ChevronDown, ChevronRight, 
  Clock, Globe, Filter, Search, X, Calendar, EyeOff 
} from 'lucide-react';

const RequestDashboard = ({ session, onRequestsUpdate }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    methods: [],
    ips: [],
    timeRange: 'all', // 'all', '1h', '24h', '7d'
    dateFrom: '',
    dateTo: ''
  });

  // IP Masking hook
  const { maskingEnabled, maskingLevel, setMaskingLevel, maskIP, toggleMasking } = useIPMasking();

  const { messages, isConnected } = useWebSocket(session?.id);

  // Load existing requests when session changes
  useEffect(() => {
    if (session?.id) {
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

  // Filter requests based on current filter state
  const filteredRequests = useMemo(() => {
    let filtered = [...requests];

    // Text search (search in body, headers, IP)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(req =>
        (req.body && req.body.toLowerCase().includes(searchLower)) ||
        (req.ip_address && req.ip_address.toLowerCase().includes(searchLower)) ||
        (req.headers && JSON.stringify(req.headers).toLowerCase().includes(searchLower))
      );
    }

    // HTTP method filter
    if (filters.methods.length > 0) {
      filtered = filtered.filter(req => filters.methods.includes(req.method));
    }

    // IP address filter (use original IPs for filtering)
    if (filters.ips.length > 0) {
      filtered = filtered.filter(req => filters.ips.includes(req.ip_address));
    }

    // Time range filter
    if (filters.timeRange !== 'all') {
      const now = new Date();
      let cutoff;
      
      switch (filters.timeRange) {
        case '1h':
          cutoff = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoff = null;
      }
      
      if (cutoff) {
        filtered = filtered.filter(req => new Date(req.timestamp) >= cutoff);
      }
    }

    // Custom date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(req => new Date(req.timestamp) >= fromDate);
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo + 'T23:59:59');
      filtered = filtered.filter(req => new Date(req.timestamp) <= toDate);
    }

    return filtered;
  }, [requests, filters]);

  // Get unique methods and IPs for filter options (considering masking)
  const filterOptions = useMemo(() => {
    const methods = [...new Set(requests.map(r => r.method))].sort();
    const uniqueIPs = [...new Set(requests.map(r => r.ip_address))].filter(Boolean);
    
    // Create IP objects with both original and masked versions
    const ips = uniqueIPs.map(ip => ({
      original: ip,
      display: maskIP(ip),
      isMasked: maskingEnabled
    })).sort((a, b) => a.display.localeCompare(b.display));
    
    return { methods, ips };
  }, [requests, maskingEnabled, maskingLevel, maskIP]);

  // Notify parent component of requests updates
  useEffect(() => {
    if (onRequestsUpdate) {
      onRequestsUpdate(filteredRequests);
    }
  }, [filteredRequests, onRequestsUpdate]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await sessionAPI.getSessionRequests(session.id);
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      methods: [],
      ips: [],
      timeRange: 'all',
      dateFrom: '',
      dateTo: ''
    });
  };

  const hasActiveFilters = () => {
    return filters.search || 
           filters.methods.length > 0 || 
           filters.ips.length > 0 || 
           filters.timeRange !== 'all' ||
           filters.dateFrom ||
           filters.dateTo;
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.methods.length > 0) count++;
    if (filters.ips.length > 0) count++;
    if (filters.timeRange !== 'all') count++;
    if (filters.dateFrom || filters.dateTo) count++;
    return count;
  };

  const toggleMethodFilter = (method) => {
    setFilters(prev => ({
      ...prev,
      methods: prev.methods.includes(method)
        ? prev.methods.filter(m => m !== method)
        : [...prev.methods, method]
    }));
  };

  const toggleIpFilter = (originalIp) => {
    setFilters(prev => ({
      ...prev,
      ips: prev.ips.includes(originalIp)
        ? prev.ips.filter(i => i !== originalIp)
        : [...prev.ips, originalIp]
    }));
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
              {filteredRequests.length} of {requests.length} request{requests.length !== 1 ? 's' : ''}
            </span>

            {/* IP Masking Controls */}
            <IPMaskingSettings
              maskingEnabled={maskingEnabled}
              maskingLevel={maskingLevel}
              onToggleMasking={toggleMasking}
              onMaskingLevelChange={setMaskingLevel}
              showInline={true}
            />
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                hasActiveFilters() 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter size={16} />
              <span>Filter</span>
              {hasActiveFilters() && (
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  {getActiveFilterCount()}
                </span>
              )}
            </button>
            
            <button 
              onClick={loadRequests}
              disabled={loading}
              className="text-gray-500 hover:text-gray-700 p-1 rounded transition-colors"
              title="Refresh requests"
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search in requests
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search body, headers, IP..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  {filters.search && (
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Time Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Range
                </label>
                <select
                  value={filters.timeRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="all">All time</option>
                  <option value="1h">Last hour</option>
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                </select>
              </div>

              {/* Custom Date Range */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Method and IP Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              {/* HTTP Methods */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HTTP Methods ({filters.methods.length} selected)
                </label>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.methods.map(method => (
                    <button
                      key={method}
                      onClick={() => toggleMethodFilter(method)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                        filters.methods.includes(method)
                          ? `${getMethodStyle(method)} ring-2 ring-blue-500 ring-opacity-50`
                          : `${getMethodStyle(method)} hover:ring-2 hover:ring-gray-300`
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                  {filterOptions.methods.length === 0 && (
                    <span className="text-sm text-gray-500 italic">No methods captured yet</span>
                  )}
                </div>
              </div>

              {/* IP Addresses */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source IPs ({filters.ips.length} selected)
                </label>
                <div className="max-h-24 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.ips.map(ipObj => (
                      <button
                        key={ipObj.original}
                        onClick={() => toggleIpFilter(ipObj.original)}
                        className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          filters.ips.includes(ipObj.original)
                            ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500 ring-opacity-50'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title={ipObj.isMasked ? `Original: ${ipObj.original}` : ipObj.original}
                      >
                        <span className={ipObj.isMasked ? 'font-mono' : ''}>{ipObj.display}</span>
                        {ipObj.isMasked && <EyeOff size={12} />}
                      </button>
                    ))}
                    {filterOptions.ips.length === 0 && (
                      <span className="text-sm text-gray-500 italic">No IPs captured yet</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing {filteredRequests.length} of {requests.length} requests
                {hasActiveFilters() && (
                  <span className="ml-2 text-blue-600">• {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} active</span>
                )}
              </div>
              {hasActiveFilters() && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center space-x-2 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X size={16} />
                  <span>Clear all filters</span>
                </button>
              )}
            </div>
          </div>
        )}
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
        ) : filteredRequests.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Activity className="mx-auto mb-4 text-gray-400" size={48} />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {requests.length === 0 ? 'Waiting for requests...' : 'No requests match filters'}
              </h4>
              <p className="text-gray-600 mb-4">
                {requests.length === 0 
                  ? 'Send a request to your webhook URL to see it appear here'
                  : 'Try adjusting your filters to see more results'
                }
              </p>
              {requests.length === 0 && (
                <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-gray-700 mb-2">Try this PowerShell command:</p>
                  <code className="text-xs bg-gray-800 text-green-400 p-2 rounded block break-all font-mono">
                    Invoke-RestMethod -Uri "http://pingforge.onrender.com{session.webhook_url}" -Method Post -Body '{`{"test": "data"}`}' -Headers @{`{"Content-Type"="application/json"`}
                  </code>
                </div>
              )}
              {hasActiveFilters() && requests.length > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Table Layout */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 w-4"></th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 w-20">Method</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 w-32">Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 w-32">
                    <div className="flex items-center space-x-1">
                      <span>Source IP</span>
                      {maskingEnabled && <EyeOff size={12} className="text-gray-400" />}
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Body Preview</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 w-24">Headers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRequests.map((request, index) => (
                  <React.Fragment key={request.id || index}>
                    <tr 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => toggleExpanded(request.id)}
                    >
                      <td className="py-3 px-4">
                        <button className="text-gray-400 hover:text-gray-600 transition-colors">
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
                          <span className={`${maskingEnabled ? 'font-mono' : ''}`}>
                            {maskIP(request.ip_address || 'unknown')}
                          </span>
                          {maskingEnabled && (
                            <EyeOff size={12} className="text-gray-400" title="IP masked for privacy" />
                          )}
                        </div>
                      </td>
                      
                      <td className="py-3 px-4 text-sm text-gray-900">
                        <div className="font-mono text-xs bg-gray-100 rounded px-2 py-1 max-w-xs">
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
                        <td colSpan="6" className="bg-gray-50 p-0">
                          <RequestInspector 
                            request={request} 
                            sessionId={session.id}
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