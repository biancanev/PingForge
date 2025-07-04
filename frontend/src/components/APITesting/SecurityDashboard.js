import React, { useState, useEffect } from 'react';
import { Shield, Clock, AlertTriangle, TrendingUp, Eye } from 'lucide-react';

const SecurityDashboard = () => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState(null);

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/security-scans', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setScans(data.scans || []);
      }
    } catch (error) {
      console.error('Failed to fetch scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (level) => {
    const colors = {
      critical: 'text-red-600',
      high: 'text-orange-600',
      medium: 'text-yellow-600',
      low: 'text-blue-600',
      info: 'text-gray-600'
    };
    return colors[level] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Shield className="text-blue-600" size={24} />
          <h2 className="text-xl font-semibold text-gray-900">Security Dashboard</h2>
        </div>
      </div>

      {scans.length === 0 ? (
        <div className="p-6 text-center">
          <Shield className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Security Scans Yet</h3>
          <p className="text-gray-600">
            Run your first security scan from the HTTP Client to see results here.
          </p>
        </div>
      ) : (
        <div className="p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <Shield className="text-blue-600 mr-3" size={20} />
                <div>
                  <div className="text-2xl font-bold text-blue-900">{scans.length}</div>
                  <div className="text-sm text-blue-700">Total Scans</div>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="text-red-600 mr-3" size={20} />
                <div>
                  <div className="text-2xl font-bold text-red-900">
                    {scans.reduce((acc, scan) => acc + (scan.critical_issues || 0), 0)}
                  </div>
                  <div className="text-sm text-red-700">Critical Issues</div>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center">
                <TrendingUp className="text-orange-600 mr-3" size={20} />
                <div>
                  <div className="text-2xl font-bold text-orange-900">
                    {scans.reduce((acc, scan) => acc + (scan.high_issues || 0), 0)}
                  </div>
                  <div className="text-sm text-orange-700">High Issues</div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="text-green-600 mr-3" size={20} />
                <div>
                  <div className="text-2xl font-bold text-green-900">
                    {scans.length > 0 ? new Date(scans[0].timestamp).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className="text-sm text-green-700">Last Scan</div>
                </div>
              </div>
            </div>
          </div>

          {/* Scan History */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Scans</h3>
            <div className="space-y-3">
              {scans.map((scan, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="font-medium text-gray-900 truncate">
                          {scan.target_url}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(scan.timestamp).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-2 text-sm">
                        <span className="text-gray-600">
                          {scan.total_findings} total findings
                        </span>
                        <span className="text-red-600">
                          {scan.critical_issues || 0} critical
                        </span>
                        <span className="text-orange-600">
                          {scan.high_issues || 0} high
                        </span>
                        <span className="text-yellow-600">
                          {scan.medium_issues || 0} medium
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setSelectedScan(scan)}
                      className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                    >
                      <Eye size={16} />
                      <span>View</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityDashboard;