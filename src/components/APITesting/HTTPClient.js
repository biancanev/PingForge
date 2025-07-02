import React, { useState, useEffect } from 'react';
import { Send, Save, Folder, Plus, ChevronDown, Eye, Code, Clock } from 'lucide-react';

const HttpClient = ({ selectedEnvironment, initialRequest, onRequestChange }) => {
  useEffect(() => {
    if (initialRequest) {
      setRequest(initialRequest);
    }
  }, [initialRequest]);
  const [request, setRequest] = useState({
    method: 'GET',
    url: '',
    headers: [{ key: '', value: '', enabled: true }],
    params: [{ key: '', value: '', enabled: true }],
    body: {
      type: 'none',
      content: ''
    },
    auth: {
      type: 'none',
      token: '',
      username: '',
      password: '',
      key: '',
      value: ''
    }
  });

  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('headers');

  // Function to replace environment variables
  const replaceEnvironmentVariables = (text) => {
    if (!selectedEnvironment || !selectedEnvironment.variables || typeof text !== 'string') {
      return text;
    }

    let result = text;
    selectedEnvironment.variables.forEach(variable => {
      if (variable.enabled) {
        const regex = new RegExp(`\\{\\{${variable.key}\\}\\}`, 'g');
        result = result.replace(regex, variable.value);
      }
    });
    return result;
  };

  const handleSendRequest = async () => {
    // Replace variables in URL before validation
    const processedUrl = replaceEnvironmentVariables(request.url);
    
    if (!processedUrl.trim()) {
      alert('Please enter a URL');
      return;
    }

    console.log('Original URL:', request.url);
    console.log('Processed URL:', processedUrl);

    setLoading(true);
    setResponse(null);

    try {
      const startTime = Date.now();
      
      // Build headers with variable replacement
      const headers = {};
      request.headers.forEach(header => {
        if (header.enabled && header.key && header.value) {
          const processedKey = replaceEnvironmentVariables(header.key);
          const processedValue = replaceEnvironmentVariables(header.value);
          headers[processedKey] = processedValue;
        }
      });

      // Add auth headers with variable replacement
      if (request.auth.type === 'bearer' && request.auth.token) {
        const processedToken = replaceEnvironmentVariables(request.auth.token);
        headers['Authorization'] = `Bearer ${processedToken}`;
      } else if (request.auth.type === 'basic' && request.auth.username && request.auth.password) {
        const processedUsername = replaceEnvironmentVariables(request.auth.username);
        const processedPassword = replaceEnvironmentVariables(request.auth.password);
        const credentials = btoa(`${processedUsername}:${processedPassword}`);
        headers['Authorization'] = `Basic ${credentials}`;
      } else if (request.auth.type === 'api-key' && request.auth.key && request.auth.value) {
        const processedKey = replaceEnvironmentVariables(request.auth.key);
        const processedValue = replaceEnvironmentVariables(request.auth.value);
        headers[processedKey] = processedValue;
      }

      // Build URL with params and variable replacement
      const url = new URL(processedUrl);
      request.params.forEach(param => {
        if (param.enabled && param.key && param.value) {
          const processedKey = replaceEnvironmentVariables(param.key);
          const processedValue = replaceEnvironmentVariables(param.value);
          url.searchParams.append(processedKey, processedValue);
        }
      });

      // Build body with variable replacement
      let body = null;
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        if (request.body.type === 'json' && request.body.content) {
          headers['Content-Type'] = 'application/json';
          body = replaceEnvironmentVariables(request.body.content);
        } else if (request.body.type === 'form' && request.body.content) {
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
          body = replaceEnvironmentVariables(request.body.content);
        } else if (request.body.type === 'raw' && request.body.content) {
          body = replaceEnvironmentVariables(request.body.content);
        }
      }

      const fetchOptions = {
        method: request.method,
        headers,
      };

      if (body) {
        fetchOptions.body = body;
      }

      console.log('Final request URL:', url.toString());
      console.log('Final headers:', headers);

      const response = await fetch(url.toString(), fetchOptions);
      const endTime = Date.now();
      
      const responseData = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        time: endTime - startTime,
        size: 0,
        body: null
      };

      // Get response body
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        responseData.body = await response.json();
        responseData.bodyType = 'json';
      } else {
        responseData.body = await response.text();
        responseData.bodyType = 'text';
        responseData.size = responseData.body.length;
      }

      setResponse(responseData);

    } catch (error) {
      setResponse({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        time: 0,
        size: 0,
        body: error.message,
        bodyType: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Rest of your existing component code (addKeyValue, updateKeyValue, etc.)
  // ... keep all the existing functions ...

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Request Builder */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-900">HTTP Client</h2>
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm">
            <Save size={14} className="inline mr-1" />
            Save Request
          </button>
        </div>

        {/* URL Bar with Variable Preview */}
        <div className="space-y-2 mb-6">
          <div className="flex space-x-2">
            <select
              value={request.method}
              onChange={(e) => setRequest(prev => ({ ...prev, method: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white min-w-[100px]"
            >
              {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
            
            <input
              type="text"
              value={request.url}
              onChange={(e) => setRequest(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://api.example.com/users or {{baseUrl}}/users/{{userId}}"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            
            <button
              onClick={handleSendRequest}
              disabled={loading || !request.url.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Send</span>
                </>
              )}
            </button>
          </div>

          {/* Variable Preview */}
          {selectedEnvironment && request.url.includes('{{') && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2">
              <div className="text-xs font-medium text-blue-800 mb-1">Preview with variables:</div>
              <div className="text-sm font-mono text-blue-700">
                {replaceEnvironmentVariables(request.url)}
              </div>
            </div>
          )}
        </div>

        {/* Rest of your existing component JSX */}
        {/* ... keep all the existing tabs and form elements ... */}
      </div>

      {/* Response Section */}
      {response && (
        <div className="border-t border-gray-200">
          {/* Response Header */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Response</h3>
              <div className="flex items-center space-x-6 text-sm">
                <span className={`font-medium ${
                  response.status >= 200 && response.status < 300 ? 'text-green-600' :
                  response.status >= 300 && response.status < 400 ? 'text-yellow-600' :
                  response.status >= 400 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {response.status} {response.statusText}
                </span>
                <span className="text-gray-600">
                  <Clock size={14} className="inline mr-1" />
                  {response.time}ms
                </span>
                <span className="text-gray-600">
                  Size: {response.size > 0 ? `${response.size} bytes` : 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Response Content */}
          <div className="p-6">
            {response.bodyType === 'error' ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-800 font-medium mb-2">Network Error</div>
                <div className="text-red-700 text-sm">{response.body}</div>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
                <pre className="text-green-400 text-sm whitespace-pre-wrap">
                  {response.bodyType === 'json' ? 
                    JSON.stringify(response.body, null, 2) : 
                    String(response.body)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HttpClient;