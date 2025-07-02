import React from 'react';

const PingForgeLogo = (
    variant = 'full', // 'full', 'icon', 'text'
    size = 'md', // 'sm', 'md', 'lg', 'xl'
    animated = true,
    className = ''
) => {
    const sizes = {
    sm: { width: 24, height: 24, text: 'text-lg' },
    md: { width: 32, height: 32, text: 'text-xl' },
    lg: { width: 40, height: 40, text: 'text-2xl' },
    xl: { width: 48, height: 48, text: 'text-3xl' }
    };

    const currentSize = sizes[size];
    const IconSVG = () => (
        <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="5" width="110" height="110" fill="#61dbfb" rx="8"/>

        <circle cx="60" cy="60" r="45" fill="none" stroke="#F9FAFB" stroke-width="3"/>
        
        <circle cx="60" cy="60" r="35" fill="#F9FAFB" stroke="#6B7280" stroke-width="1"/>
        
        <text x="95" y="65" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#6B7280">GET</text>
        <text x="60" y="100" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#6B7280">POST</text>
        <text x="25" y="65" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#6B7280">PUT</text>
        
        <path d="M 60 35 L 65 60 L 60 85 L 55 60 Z" fill="#EF4444"/>
        <path d="M 60 35 L 55 60 L 60 45 Z" fill="#DC2626"/>
        
        <circle cx="60" cy="60" r="4" fill="#374151"/>
        <circle cx="60" cy="60" r="2" fill="#F9FAFB"/>
        
        
        <line x1="60" y1="20" x2="60" y2="25" stroke="#4F46E5" stroke-width="2"/>
        <line x1="100" y1="60" x2="95" y2="60" stroke="#6B7280" stroke-width="1"/>
        <line x1="60" y1="100" x2="60" y2="95" stroke="#6B7280" stroke-width="1"/>
        <line x1="20" y1="60" x2="25" y2="60" stroke="#6B7280" stroke-width="1"/>
        
        <circle cx="60" cy="30" r="8" fill="none" stroke="#10B981" stroke-width="2" opacity="0.6">
            <animate attributeName="r" values="8;15" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.6;0" dur="2s" repeatCount="indefinite"/>
        </circle>
        <text x="60" y="25" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="bold" fill="#4F46E5">PingForge</text>
        </svg>
    );

    const SimpleIconSVG = IconSVG;

    return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {size === 'sm' ? <SimpleIconSVG /> : <IconSVG />}
    </div>
  );
};

export default PingForgeLogo;