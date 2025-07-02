import React from 'react';
import { Eye, EyeOff, Shield, Info } from 'lucide-react';

const IPMaskingSettings = ({ 
  maskingEnabled, 
  maskingLevel, 
  onToggleMasking, 
  onMaskingLevelChange,
  showInline = false 
}) => {
  const maskingLevels = [
    {
      value: 'partial',
      label: 'Partial',
      description: 'Show first octet only (192.***.***.***)',
      example: '192.***.***.***'
    },
    {
      value: 'last_octet',
      label: 'Last Octet',
      description: 'Hide only last octet (192.168.1.***)',
      example: '192.168.1.***'
    },
    {
      value: 'full',
      label: 'Full',
      description: 'Hide entire IP address',
      example: '***.***.***.**'
    },
    {
      value: 'hash',
      label: 'Hash',
      description: 'Show consistent hash instead',
      example: 'hash-a1b2c3'
    }
  ];

  if (showInline) {
    return (
      <div className="flex items-center space-x-4">
        <button
          onClick={onToggleMasking}
          className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            maskingEnabled
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title={maskingEnabled ? 'IP masking enabled' : 'IP masking disabled'}
        >
          {maskingEnabled ? <EyeOff size={16} /> : <Eye size={16} />}
          <span>IPs</span>
        </button>

        {maskingEnabled && (
          <select
            value={maskingLevel}
            onChange={(e) => onMaskingLevelChange(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {maskingLevels.map(level => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Shield className="text-blue-600" size={20} />
          <h4 className="font-semibold text-gray-900">IP Address Privacy</h4>
        </div>
        
        <button
          onClick={onToggleMasking}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            maskingEnabled ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              maskingEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Protect visitor privacy by masking IP addresses in the interface. 
        The original data is still captured for debugging purposes.
      </p>

      {maskingEnabled && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Masking Level
          </label>
          
          <div className="space-y-2">
            {maskingLevels.map(level => (
              <label key={level.value} className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="maskingLevel"
                  value={level.value}
                  checked={maskingLevel === level.value}
                  onChange={(e) => onMaskingLevelChange(e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {level.label}
                    </span>
                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {level.example}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{level.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-start space-x-2">
          <Info className="text-blue-600 mt-0.5" size={16} />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Privacy Note</p>
            <p>IP masking only affects the display. Original IP addresses are still stored for technical debugging and can be viewed by toggling this setting.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IPMaskingSettings;