import React from 'react';
import { Zap, Shield, BarChart3, Clock, Activity, Globe } from 'lucide-react';

const FeaturesGrid = () => {
  const features = [
    {
      icon: <Zap className="text-blue-600" size={32} />,
      title: "Real-time Capture",
      description: "See webhook requests appear instantly as they arrive. No polling, no delays."
    },
    {
      icon: <Shield className="text-green-600" size={32} />,
      title: "Secure Sessions", 
      description: "Each session gets a unique URL that automatically expires for security."
    },
    {
      icon: <BarChart3 className="text-purple-600" size={32} />,
      title: "Detailed Inspection",
      description: "View headers, body, query parameters, and metadata for every request."
    },
    {
      icon: <Clock className="text-orange-600" size={32} />,
      title: "Request History",
      description: "Keep track of all requests during your session with timestamps."
    },
    {
      icon: <Activity className="text-red-600" size={32} />,
      title: "Request Replay",
      description: "Forward captured requests to your actual endpoints for testing."
    },
    {
      icon: <Globe className="text-indigo-600" size={32} />,
      title: "Any HTTP Method",
      description: "Support for GET, POST, PUT, DELETE, PATCH, and any custom methods."
    }
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
      {features.map((feature, index) => (
        <FeatureCard 
          key={index}
          icon={feature.icon}
          title={feature.title}
          description={feature.description}
        />
      ))}
    </div>
  );
};

// Feature Card Component - could also be extracted to its own file later
const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-200 group">
      <div className="flex items-center space-x-3 mb-4">
        <div className="group-hover:scale-110 transition-transform duration-200">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
};

export default FeaturesGrid;