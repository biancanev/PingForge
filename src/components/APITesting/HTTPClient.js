import React, { useState, useEffect } from 'react';
import { Send, Save, Folder, Plus, ChevronDown, Eye, Code, Clock } from 'lucide-react';

const HttpClient = () => {
  const [request, setRequest] = useState({
    method: 'GET',
    url: '',
    headers: [{ key: '', value: '', enabled: true }],
    params: [{ key: '', value: '', enabled: true }],
    body: {
      type: 'none', // none, json, form, raw, binary
      content: ''
    },
    auth: {
      type: 'none', // none, bearer, basic, api-key
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

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  const bodyTypes = [
    { value: 'none', label: 'None' },
    { value: 'json', label: 'JSON' },
    { value: 'form', label: 'Form Data' },
    { value: 'raw', label: 'Raw Text' }
  ];

  const handleSendRequest = async () => {
    if (!request.url.trim()) {
      alert('Please enter a URL');
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      const startTime = Date.now();
      
      // Build headers
      const headers = {};
      request.headers.forEach(header => {
        if (header.enabled && header.key && header.value) {
          headers[header.key] = header.value;
        }
      });

      // Add auth headers
      if (request.auth.type === 'bearer' && request.auth.token) {
        headers['Authorization'] = `Bearer ${request.auth.token}`;
      } else if (request.auth.type === 'basic' && request.auth.username && request.auth.password) {
        const credentials = btoa(`${request.auth.username}:${request.auth.password}`);
        headers['Authorization'] = `Basic ${credentials}`;
      } else if (request.auth.type === 'api-key' && request.auth.key && request.auth.value) {
        headers[request.auth.key] = request.auth.value;
      }

      // Build URL with params
      const url = new URL(request.url);
      request.params.forEach(param => {
        if (param.enabled && param.key && param.value) {
          url.searchParams.append(param.key, param.value);
        }
      });

      // Build body
      let body = null;
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        if (request.body.type === 'json' && request.body.content) {
          headers['Content-Type'] = 'application/json';
          body = request.body.content;
        } else if (request.body.type === 'form' && request.body.content) {
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
          body = request.body.content;
        } else if (request.body.type === 'raw' && request.body.content) {
          body = request.body.content;
        }
      }

      const fetchOptions = {
        method: request.method,
        headers,
      };

      if (body) {
        fetchOptions.body = body;
      }

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

        {/* URL Bar */}
        <div className="flex space-x-2 mb-6">
          <select
            value={request.method}
            onChange={(e) => setRequest(prev => ({ ...prev, method: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white min-w-[100px]"
          >
            {methods.map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
          
          <input
            type="url"
            value={request.url}
            onChange={(e) => setRequest(prev => ({ ...prev, url: e.target.value }))}
            placeholder="https://api.example.com/users"
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

        {/* Request Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {['headers', 'params', 'auth', 'body'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
                {((tab === 'headers' && request.headers.some(h => h.enabled && h.key)) ||
                  (tab === 'params' && request.params.some(p => p.enabled && p.key)) ||
                  (tab === 'auth' && request.auth.type !== 'none') ||
                  (tab === 'body' && request.body.type !== 'none')) && (
                  <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full inline-block"></span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Request Content */}
        <div className="mt-4">
          {activeTab === 'headers' && (
            <KeyValueEditor
              items={request.headers}
              onAdd={() => addKeyValue('headers')}
              onUpdate={(index, field, value) => updateKeyValue('headers', index, field, value)}
              onRemove={(index) => removeKeyValue('headers', index)}
              placeholder={{ key: 'Content-Type', value: 'application/json' }}
            />
          )}

          {activeTab === 'params' && (
            <KeyValueEditor
              items={request.params}
              onAdd={() => addKeyValue('params')}
              onUpdate={(index, field, value) => updateKeyValue('params', index, field, value)}
              onRemove={(index) => removeKeyValue('params', index)}
              placeholder={{ key: 'page', value: '1' }}
            />
          )}

          {activeTab === 'auth' && (
            <AuthEditor
              auth={request.auth}
              onChange={(auth) => setRequest(prev => ({ ...prev, auth }))}
            />
          )}

          {activeTab === 'body' && (
            <BodyEditor
              body={request.body}
              onChange={(body) => setRequest(prev => ({ ...prev, body }))}
              method={request.method}
            />
          )}
        </div>
      </div>

      {/* Response Section */}
      {response && (
        <ResponseViewer response={response} />
      )}
    </div>
  );
};

// Key-Value Editor Component
const KeyValueEditor = ({ items, onAdd, onUpdate, onRemove, placeholder }) => {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(e) => onUpdate(index, 'enabled', e.target.checked)}
            className="rounded"
          />
          <input
            type="text"
            value={item.key}
            onChange={(e) => onUpdate(index, 'key', e.target.value)}
            placeholder={placeholder.key}
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <input
            type="text"
            value={item.value}
            onChange={(e) => onUpdate(index, 'value', e.target.value)}
            placeholder={placeholder.value}
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <button
            onClick={() => onRemove(index)}
            className="text-red-500 hover:text-red-700 px-2 py-1"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={onAdd}
        className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
      >
        <Plus size={14} />
        <span>Add {placeholder.key.toLowerCase()}</span>
      </button>
    </div>
  );
};

// Auth Editor Component
const AuthEditor = ({ auth, onChange }) => {
  const authTypes = [
    { value: 'none', label: 'No Auth' },
    { value: 'bearer', label: 'Bearer Token' },
    { value: 'basic', label: 'Basic Auth' },
    { value: 'api-key', label: 'API Key' }
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Auth Type</label>
        <select
          value={auth.type}
          onChange={(e) => onChange({ ...auth, type: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
        >
          {authTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      {auth.type === 'bearer' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Bearer Token</label>
          <input
            type="text"
            value={auth.token}
            onChange={(e) => onChange({ ...auth, token: e.target.value })}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      )}

      {auth.type === 'basic' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={auth.username}
              onChange={(e) => onChange({ ...auth, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={auth.password}
              onChange={(e) => onChange({ ...auth, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      )}

      {auth.type === 'api-key' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Key</label>
            <input
              type="text"
              value={auth.key}
              onChange={(e) => onChange({ ...auth, key: e.target.value })}
              placeholder="X-API-Key"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Value</label>
            <input
              type="text"
              value={auth.value}
              onChange={(e) => onChange({ ...auth, value: e.target.value })}
              placeholder="your-api-key"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Body Editor Component
const BodyEditor = ({ body, onChange, method }) => {
  const bodyTypes = [
    { value: 'none', label: 'None' },
    { value: 'json', label: 'JSON' },
    { value: 'form', label: 'Form Data' },
    { value: 'raw', label: 'Raw Text' }
  ];

  if (method === 'GET' || method === 'HEAD') {
    return (
      <div className="text-gray-500 text-center py-8">
        Request body is not supported for {method} requests
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Body Type</label>
        <select
          value={body.type}
          onChange={(e) => onChange({ ...body, type: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
        >
          {bodyTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      {body.type !== 'none' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
          <textarea
            value={body.content}
            onChange={(e) => onChange({ ...body, content: e.target.value })}
            placeholder={
              body.type === 'json' ? '{\n  "key": "value"\n}' :
              body.type === 'form' ? 'key1=value1&key2=value2' :
              'Raw text content'
            }
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
          />
          {body.type === 'json' && body.content && (
            <div className="mt-2">
              <JsonValidator content={body.content} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// JSON Validator Component
const JsonValidator = ({ content }) => {
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!content.trim()) {
      setIsValid(true);
      setError('');
      return;
    }

    try {
      JSON.parse(content);
      setIsValid(true);
      setError('');
    } catch (e) {
      setIsValid(false);
      setError(e.message);
    }
  }, [content]);

  if (!content.trim()) return null;

  return (
    <div className={`text-sm ${isValid ? 'text-green-600' : 'text-red-600'}`}>
      {isValid ? '✓ Valid JSON' : `✗ Invalid JSON: ${error}`}
    </div>
  );
};

// Response Viewer Component
const ResponseViewer = ({ response }) => {
  const [activeTab, setActiveTab] = useState('body');

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 300 && status < 400) return 'text-yellow-600';
    if (status >= 400) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatJson = (obj) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return obj;
    }
  };

  return (
    <div className="border-t border-gray-200">
      {/* Response Header */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Response</h3>
          <div className="flex items-center space-x-6 text-sm">
            <span className={`font-medium ${getStatusColor(response.status)}`}>
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

        {/* Response Tabs */}
        <div className="mt-4">
          <nav className="flex space-x-6">
            {['body', 'headers'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Response Content */}
      <div className="p-6">
        {activeTab === 'body' && (
          <div>
            {response.bodyType === 'error' ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-800 font-medium mb-2">Network Error</div>
                <div className="text-red-700 text-sm">{response.body}</div>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
                <pre className="text-green-400 text-sm">
                  {response.bodyType === 'json' ? formatJson(response.body) : response.body}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="space-y-2">
            {Object.entries(response.headers).map(([key, value]) => (
              <div key={key} className="flex">
                <div className="w-1/3 font-medium text-gray-700">{key}:</div>
                <div className="w-2/3 text-gray-900 font-mono text-sm">{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HttpClient;