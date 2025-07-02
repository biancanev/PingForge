import React, { useState } from 'react';
import { sessionAPI } from '../services/api';
import { useIPMasking } from '../hooks/useIPMasking'; // Add this import
import { Send, ExternalLink, CheckCircle, AlertCircle, Copy } from 'lucide-react';

const RequestInspector = ({ request, sessionId }) => {
  const [replayUrl, setReplayUrl] = useState('');
  const [replaying, setReplaying] = useState(false);
  const [replayResult, setReplayResult] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  
  // Add the IP masking hook
  const { maskIP } = useIPMasking();

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
            <span className="text-gray-900 font-mono">
              {maskIP(request.ip_address || 'unknown')}
            </span>
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

      {/* Headers Section */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Headers</h4>
        <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
          {request.headers && Object.keys(request.headers).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(request.headers).map(([key, value]) => (
                <div key={key} className="flex items-start space-x-3">
                  <span className="font-mono text-sm text-blue-600 min-w-0 flex-shrink-0">
                    {key}:
                  </span>
                  <span className="font-mono text-sm text-gray-900 break-all">
                    {value}
                  </span>
                  <button 
                    onClick={() => copyToClipboard(`${key}: ${value}`, `header-${key}`)}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    <Copy size={12} />
                  </button>
                  {copiedField === `header-${key}` && (
                    <span className="text-green-600 text-xs">Copied!</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No headers</p>
          )}
        </div>
      </div>

      {/* Query Parameters */}
      {request.query_params && Object.keys(request.query_params).length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Query Parameters</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-2">
              {Object.entries(request.query_params).map(([key, value]) => (
                <div key={key} className="flex items-start space-x-3">
                  <span className="font-mono text-sm text-blue-600">
                    {key}:
                  </span>
                  <span className="font-mono text-sm text-gray-900">
                    {value}
                  </span>
                  <button 
                    onClick={() => copyToClipboard(`${key}=${value}`, `param-${key}`)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Copy size={12} />
                  </button>
                  {copiedField === `param-${key}` && (
                    <span className="text-green-600 text-xs">Copied!</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Body Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900">Request Body</h4>
          {request.body && (
            <button 
              onClick={() => copyToClipboard(request.body, 'body')}
              className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 text-sm"
            >
              <Copy size={14} />
              <span>Copy</span>
              {copiedField === 'body' && <span className="text-green-600 ml-1">✓</span>}
            </button>
          )}
        </div>
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 max-h-96 overflow-auto">
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {request.body ? formatJSON(request.body) : 'No body content'}
          </pre>
        </div>
      </div>

      {/* Replay Section */}
      <div className="border-t pt-6">
        <h4 className="font-semibold text-gray-900 mb-3">Replay Request</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target URL
            </label>
            <input
              type="url"
              value={replayUrl}
              onChange={(e) => setReplayUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Quick URL suggestions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick suggestions
            </label>
            <div className="flex flex-wrap gap-2">
              {urlSuggestions.map(url => (
                <button
                  key={url}
                  onClick={() => setReplayUrl(url)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {url.replace('https://', '').split('/')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleReplay}
              disabled={!replayUrl.trim() || replaying}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} />
              <span>{replaying ? 'Replaying...' : 'Replay Request'}</span>
            </button>
            
            {replayUrl && (
              <a
                href={replayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ExternalLink size={16} />
                <span>Open URL</span>
              </a>
            )}
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
                  <CheckCircle className="text-green-600" size={20} />
                ) : (
                  <AlertCircle className="text-red-600" size={20} />
                )}
                <span className={`font-semibold ${
                  replayResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {replayResult.success ? 'Replay Successful' : 'Replay Failed'}
                </span>
              </div>
              
              {replayResult.response && (
                <div className="text-sm font-mono bg-white p-3 rounded border">
                  <pre>{JSON.stringify(replayResult.response, null, 2)}</pre>
                </div>
              )}
              
              {replayResult.error && (
                <p className="text-red-700 text-sm">{replayResult.error}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestInspector;