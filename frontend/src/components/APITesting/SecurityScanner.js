import React, { useState } from 'react';
import { Shield, AlertTriangle, AlertCircle, Info, CheckCircle, Play, Download } from 'lucide-react';

const SecurityScanner = ({ request, onScanComplete }) => {
  const [scanResults, setScanResults] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  const severityConfig = {
    critical: { 
      icon: AlertCircle, 
      color: 'text-red-600', 
      bgColor: 'bg-red-50', 
      borderColor: 'border-red-200',
      label: 'Critical'
    },
    high: { 
      icon: AlertTriangle, 
      color: 'text-orange-600', 
      bgColor: 'bg-orange-50', 
      borderColor: 'border-orange-200',
      label: 'High'
    },
    medium: { 
      icon: AlertTriangle, 
      color: 'text-yellow-600', 
      bgColor: 'bg-yellow-50', 
      borderColor: 'border-yellow-200',
      label: 'Medium'
    },
    low: { 
      icon: Info, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-50', 
      borderColor: 'border-blue-200',
      label: 'Low'
    },
    info: { 
      icon: Info, 
      color: 'text-gray-600', 
      bgColor: 'bg-gray-50', 
      borderColor: 'border-gray-200',
      label: 'Info'
    }
  };

  const runSecurityScan = async () => {
    if (!request.url.trim()) {
      setError('Please enter a URL to scan');
      return;
    }

    setScanning(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Convert headers array to object
      const headersObj = {};
      request.headers.forEach(header => {
        if (header.enabled && header.key && header.value) {
          headersObj[header.key] = header.value;
        }
      });

      const scanRequest = {
        target_url: request.url,
        method: request.method,
        headers: headersObj,
        auth: request.auth
      };

      const response = await fetch('/api/security-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(scanRequest)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Scan failed');
      }

      const data = await response.json();
      setScanResults(data.result);
      onScanComplete && onScanComplete(data.result);
      
    } catch (error) {
      console.error('Security scan error:', error);
      setError(error.message || 'Failed to run security scan');
    } finally {
      setScanning(false);
    }
  };

  const exportResults = () => {
    if (!scanResults) return;
    
    const dataStr = JSON.stringify(scanResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `security-scan-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityIcon = (level) => {
    const config = severityConfig[level] || severityConfig.info;
    const IconComponent = config.icon;
    return <IconComponent size={16} className={config.color} />;
  };

  const getSeverityBadge = (level) => {
    const config = severityConfig[level] || severityConfig.info;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}>
        {getSeverityIcon(level)}
        <span className="ml-1">{config.label}</span>
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Security Scanner</h2>
          </div>
          
          <div className="flex space-x-2">
            {scanResults && (
              <button
                onClick={exportResults}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
              >
                <Download size={14} />
                <span>Export</span>
              </button>
            )}
            
            <button
              onClick={runSecurityScan}
              disabled={scanning || !request.url.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Play size={14} />
              <span>{scanning ? 'Scanning...' : 'Run Security Scan'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}
      </div>

      {/* Scan Progress */}
      {scanning && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">
              Running comprehensive security tests...
            </span>
          </div>
          
          <div className="mt-3 bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse w-1/3"></div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {scanResults && (
        <div className="p-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{scanResults.total_findings}</div>
              <div className="text-sm text-gray-600">Total Issues</div>
            </div>
            
            {Object.entries(scanResults.findings_by_level).map(([level, count]) => (
              <div key={level} className="text-center">
                <div className={`text-2xl font-bold ${severityConfig[level]?.color || 'text-gray-900'}`}>
                  {count}
                </div>
                <div className="text-sm text-gray-600 capitalize">{level}</div>
              </div>
            ))}
          </div>

          {/* Scan Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Target:</span>
                <div className="text-gray-600 break-all">{scanResults.target_url}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Scan Duration:</span>
                <div className="text-gray-600">{scanResults.scan_duration.toFixed(2)}s</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Timestamp:</span>
                <div className="text-gray-600">{scanResults.scan_timestamp}</div>
              </div>
            </div>
          </div>

          {/* Findings List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Security Findings</h3>
            
            {scanResults.findings.length === 0 ? (
                             <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
               <CheckCircle className="text-green-600" size={20} />
               <div>
                 <div className="font-medium text-green-800">No Security Issues Found</div>
                 <div className="text-sm text-green-700">
                   Great! The security scan didn't detect any obvious vulnerabilities.
                 </div>
               </div>
             </div>
           ) : (
             <div className="space-y-3">
               {scanResults.findings.map((finding, index) => (
                 <SecurityFinding key={index} finding={finding} />
               ))}
             </div>
           )}
         </div>
       </div>
     )}
   </div>
 );
};

const SecurityFinding = ({ finding }) => {
 const [expanded, setExpanded] = useState(false);
 
 const severityConfig = {
   critical: { 
     icon: AlertCircle, 
     color: 'text-red-600', 
     bgColor: 'bg-red-50', 
     borderColor: 'border-red-200',
     label: 'Critical'
   },
   high: { 
     icon: AlertTriangle, 
     color: 'text-orange-600', 
     bgColor: 'bg-orange-50', 
     borderColor: 'border-orange-200',
     label: 'High'
   },
   medium: { 
     icon: AlertTriangle, 
     color: 'text-yellow-600', 
     bgColor: 'bg-yellow-50', 
     borderColor: 'border-yellow-200',
     label: 'Medium'
   },
   low: { 
     icon: Info, 
     color: 'text-blue-600', 
     bgColor: 'bg-blue-50', 
     borderColor: 'border-blue-200',
     label: 'Low'
   },
   info: { 
     icon: Info, 
     color: 'text-gray-600', 
     bgColor: 'bg-gray-50', 
     borderColor: 'border-gray-200',
     label: 'Info'
   }
 };

 const config = severityConfig[finding.level] || severityConfig.info;
 const IconComponent = config.icon;

 return (
   <div className={`border rounded-lg ${config.borderColor} ${config.bgColor}`}>
     <div 
       className="p-4 cursor-pointer"
       onClick={() => setExpanded(!expanded)}
     >
       <div className="flex items-start justify-between">
         <div className="flex items-start space-x-3 flex-1">
           <IconComponent size={20} className={config.color} />
           <div className="flex-1">
             <div className="flex items-center space-x-2 mb-1">
               <h4 className="font-medium text-gray-900">{finding.title}</h4>
               <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}>
                 {config.label}
               </span>
               {finding.cwe_id && (
                 <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                   {finding.cwe_id}
                 </span>
               )}
             </div>
             <p className="text-sm text-gray-600">{finding.description}</p>
           </div>
         </div>
         
         <button className="text-gray-400 hover:text-gray-600 ml-2">
           <svg 
             className={`w-4 h-4 transform transition-transform ${expanded ? 'rotate-180' : ''}`}
             fill="none" 
             stroke="currentColor" 
             viewBox="0 0 24 24"
           >
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
           </svg>
         </button>
       </div>
     </div>

     {expanded && (
       <div className="px-4 pb-4 border-t border-gray-200">
         <div className="space-y-3 mt-3">
           {finding.evidence && (
             <div>
               <h5 className="font-medium text-gray-900 mb-1">Evidence</h5>
               <div className="bg-gray-900 rounded p-3 text-sm">
                 <code className="text-green-400">{finding.evidence}</code>
               </div>
             </div>
           )}
           
           {finding.payload_used && (
             <div>
               <h5 className="font-medium text-gray-900 mb-1">Payload Used</h5>
               <div className="bg-gray-900 rounded p-3 text-sm">
                 <code className="text-yellow-400">{finding.payload_used}</code>
               </div>
             </div>
           )}

           {finding.response_time && (
             <div>
               <h5 className="font-medium text-gray-900 mb-1">Response Time</h5>
               <div className="text-sm text-gray-600">{finding.response_time.toFixed(2)}s</div>
             </div>
           )}

           <div>
             <h5 className="font-medium text-gray-900 mb-1">Recommendation</h5>
             <div className="text-sm text-gray-700 bg-white rounded p-3 border">
               {finding.recommendation}
             </div>
           </div>
         </div>
       </div>
     )}
   </div>
 );
};

export default SecurityScanner;