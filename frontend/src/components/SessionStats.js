import React from 'react';

const SessionStats = ({ session }) => {
  if (!session) return null;

  const getLifespanDisplay = (lifespan) => {
    const displays = {
      '1h': '1 Hour',
      '24h': '24 Hours',
      '7d': '7 Days',
      '14d': '2 Weeks'
    };
    return displays[lifespan] || '24 Hours';
  };

  const hasFilters = session.filters && 
    (session.filters.allowed_ips?.length > 0 || 
     session.filters.allowed_methods?.length > 0 ||
     session.filters.blocked_ips?.length > 0);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Details</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Status</span>
          <span className="text-green-600 font-medium">Active</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Lifespan</span>
          <span className="text-gray-900 font-medium">
            {getLifespanDisplay(session.lifespan)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Filters</span>
          <span className={`font-medium ${hasFilters ? 'text-orange-600' : 'text-gray-500'}`}>
            {hasFilters ? 'Active' : 'None'}
          </span>
        </div>
        {hasFilters && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-3">
            <h5 className="font-medium text-orange-900 mb-2">Active Filters</h5>
            <div className="text-sm text-orange-800 space-y-1">
              {session.filters.allowed_methods?.length > 0 && (
                <div>Methods: {session.filters.allowed_methods.join(', ')}</div>
              )}
              {session.filters.allowed_ips?.length > 0 && (
                <div>IPs: {session.filters.allowed_ips.length} allowed</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionStats;