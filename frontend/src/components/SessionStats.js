import React from 'react';

const SessionStats = ({ session }) => {
  if (!session) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Stats</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Status</span>
          <span className="text-green-600 font-medium">Active</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Session ID</span>
          <span className="font-mono text-sm">{session.session_id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Created</span>
          <span className="text-gray-900">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
      
      {/* Pro Tips */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-3">💡 Pro Tips</h4>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• Use the replay feature to test your actual endpoints</li>
          <li>• Sessions auto-expire after 24 hours for security</li>
          <li>• All HTTP methods are supported</li>
          <li>• Copy the URL to use in external services</li>
        </ul>
      </div>
    </div>
  );
};

export default SessionStats;