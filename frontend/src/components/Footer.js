import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center text-gray-600 text-sm">
          <p>Built with React, FastAPI, and Redis • Perfect for webhook development and testing</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;