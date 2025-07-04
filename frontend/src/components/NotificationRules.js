import React, { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Edit, Mail } from 'lucide-react';

const NotificationRules = ({ sessionId }) => {
  const [rules, setRules] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    condition: 'status_code',
    operator: 'equals',
    value: '',
    email_recipients: [''],
    cooldown_minutes: 5
  });

  const conditionOptions = [
    { value: 'status_code', label: 'Status Code' },
    { value: 'method', label: 'HTTP Method' },
    { value: 'ip_address', label: 'IP Address' },
    { value: 'header_contains', label: 'Header Contains' },
    { value: 'body_contains', label: 'Body Contains' },
    { value: 'query_param', label: 'Query Parameter' },
    { value: 'response_time', label: 'Response Time (ms)' },
    { value: 'rate_limit', label: 'Rate Limit Exceeded' }
  ];

  const operatorOptions = {
    status_code: [
      { value: 'equals', label: 'Equals' },
      { value: 'greater_than', label: 'Greater Than' },
      { value: 'less_than', label: 'Less Than' },
      { value: 'in_list', label: 'In List' }
    ],
    method: [
      { value: 'equals', label: 'Equals' },
      { value: 'in_list', label: 'In List' }
    ],
    // ... more operators for different conditions
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('https://pingforge.onrender.com/notifications/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          ...newRule,
          session_id: sessionId,
          email_recipients: newRule.email_recipients.filter(email => email.trim())
        })
      });

      if (response.ok) {
        const rule = await response.json();
        setRules([...rules, rule]);
        setShowCreateModal(false);
        setNewRule({
          name: '',
          condition: 'status_code',
          operator: 'equals',
          value: '',
          email_recipients: [''],
          cooldown_minutes: 5
        });
      }
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  const addEmailRecipient = () => {
    setNewRule({
      ...newRule,
      email_recipients: [...newRule.email_recipients, '']
    });
  };

  const updateEmailRecipient = (index, value) => {
    const updated = [...newRule.email_recipients];
    updated[index] = value;
    setNewRule({ ...newRule, email_recipients: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          <Bell size={20} />
          <span>Notification Rules</span>
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>Add Rule</span>
        </button>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{rule.name}</h4>
                <p className="text-sm text-gray-600">
                  Alert when {rule.condition} {rule.operator} {rule.value}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Mail size={14} />
                  <span className="text-sm">{rule.email_recipients.join(', ')}</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="text-blue-600 hover:text-blue-800">
                  <Edit size={16} />
                </button>
                <button className="text-red-600 hover:text-red-800">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create Notification Rule</h3>
            
            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Rule Name</label>
                <input
                  type="text"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g., Server Error Alert"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Condition</label>
                <select
                  value={newRule.condition}
                  onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {conditionOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Operator</label>
                  <select
                    value={newRule.operator}
                    onChange={(e) => setNewRule({ ...newRule, operator: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {operatorOptions[newRule.condition]?.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Value</label>
                  <input
                    type="text"
                    value={newRule.value}
                    onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., 500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email Recipients</label>
                {newRule.email_recipients.map((email, index) => (
                  <div key={index} className="flex space-x-2 mb-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmailRecipient(index, e.target.value)}
                      className="flex-1 border rounded-lg px-3 py-2"
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addEmailRecipient}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add Email
                </button>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationRules;