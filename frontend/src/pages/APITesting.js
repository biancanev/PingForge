import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import EnvironmentPanel from '../components/APITesting/EnvironmentPanel';
import CollectionsPanel from '../components/APITesting/CollectionsPanel';
import HTTPClient from '../components/APITesting/HTTPClient';
import { Folder, Settings, Code, ArrowLeft, Save } from 'lucide-react';
import { sessionAPI } from '../services/api';

const APITesting = ({ onBack }) => {
  const [activePanel, setActivePanel] = useState('none'); // 'collections', 'environments', 'none'
  const [selectedEnvironment, setSelectedEnvironment] = useState(null);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleRequestFromCollection = (requestData) => {
    // Process the request data to match HTTPClient format
    const processedRequest = {
      method: requestData.request_data.method,
      url: requestData.request_data.url, // Don't replace variables here, let HTTPClient do it
      headers: processHeaders(requestData.request_data.headers),
      params: processParams(requestData.request_data.params),
      body: requestData.request_data.body || { type: 'none', content: '' },
      auth: requestData.request_data.auth || { type: 'none' }
    };
    
    setCurrentRequest({
      ...processedRequest,
      name: requestData.name,
      collectionId: requestData.collectionId,
      requestId: requestData.requestId
    });
    setActivePanel('none'); // Hide panels when loading a request
  };

  const processHeaders = (headers) => {
    if (!headers || typeof headers !== 'object') {
      return [{ key: '', value: '', enabled: true }];
    }
    
    const headerArray = Object.entries(headers).map(([key, value]) => ({
      key: key,
      value: value,
      enabled: true
    }));
    
    return headerArray.length > 0 ? headerArray : [{ key: '', value: '', enabled: true }];
  };

  const processParams = (params) => {
    if (!params || typeof params !== 'object') {
      return [{ key: '', value: '', enabled: true }];
    }
    
    const paramArray = Object.entries(params).map(([key, value]) => ({
      key: key,
      value: value,
      enabled: true
    }));
    
    return paramArray.length > 0 ? paramArray : [{ key: '', value: '', enabled: true }];
  };

  const handleSaveRequest = async (requestData) => {
    // This will be called when user wants to save current request to a collection
    setShowSaveModal(true);
  };

  return (
    <>
      <Header />
      <main className="h-screen flex flex-col bg-gray-50">
        {/* Top Navigation */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
              )}
              <div className="flex items-center space-x-2">
                <Code className="text-blue-600" size={24} />
                <h1 className="text-2xl font-bold text-gray-900">API Testing Suite</h1>
              </div>
              {currentRequest?.name && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>•</span>
                  <span>{currentRequest.name}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {selectedEnvironment && (
                <div className="flex items-center space-x-2 bg-green-100 px-3 py-2 rounded-lg text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-800">{selectedEnvironment.name}</span>
                  <span className="text-green-600">
                    ({selectedEnvironment.variables?.filter(v => v.enabled).length || 0} vars)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActivePanel(activePanel === 'collections' ? 'none' : 'collections')}
                className={`flex-1 px-4 py-3 text-sm font-medium border-r border-gray-200 transition-colors ${
                  activePanel === 'collections'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Folder size={16} className="inline mr-2" />
                Collections
              </button>
              <button
                onClick={() => {
                  console.log('🔄 Environment tab clicked');
                  console.log('Current activePanel:', activePanel);
                  setActivePanel(activePanel === 'environments' ? 'none' : 'environments');
                }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activePanel === 'environments'
                    ? 'bg-green-50 text-green-700 border-b-2 border-green-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Settings size={16} className="inline mr-2" />
                Environments
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-hidden">
              {activePanel === 'collections' && (
                <CollectionsPanel 
                  onRequestSelect={handleRequestFromCollection}
                  selectedEnvironment={selectedEnvironment}
                />
              )}
              {activePanel === 'environments' && (
                <EnvironmentPanel
                  selectedEnvironment={selectedEnvironment}
                  onEnvironmentSelect={setSelectedEnvironment}
                />
              )}
              {activePanel === 'none' && (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center p-8">
                    <div className="flex space-x-4 mb-4">
                      <div className="text-center">
                        <Folder className="mx-auto mb-2 text-blue-400" size={32} />
                        <p className="text-sm font-medium text-blue-600">Collections</p>
                        <p className="text-xs text-gray-500">Organize requests</p>
                      </div>
                      <div className="text-center">
                        <Settings className="mx-auto mb-2 text-green-400" size={32} />
                        <p className="text-sm font-medium text-green-600">Environments</p>
                        <p className="text-xs text-gray-500">Manage variables</p>
                      </div>
                    </div>
                    <p className="text-sm">Select a tab above to get started</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* HTTP Client */}
            <div className="flex-1 p-6 overflow-y-auto">
              <EnhancedHTTPClient
                initialRequest={currentRequest}
                selectedEnvironment={selectedEnvironment}
                onRequestChange={setCurrentRequest}
                onSaveRequest={handleSaveRequest}
              />
            </div>

            {/* Environment Variables Preview */}
            {selectedEnvironment && selectedEnvironment.variables?.length > 0 && (
              <div className="border-t border-gray-200 bg-green-50 p-4">
                <h4 className="font-semibold text-green-800 mb-3 text-sm">Available Variables</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {selectedEnvironment.variables
                    .filter(variable => variable.enabled)
                    .map((variable, index) => (
                      <div key={index} className="bg-white rounded px-3 py-2 border border-green-200">
                        <div className="font-mono text-xs text-blue-600">
                          {`{{${variable.key}}}`}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {variable.value}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Request Modal */}
        {showSaveModal && (
          <SaveRequestModal
            onClose={() => setShowSaveModal(false)}
            onSave={async (saveData) => {
              try {
                // Convert the HTTPClient request format to the backend format
                const requestDataForBackend = {
                  method: currentRequest.method,
                  url: currentRequest.url,
                  headers: currentRequest.headers.reduce((acc, header) => {
                    if (header.enabled && header.key && header.value) {
                      acc[header.key] = header.value;
                    }
                    return acc;
                  }, {}),
                  params: currentRequest.params.reduce((acc, param) => {
                    if (param.enabled && param.key && param.value) {
                      acc[param.key] = param.value;
                    }
                    return acc;
                  }, {}),
                  body: currentRequest.body,
                  auth: currentRequest.auth
                };

                if (saveData.newCollection) {
                  // Create new collection first
                  const collection = await sessionAPI.createCollection({
                    name: saveData.collectionName,
                    description: saveData.collectionDescription,
                    environment_id: selectedEnvironment?.id
                  });
                  
                  // Add request to new collection
                  await sessionAPI.addRequestToCollection(collection.id, {
                    name: saveData.requestName,
                    description: saveData.requestDescription,
                    request_data: requestDataForBackend
                  });
                } else {
                  // Add to existing collection
                  await sessionAPI.addRequestToCollection(saveData.collectionId, {
                    name: saveData.requestName,
                    description: saveData.requestDescription,
                    request_data: requestDataForBackend
                  });
                }
                
                setShowSaveModal(false);
                alert('Request saved to collection successfully!');
              } catch (error) {
                console.error('Failed to save request:', error);
                alert('Failed to save request to collection');
              }
            }}
            currentRequest={currentRequest}
            selectedEnvironment={selectedEnvironment}
          />
        )}
      </main>
    </>
  );
};

// Enhanced HTTP Client wrapper that passes all the props properly
const EnhancedHTTPClient = ({ initialRequest, selectedEnvironment, onRequestChange, onSaveRequest }) => {
  return (
    <div className="space-y-6">
      {/* Pass all props to HTTPClient */}
      <HTTPClient 
        selectedEnvironment={selectedEnvironment}
        initialRequest={initialRequest}
        onRequestChange={onRequestChange}
        onSaveRequest={onSaveRequest}
      />
      
      {/* Instructions with environment-specific tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">💡 Pro Tips</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Use <code className="bg-blue-100 px-1 rounded">{`{{variableName}}`}</code> syntax in URLs, headers, and request bodies</li>
          <li>• Variables from the selected environment will be automatically replaced</li>
          <li>• Save requests to collections for easy reuse across different environments</li>
          <li>• Switch environments to test against different API endpoints</li>
          {selectedEnvironment && (
            <li>• Currently using <strong>{selectedEnvironment.name}</strong> with {selectedEnvironment.variables?.filter(v => v.enabled).length || 0} variables</li>
          )}
        </ul>
      </div>
    </div>
  );
};

// Complete SaveRequestModal Component
const SaveRequestModal = ({ onClose, onSave, currentRequest, selectedEnvironment }) => {
  const [collections, setCollections] = useState([]);
  const [formData, setFormData] = useState({
    requestName: '',
    requestDescription: '',
    collectionId: '',
    newCollection: false,
    collectionName: '',
    collectionDescription: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const data = await sessionAPI.getCollections();
      setCollections(data);
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.requestName.trim()) return;
    if (!formData.newCollection && !formData.collectionId) return;
    if (formData.newCollection && !formData.collectionName.trim()) return;

    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Request to Collection</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Request Name *
            </label>
            <input
              type="text"
              required
              value={formData.requestName}
              onChange={(e) => setFormData(prev => ({ ...prev, requestName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g., Get User Profile"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.requestDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, requestDescription: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              rows="2"
              placeholder="Describe this request..."
            />
          </div>

          {/* Collection Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Collection *</label>
            
            {/* New Collection Option */}
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="new-collection"
                name="collection-option"
                checked={formData.newCollection}
                onChange={(e) => setFormData(prev => ({ ...prev, newCollection: e.target.checked, collectionId: '' }))}
                className="text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="new-collection" className="text-sm text-gray-700">Create new collection</label>
            </div>

            {formData.newCollection && (
              <div className="ml-6 space-y-2">
                <input
                  type="text"
                  required
                  value={formData.collectionName}
                  onChange={(e) => setFormData(prev => ({ ...prev, collectionName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Collection name"
                />
                <input
                  type="text"
                  value={formData.collectionDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, collectionDescription: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Collection description (optional)"
                />
              </div>
            )}

            {/* Existing Collection Option */}
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="existing-collection"
                name="collection-option"
                checked={!formData.newCollection}
                onChange={(e) => setFormData(prev => ({ ...prev, newCollection: !e.target.checked }))}
                className="text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="existing-collection" className="text-sm text-gray-700">Add to existing collection</label>
            </div>

            {!formData.newCollection && (
              <div className="ml-6">
                <select
                  required
                  value={formData.collectionId}
                  onChange={(e) => setFormData(prev => ({ ...prev, collectionId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select a collection</option>
                  {collections.map(collection => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {selectedEnvironment && (
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <strong>Environment:</strong> {selectedEnvironment.name}
            </div>
          )}
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.requestName.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default APITesting;