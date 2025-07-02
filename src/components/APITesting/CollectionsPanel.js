import React, { useState, useEffect } from 'react';
import { Folder, Plus, Edit, Trash2, Play, Settings, ChevronRight, ChevronDown } from 'lucide-react';
import { sessionAPI } from '../../services/api';

const CollectionsPanel = ({ onRequestSelect, selectedEnvironment }) => {
  const [collections, setCollections] = useState([]);
  const [expandedCollections, setExpandedCollections] = useState(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      setLoading(true);
      const data = await sessionAPI.getCollections();
      setCollections(data);
    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async (collectionData) => {
    try {
      const newCollection = await sessionAPI.createCollection({
        ...collectionData,
        environment_id: selectedEnvironment?.id
      });
      setCollections(prev => [newCollection, ...prev]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  };

  const handleDeleteCollection = async (collectionId) => {
    if (!window.confirm('Are you sure you want to delete this collection?')) return;
    
    try {
      await sessionAPI.deleteCollection(collectionId);
      setCollections(prev => prev.filter(c => c.id !== collectionId));
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  };

  const toggleExpanded = (collectionId) => {
    const newExpanded = new Set(expandedCollections);
    if (newExpanded.has(collectionId)) {
      newExpanded.delete(collectionId);
    } else {
      newExpanded.add(collectionId);
    }
    setExpandedCollections(newExpanded);
  };

  const handleRequestClick = (collection, request) => {
    onRequestSelect({
      ...request.request_data,
      name: request.name,
      collectionId: collection.id,
      requestId: request.id
    });
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-gray-500">Loading collections...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Collections</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg"
          title="Create Collection"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Collections List */}
      <div className="flex-1 overflow-y-auto">
        {collections.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Folder className="mx-auto mb-2 text-gray-400" size={32} />
            <p className="text-sm">No collections yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-600 text-sm hover:underline mt-1"
            >
              Create your first collection
            </button>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {collections.map((collection) => (
              <CollectionItem
                key={collection.id}
                collection={collection}
                expanded={expandedCollections.has(collection.id)}
                onToggle={() => toggleExpanded(collection.id)}
                onRequestClick={handleRequestClick}
                onDelete={() => handleDeleteCollection(collection.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Collection Modal */}
      {showCreateModal && (
        <CreateCollectionModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateCollection}
          selectedEnvironment={selectedEnvironment}
        />
      )}
    </div>
  );
};

const CollectionItem = ({ collection, expanded, onToggle, onRequestClick, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Collection Header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer">
        <div className="flex items-center space-x-2 flex-1" onClick={onToggle}>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <Folder size={16} className="text-blue-600" />
          <div>
            <div className="font-medium text-gray-900">{collection.name}</div>
            {collection.description && (
              <div className="text-xs text-gray-500">{collection.description}</div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-500">
            {collection.requests?.length || 0} requests
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <Settings size={14} />
          </button>
        </div>

        {/* Menu */}
        {showMenu && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 mt-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <Trash2 size={14} />
                <span>Delete Collection</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Requests List */}
      {expanded && (
        <div className="border-t border-gray-200">
          {collection.requests?.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No requests in this collection
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {collection.requests?.map((request) => (
                <RequestItem
                  key={request.id}
                  request={request}
                  collection={collection}
                  onClick={() => onRequestClick(collection, request)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const RequestItem = ({ request, collection, onClick }) => {
  const getMethodColor = (method) => {
    const colors = {
      GET: 'bg-green-100 text-green-800',
      POST: 'bg-blue-100 text-blue-800',
      PUT: 'bg-yellow-100 text-yellow-800',
      DELETE: 'bg-red-100 text-red-800',
      PATCH: 'bg-purple-100 text-purple-800',
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div 
      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 rounded text-xs font-semibold ${getMethodColor(request.request_data.method)}`}>
          {request.request_data.method}
        </span>
        <span className="text-sm text-gray-900">{request.name}</span>
      </div>
      
      <Play size={14} className="text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

const CreateCollectionModal = ({ onClose, onCreate, selectedEnvironment }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      await onCreate(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Collection</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collection Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g., User Management API"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              rows="3"
              placeholder="Describe this collection..."
            />
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
              disabled={loading || !formData.name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Collection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CollectionsPanel;