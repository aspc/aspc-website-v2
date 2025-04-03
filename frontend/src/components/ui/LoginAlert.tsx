'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginAlert() {
  const searchParams = useSearchParams();
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  
  useEffect(() => {
    // Check for login required parameter
    if (searchParams.get('loginRequired') === 'true') {
      setShowLoginAlert(true);
      
      // Remove the query parameter from the URL without refreshing
      const url = new URL(window.location.href);
      url.searchParams.delete('loginRequired');
      window.history.replaceState({}, '', url);
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setShowLoginAlert(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams]);
  
  if (!showLoginAlert) return null;
  
  return (
    <div className="fixed top-16 left-0 right-0 z-50 mx-auto max-w-md p-4 bg-red-100 border border-red-400 text-red-700 rounded-md shadow-md flex items-center justify-between">
      <p>You need to be logged in to access that page.</p>
      <div className="flex items-center">
        <button 
          className="text-gray-700 hover:text-red-500 font-bold"
          onClick={() => setShowLoginAlert(false)}
          aria-label="Close alert"
        >
          ✕
        </button>
      </div>
    </div>
  );
}