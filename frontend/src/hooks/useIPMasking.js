import { useState, useEffect } from 'react';

export const useIPMasking = () => {
  const [maskingEnabled, setMaskingEnabled] = useState(() => {
    // Load from localStorage or default to false
    return localStorage.getItem('ip_masking_enabled') === 'true';
  });

  const [maskingLevel, setMaskingLevel] = useState(() => {
    // Load masking level from localStorage or default to 'partial'
    return localStorage.getItem('ip_masking_level') || 'partial';
  });

  useEffect(() => {
    localStorage.setItem('ip_masking_enabled', maskingEnabled.toString());
  }, [maskingEnabled]);

  useEffect(() => {
    localStorage.setItem('ip_masking_level', maskingLevel);
  }, [maskingLevel]);

  const maskIP = (ip) => {
    if (!maskingEnabled || !ip || ip === 'unknown') {
      return ip;
    }

    switch (maskingLevel) {
      case 'full':
        return '***.***.***.**';
      
      case 'partial':
        // Keep first octet, mask the rest
        const parts = ip.split('.');
        if (parts.length === 4) {
          return `${parts[0]}.***.***.***`;
        }
        // Handle IPv6 or other formats
        if (ip.includes(':')) {
          return ip.substring(0, 4) + ':****:****:****';
        }
        return '***masked***';
      
      case 'last_octet':
        // Mask only the last octet (common for internal networks)
        const octets = ip.split('.');
        if (octets.length === 4) {
          return `${octets[0]}.${octets[1]}.${octets[2]}.***`;
        }
        return ip;
      
      case 'hash':
        // Show a consistent hash instead of IP
        const hash = simpleHash(ip);
        return `hash-${hash}`;
      
      default:
        return ip;
    }
  };

  const toggleMasking = () => {
    setMaskingEnabled(!maskingEnabled);
  };

  return {
    maskingEnabled,
    maskingLevel,
    setMaskingLevel,
    maskIP,
    toggleMasking
  };
};

// Simple hash function for consistent IP masking
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 6);
};