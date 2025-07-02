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

  const addKeyValue = (type) => {
    setRequest(prev => ({
      ...prev,
      [type]: [...prev[type], { key: '', value: '', enabled: true }]
    }));
  };

  const updateKeyValue = (type, index, field, value) => {
    setRequest(prev => ({
      ...prev,
      [type]: prev[type].map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeKeyValue = (type, index) => {
    setRequest(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const updateBodyContent = (content) => {
    setRequest(prev => ({
      ...prev,
      body: { ...prev.body, content }
    }));
  };

  const updateBodyType = (type) => {
    setRequest(prev => ({
      ...prev,
      body: { ...prev.body, type, content: '' }
    }));
  };

  const updateAuth = (field, value) => {
    setRequest(prev => ({
      ...prev,
      auth: { ...prev.auth, [field]: value }
    }));
  };

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
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex space-x-6">
            {['headers', 'params', 'body', 'auth'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {/* Headers Tab */}
          {activeTab === 'headers' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Headers</h3>
                <button
                  onClick={() => addKeyValue('headers')}
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
                >
                  <Plus size={14} />
                  <span>Add Header</span>
                </button>
              </div>
              
              {request.headers.map((header, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={header.enabled}
                    onChange={(e) => updateKeyValue('headers', index, 'enabled', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={header.key}
                    onChange={(e) => updateKeyValue('headers', index, 'key', e.target.value)}
                    placeholder="Content-Type"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                  <input
                    type="text"
                    value={header.value}
                    onChange={(e) => updateKeyValue('headers', index, 'value', e.target.value)}
                    placeholder="application/json"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                  <button
                    onClick={() => removeKeyValue('headers', index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Params Tab */}
          {activeTab === 'params' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Query Parameters</h3>
                <button
                  onClick={() => addKeyValue('params')}
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
                >
                  <Plus size={14} />
                  <span>Add Parameter</span>
                </button>
              </div>
              
              {request.params.map((param, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={param.enabled}
                    onChange={(e) => updateKeyValue('params', index, 'enabled', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={param.key}
                    onChange={(e) => updateKeyValue('params', index, 'key', e.target.value)}
                    placeholder="page"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                  <input
                    type="text"
                    value={param.value}
                    onChange={(e) => updateKeyValue('params', index, 'value', e.target.value)}
                    placeholder="1"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                  <button
                    onClick={() => removeKeyValue('params', index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Body Tab */}
          {activeTab === 'body' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <h3 className="text-sm font-medium text-gray-700">Request Body</h3>
                <select
                  value={request.body.type}
                  onChange={(e) => updateBodyType(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm bg-white"
                >
                  <option value="none">None</option>
                  <option value="json">JSON</option>
                  <option value="form">Form URL Encoded</option>
                  <option value="raw">Raw Text</option>
                </select>
              </div>

              {request.body.type !== 'none' && (
                <div>
                  <textarea
                    value={request.body.content}
                    onChange={(e) => updateBodyContent(e.target.value)}
                    placeholder={
                      request.body.type === 'json' 
                        ? '{\n  "key": "value",\n  "userId": "{{userId}}"\n}'
                        : request.body.type === 'form'
                        ? 'key1=value1&key2=value2'
                        : 'Raw text content here...'
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono"
                    rows={8}
                  />
                  {selectedEnvironment && request.body.content.includes('{{') && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                      <div className="font-medium text-blue-800 mb-1">Preview:</div>
                      <pre className="text-blue-700 whitespace-pre-wrap">
                        {replaceEnvironmentVariables(request.body.content)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Auth Tab */}
          {activeTab === 'auth' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <h3 className="text-sm font-medium text-gray-700">Authentication</h3>
                <select
                  value={request.auth.type}
                  onChange={(e) => updateAuth('type', e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm bg-white"
                >
                  <option value="none">No Auth</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                  <option value="api-key">API Key</option>
                </select>
              </div>

              {/* Bearer Token */}
              {request.auth.type === 'bearer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bearer Token
                  </label>
                  <input
                    type="text"
                    value={request.auth.token}
                    onChange={(e) => updateAuth('token', e.target.value)}
                    placeholder="{{authToken}} or your-token-here"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
              )}

              {/* Basic Auth */}
              {request.auth.type === 'basic' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={request.auth.username}
                      onChange={(e) => updateAuth('username', e.target.value)}
                      placeholder="{{username}} or your-username"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={request.auth.password}
                      onChange={(e) => updateAuth('password', e.target.value)}
                      placeholder="{{password}} or your-password"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                </div>
              )}

              {/* API Key */}
              {request.auth.type === 'api-key' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Key
                    </label>
                    <input
                      type="text"
                      value={request.auth.key}
                      onChange={(e) => updateAuth('key', e.target.value)}
                      placeholder="X-API-Key"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Value
                    </label>
                    <input
                      type="text"
                      value={request.auth.value}
                      onChange={(e) => updateAuth('value', e.target.value)}
                      placeholder="{{apiKey}} or your-api-key"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
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