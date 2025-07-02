import React, { useState, useEffect } from 'react';
import { Globe, Plus, Edit, Trash2, Eye, EyeOff, Save, X } from 'lucide-react';
import { sessionAPI } from '../../services/api';

const EnvironmentPanel = ({ selectedEnvironment, onEnvironmentSelect }) => {
  const [environments, setEnvironments] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEnvironments();
  }, []);

  const loadEnvironments = async () => {
    try {
      setLoading(true);
      const data = await sessionAPI.getEnvironments();
      setEnvironments(data);
    } catch (error) {
      console.error('Failed to load environments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEnvironment = async (environmentData) => {
    try {
      const newEnvironment = await sessionAPI.createEnvironment(environmentData);
      setEnvironments(prev => [newEnvironment, ...prev]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create environment:', error);
    }
  };

  const handleUpdateEnvironment = async (envId, environmentData) => {
    try {
      const updatedEnvironment = await sessionAPI.updateEnvironment(envId, environmentData);
      setEnvironments(prev => prev.map(env => 
        env.id === envId ? updatedEnvironment : env
      ));
      setEditingEnvironment(null);
    } catch (error) {
      console.error('Failed to update environment:', error);
    }
  };

  const handleDeleteEnvironment = async (envId) => {
    if (!window.confirm('Are you sure you want to delete this environment?')) return;
    
    try {
      await sessionAPI.deleteEnvironment(envId);
      setEnvironments(prev => prev.filter(env => env.id !== envId));
      if (selectedEnvironment?.id === envId) {
        onEnvironmentSelect(null);
      }
    } catch (error) {
      console.error('Failed to delete environment:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-gray-500">Loading environments...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Environments</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg"
          title="Create Environment"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Environment Selection */}
      <div className="p-4 border-b border-gray-200">
        <select
          value={selectedEnvironment?.id || ''}
          onChange={(e) => {
            const env = environments.find(env => env.id === e.target.value);
            onEnvironmentSelect(env || null);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
        >
          <option value="">No Environment</option>
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </select>
      </div>

      {/* Environments List */}
      <div className="flex-1 overflow-y-auto">
        {environments.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Globe className="mx-auto mb-2 text-gray-400" size={32} />
            <p className="text-sm">No environments yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-green-600 text-sm hover:underline mt-1"
            >
              Create your first environment
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {environments.map((env) => (
              <EnvironmentItem
                key={env.id}
                environment={env}
                isSelected={selectedEnvironment?.id === env.id}
                isEditing={editingEnvironment?.id === env.id}
                onSelect={() => onEnvironmentSelect(env)}
                onEdit={() => setEditingEnvironment(env)}
                onSave={(data) => handleUpdateEnvironment(env.id, data)}
                onCancel={() => setEditingEnvironment(null)}
                onDelete={() => handleDeleteEnvironment(env.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Environment Modal */}
      {showCreateModal && (
        <EnvironmentModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateEnvironment}
        />
      )}
    </div>
  );
};

const EnvironmentItem = ({ 
  environment, 
  isSelected, 
  isEditing, 
  onSelect, 
  onEdit, 
  onSave, 
  onCancel, 
  onDelete 
}) => {
  const [editData, setEditData] = useState({
    name: environment.name,
    description: environment.description || '',
    variables: environment.variables || []
  });
  const [showVariables, setShowVariables] = useState(false);

  const handleSave = () => {
    onSave(editData);
  };

  if (isEditing) {
    return (
      <div className="border border-green-300 rounded-lg p-4 bg-green-50">
        <div className="space-y-3">
          <input
            type="text"
            value={editData.name}
            onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Environment name"
          />
          <textarea
            value={editData.description}
            onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            rows="2"
            placeholder="Description (optional)"
          />
          
          <VariableEditor
            variables={editData.variables}
            onChange={(variables) => setEditData(prev => ({ ...prev, variables }))}
          />
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={onCancel}
              className="px-3 py-1 text-gray-600 hover:text-gray-800"
            >
              <X size={16} />
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Save size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-3 transition-colors ${
      isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
    }`}>
      <div className="flex items-center justify-between">
        <div 
          className="flex-1 cursor-pointer"
          onClick={onSelect}
        >
          <div className="flex items-center space-x-2">
            <Globe size={16} className={isSelected ? 'text-green-600' : 'text-gray-400'} />
            <div>
              <div className="font-medium text-gray-900">{environment.name}</div>
              {environment.description && (
                <div className="text-xs text-gray-500">{environment.description}</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowVariables(!showVariables)}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="View Variables"
          >
            {showVariables ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Edit Environment"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-600"
            title="Delete Environment"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {showVariables && environment.variables?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="space-y-2">
            {environment.variables.map((variable, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                {/* Fixed the template literal syntax here */}
                <span className="font-mono text-blue-600">{`{{${variable.key}}}`}</span>
                <span className="text-gray-500 truncate ml-2">{variable.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const VariableEditor = ({ variables, onChange }) => {
  const addVariable = () => {
    onChange([...variables, { key: '', value: '', enabled: true }]);
  };

  const updateVariable = (index, field, value) => {
    const updated = variables.map((variable, i) => 
      i === index ? { ...variable, [field]: value } : variable
    );
    onChange(updated);
  };

  const removeVariable = (index) => {
    onChange(variables.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Variables</label>
        <button
          type="button"
          onClick={addVariable}
          className="text-green-600 hover:text-green-700 text-sm flex items-center space-x-1"
        >
          <Plus size={14} />
          <span>Add Variable</span>
        </button>
      </div>
      
      {variables.map((variable, index) => (
        <div key={index} className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={variable.enabled}
            onChange={(e) => updateVariable(index, 'enabled', e.target.checked)}
            className="rounded"
          />
          <input
            type="text"
            value={variable.key}
            onChange={(e) => updateVariable(index, 'key', e.target.value)}
            placeholder="Variable name"
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
          />
          <input
            type="text"
            value={variable.value}
            onChange={(e) => updateVariable(index, 'value', e.target.value)}
            placeholder="Variable value"
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
          />
          <button
            onClick={() => removeVariable(index)}
            className="text-red-500 hover:text-red-700 p-1"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

const EnvironmentModal = ({ onClose, onSave, environment = null }) => {
  const [formData, setFormData] = useState({
    name: environment?.name || '',
    description: environment?.description || '',
    variables: environment?.variables || []
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {environment ? 'Edit Environment' : 'Create New Environment'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Environment Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              placeholder="e.g., Development, Staging, Production"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              rows="3"
              placeholder="Describe this environment..."
            />
          </div>

          <VariableEditor
            variables={formData.variables}
            onChange={(variables) => setFormData(prev => ({ ...prev, variables }))}
          />
          
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
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
              onClick={handleSubmit}
            >
              {loading ? 'Saving...' : 'Save Environment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnvironmentPanel;