import React from 'react';

const QuickStartGuide = () => {
  const steps1 = [
    {
      number: "1",
      title: "Generate URL",
      description: "Click the button above to create your unique webhook endpoint"
    },
    {
      number: "2", 
      title: "Configure Service",
      description: "Add the generated URL to your webhook provider's settings"
    },
    {
      number: "3",
      title: "Monitor Requests",
      description: "Watch requests appear in real-time and inspect their contents"
    }
  ];
  const steps2 = [
    {
      number: "1",
      title: "Choose Method",
      description: "Choose an HTTP method to test your API"
    },
    {
      number: "2", 
      title: "Craft Payload",
      description: "Add your desired HTTP headers and body. Store important variables in environments"
    },
    {
      number: "3",
      title: "Test API",
      description: "Send your HTTP request and get instant results. Automate the process with collections"
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mt-16">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Quick Start Guide</h3>
      </div>
      <div className="p-6">
        <h4 className="text-lg font-semibold text-gray-900">Build Your Webhook</h4>
        <div className="grid md:grid-cols-3 gap-6">
          {steps1.map((step, index) => (
            <QuickStartStep 
              key={index}
              number={step.number}
              title={step.title}
              description={step.description}
            />
          ))}
        </div>
        <h4 className="text-lg font-semibold text-gray-900">Test Your Endpoints</h4>
        <div className="grid md:grid-cols-3 gap-6">
          {steps1.map((step, index) => (
            <QuickStartStep 
              key={index}
              number={step.number}
              title={step.title}
              description={step.description}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const QuickStartStep = ({ number, title, description }) => {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full font-bold text-lg mb-3">
        {number}
      </div>
      <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
};

export default QuickStartGuide;