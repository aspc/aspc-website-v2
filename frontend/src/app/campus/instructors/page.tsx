"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios, { CancelTokenSource } from 'axios';
import { debounce } from 'lodash';

interface Instructor {
  id: number;
  name: string;
}

const InstructorSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelTokenSourceRef = useRef<CancelTokenSource | null>(null);

  const createCancelTokenSource = () => {
    if (cancelTokenSourceRef.current) {
      cancelTokenSourceRef.current.cancel('Operation canceled due to new request');
    }
    cancelTokenSourceRef.current = axios.CancelToken.source();
    return cancelTokenSourceRef.current;
  };

  const performSearch = useCallback(async (term: string) => {
    if (!term || term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const source = createCancelTokenSource();
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get<Instructor[]>(`${process.env.BACKEND_LINK}/api/instructors`, {
        params: {
          q: term,
          limit: 50
        },
        timeout: 5000,
        cancelToken: source.token
      });
      
      setResults(response.data);
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log('Request canceled:', err.message);
        return;
      }
      console.error('Search error:', err);
      setError('Failed to fetch results. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useMemo(
    () => debounce(performSearch, 300),
    [performSearch]
  );

  useEffect(() => {
    if (searchTerm.trim()) {
      debouncedSearch(searchTerm);
    } else {
      setResults([]);
    }
    
    return () => {
      debouncedSearch.cancel();
      cancelTokenSourceRef.current?.cancel('Component unmounted');
    };
  }, [searchTerm, debouncedSearch]);

  const filteredResults = useMemo(() => {
    return [...results].sort((a, b) => a.name.localeCompare(b.name));
  }, [results]);

  const handleViewReviews = (instructorId: number) => {
    // Implement view reviews functionality here
    console.log(`View reviews for instructor ${instructorId}`);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="bg-gray-50 rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
          Instructor Search
        </h1>
        
        <div className="flex flex-col gap-4 mb-4">
          <div>
            <label htmlFor="instructor-search" className="block text-sm font-medium text-gray-700 mb-1">
              Instructor Name
            </label>
            <input
              id="instructor-search"
              type="text"
              placeholder="Search by instructor name (min 2 chars)"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {!loading && filteredResults.length > 0 ? (
          <>
            <div className="flex justify-between items-center">
              <p className="text-gray-600 text-sm">
                Showing {filteredResults.length} {filteredResults.length === 1 ? 'instructor' : 'instructors'}
              </p>
            </div>
            
            <div className="space-y-4">
              {filteredResults.map(instructor => (
                <div key={instructor.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {instructor.name}
                  </h3>
                  <button 
                    onClick={() => handleViewReviews(instructor.id)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    View Reviews
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          !loading && searchTerm && (
            <div className="text-center py-8 text-gray-500">
                No instructors found matching {'"'}{searchTerm}{'"'}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default InstructorSearch;