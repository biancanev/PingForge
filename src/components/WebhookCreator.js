import React, { useState } from 'react';
import { webhookAPI } from '../services/api';
import { Copy, RefreshCw } from 'lucide-react';

const WebhookCreator = ({ onSessionCreated }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const createSession = async () => {
    setLoading(true);
    try {
      const newSession = await webhookAPI.createSession();
      setSession(newSession);
      onSessionCreated(newSession);
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    const url = `${window.location.origin.replace('3000', '8000')}${session.webhook_url}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="webhook-creator">
      <div className="creator-header">
        <h2>Webhook Debugger</h2>
        <p>Generate a unique URL to capture and inspect incoming webhooks</p>
      </div>

      {!session ? (
        <button 
          className="create-button"
          onClick={createSession}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="spin" size={16} />
          ) : (
            'Generate Webhook URL'
          )}
        </button>
      ) : (
        <div className="session-info">
          <div className="url-container">
            <code className="webhook-url">
              {`${window.location.origin.replace('3000', '8000')}${session.webhook_url}`}
            </code>
            <button 
              className="copy-button"
              onClick={copyToClipboard}
              title="Copy URL"
            >
              <Copy size={16} />
              {copied && <span className="copy-feedback">Copied!</span>}
            </button>
          </div>
          
          <div className="session-details">
            <span className="session-id">Session ID: {session.session_id}</span>
            <button className="new-session-button" onClick={createSession}>
              Generate New URL
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhookCreator;