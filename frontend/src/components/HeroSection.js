import React from 'react';
import { Globe } from 'lucide-react';
import WebhookCreator from './WebhookCreator';

const HeroSection = ({ onSessionCreated }) => {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6">
        <Globe className="text-white" size={40} />
      </div>
      <h2 className="text-4xl font-bold text-gray-900 mb-4">
        Debug APIs Like a Pro
      </h2>
      <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
        Generate instant webhook URLs, capture requests in real-time, inspect payloads, 
        and replay requests to your endpoints. Send custom HTTP payloads to your APIs.
        Perfect for development and testing.
      </p>
      <div className="flex justify-center">
        <WebhookCreator onSessionCreated={onSessionCreated} />
      </div>
    </div>
  );
};

export default HeroSection;