import React from 'react';
import Header from '../components/Header';
import { ArrowLeft, MessageCircle, Book, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Help = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium mb-6"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-8">Help & Documentation</h1>
          
          {/* Add your help content here */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <MessageCircle className="text-blue-600 mb-4" size={32} />
              <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
              <p className="text-gray-600">Learn how to create and monitor webhook endpoints.</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <Book className="text-green-600 mb-4" size={32} />
              <h2 className="text-xl font-semibold mb-4">API Documentation</h2>
              <p className="text-gray-600">Complete API reference and testing guides.</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default Help;