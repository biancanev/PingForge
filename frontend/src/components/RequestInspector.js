import React, { useState } from 'react';
import { sessionAPI } from '../services/api'; // Change from webhookAPI to sessionAPI
import { Send, ExternalLink, CheckCircle, AlertCircle, Copy } from 'lucide-react';

const RequestInspector = ({ request, sessionId }) => {
  const [replayUrl, setReplayUrl] = useState('');
  const [replaying, setReplaying] = useState(false);
  const [replayResult, setReplayResult] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  const formatJSON = (obj) => {
    try {
      if (typeof obj === 'string') {
        return JSON.stringify(JSON.parse(obj), null, 2);
      }
      return JSON.stringify(obj, null, 2);
    } catch {
      return obj;
    }
  };

  const copyToClipboard = async (text, fieldName) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleReplay = async () => {
    if (!replayUrl.trim()) return;
    
    setReplaying(true);
    setReplayResult(null);
    
    try {
      // Use sessionAPI instead of webhookAPI
      const result = await sessionAPI.replayRequest(sessionId, request.id, replayUrl);
      setReplayResult(result);
    } catch (error) {
      setReplayResult({ 
        success: false, 
        error: 'Failed to replay request: ' + (error.response?.data?.detail || error.message),
        error_type: 'api'
      });
    } finally {
      setReplaying(false);
    }
  };

  // Quick URL suggestions
  const urlSuggestions = [
    'https://httpbin.org/post',
    'https://webhook.site/unique-id',
    'https://requestcatcher.com/test',
    'https://pingforge.onrender.com/webhook'
  ];

  const { maskIP } = useIPMasking();

  // Rest of your component stays the same...
  return (
    <div className="p-6 space-y-6 bg-white border-t border-gray-200">
      {/* Request Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-gray-600 block">Request ID</span>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-gray-900">{request.id.substring(0, 8)}...</span>
            <button 
              onClick={() => copyToClipboard(request.id, 'id')}
              className="text-gray-400 hover:text-gray-600"
            >
              <Copy size={12} />
            </button>
            {copiedField === 'id' && <span className="text-green-600 text-xs">Copied!</span>}
          </div>
        </div>
        <div>
          <span className="text-gray-600 block">Method</span>
          <span className="font-semibold text-gray-900">{request.method}</span>
        </div>
        <div>
          <span className="text-gray-600 block">Timestamp</span>
          <span className="text-gray-900">{new Date(request.timestamp).toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-600 block">Source IP</span>
          <div className="flex items-center space-x-2">
            <span className="text-gray-900">{maskIP(request.ip_address || 'unknown')}</span>
            <button 
              onClick={() => copyToClipboard(request.ip_address || 'unknown', 'ip')}
              className="text-gray-400 hover:text-gray-600"
              title="Copy original IP"
            >
              <Copy size={12} />
            </button>
            {copiedField === 'ip' && <span className="text-green-600 text-xs">Copied!</span>}
          </div>
        </div>
      </div>

      {/* Content sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Headers */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">Headers</h4>
            <button 
              onClick={() => copyToClipboard(formatJSON(request.headers), 'headers')}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
            >
              <Copy size={12} />
              <span>Copy</span>
            </button>
          </div>
          <div className="code-block max-h-48 overflow-y-auto">
            {formatJSON(request.headers)}
          </div>
        </div>

        {/* Request Body */}
        {request.body && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Request Body</h4>
              <button 
                onClick={() => copyToClipboard(request.body, 'body')}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
              >
                <Copy size={12} />
                <span>Copy</span>
              </button>
            </div>
            <div className="code-block max-h-48 overflow-y-auto">
              {formatJSON(request.body)}
            </div>
          </div>
        )}
      </div>

      {/* Query Parameters */}
      {request.query_params && Object.keys(request.query_params).length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Query Parameters</h4>
          <div className="code-block">
            {formatJSON(request.query_params)}
          </div>
        </div>
      )}

      {/* Replay Section */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <Send className="mr-2" size={16} />
          Replay Request
        </h4>
        
        <div className="space-y-4">
          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target URL
            </label>
            <div className="flex space-x-2">
              <input
                type="url"
                placeholder="https://your-endpoint.com/webhook"
                value={replayUrl}
                onChange={(e) => setReplayUrl(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button 
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 disabled:cursor-not-allowed min-w-[120px]"
                onClick={handleReplay}
                disabled={!replayUrl.trim() || replaying}
              >
                {replaying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <ExternalLink size={16} />
                    <span>Replay</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick URL suggestions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick URLs for testing:
            </label>
            <div className="flex flex-wrap gap-2">
              {urlSuggestions.map((url) => (
                <button
                  key={url}
                  onClick={() => setReplayUrl(url)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                >
                  {url}
                </button>
              ))}
            </div>
          </div>

          {/* Replay Result */}
          {replayResult && (
            <div className={`p-4 rounded-lg border ${
              replayResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                {replayResult.success ? (
                  <CheckCircle size={16} className="text-green-600" />
                ) : (
                  <AlertCircle size={16} className="text-red-600" />
                )}
                <span className={`font-medium ${
                  replayResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {replayResult.success ? 'Replay Successful' : 'Replay Failed'}
                </span>
              </div>
              
              {replayResult.success && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-4">
                    <span className="text-green-700">Status Code:</span>
                    <span className="font-mono bg-green-100 px-2 py-1 rounded">
                      {replayResult.status_code}
                    </span>
                  </div>
                  {replayResult.response_preview && (
                    <div>
                      <span className="text-green-700 block mb-1">Response Preview:</span>
                      <div className="bg-green-100 p-2 rounded font-mono text-xs max-h-32 overflow-y-auto">
                        {replayResult.response_preview}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {!replayResult.success && (
                <div className="text-sm">
                  <span className="text-red-700 block mb-1">Error:</span>
                  <div className="bg-red-100 p-2 rounded font-mono text-xs">
                    {replayResult.error}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestInspector;