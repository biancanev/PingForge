import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Clock, Repeat } from 'lucide-react';
import RequestInspector from './RequestInspector';

const RequestCard = ({ request, sessionId }) => {
  const [expanded, setExpanded] = useState(false);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getMethodColor = (method) => {
    const colors = {
      GET: '#10b981',     // green
      POST: '#3b82f6',    // blue  
      PUT: '#f59e0b',     // yellow
      DELETE: '#ef4444',  // red
      PATCH: '#8b5cf6',   // purple
    };
    return colors[method] || '#6b7280';
  };

  return (
    <div className="request-card">
      <div 
        className="request-header" 
        onClick={() => setExpanded(!expanded)}
      >
        <div className="request-summary">
          <span 
            className="method-badge"
            style={{ backgroundColor: getMethodColor(request.method) }}
          >
            {request.method}
          </span>
          
          <div className="request-info">
            <span className="request-time">
              <Clock size={14} />
              {formatTime(request.timestamp)}
            </span>
            {request.ip_address && (
              <span className="request-ip">from {request.ip_address}</span>
            )}
          </div>
        </div>

        <div className="request-actions">
          <button className="expand-button">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <RequestInspector 
          request={request} 
          sessionId={sessionId}
        />
      )}
    </div>
  );
};

export default RequestCard;