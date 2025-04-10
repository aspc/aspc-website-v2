"use client"

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { debounce } from 'lodash';

interface InstructorReference {
  id: number;
  name: string;
}

interface Course {
  _id: string;
  id: number;
  code: string;
  code_slug: string;
  name: string;
  created_at: string;
  updated_at: string;
  department_names: string[];
  requirement_codes: string[];
  requirement_names: string[];
  term_keys: string[];
  description: string;
  all_instructor_ids: InstructorReference[] | number[];
}

type SchoolKey = 'PO' | 'CM' | 'HM' | 'SC' | 'PZ';

const schoolColors = {
  'PO': 'bg-blue-100 text-blue-800 border-blue-300', // Pomona
  'CM': 'bg-red-100 text-red-800 border-red-300',    // Claremont McKenna
  'HM': 'bg-yellow-100 text-yellow-800 border-yellow-300', // Harvey Mudd
  'SC': 'bg-green-100 text-green-800 border-green-300',    // Scripps
  'PZ': 'bg-orange-100 text-orange-800 border-orange-300'  // Pitzer
};

const schoolNames = {   
  'PO': 'Pomona',
  'CM': 'Claremont McKenna',
  'HM': 'Harvey Mudd',
  'SC': 'Scripps',
  'PZ': 'Pitzer'
};

const CourseSearchComponent = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [courseNumber, setCourseNumber] = useState('');
  const [selectedSchools, setSelectedSchools] = useState<Record<SchoolKey, boolean>>({
    'PO': true,
    'CM': true,
    'HM': true,
    'SC': true,
    'PZ': true
  });
  const [results, setResults] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof Course>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Memoized function to fetch instructors
  const fetchInstructors = useCallback(async (instructorIds: number[]) => {
    try {
      // Filter out invalid IDs and skip if no valid IDs
      const validIds = instructorIds.filter(id => Number.isInteger(id) && id > 0);
      if (validIds.length === 0) return [];
  
      const responses = await Promise.all(
        validIds.map(id => 
          axios.get<{id: number, name: string}>(`/api/instructors/${id}`, {
            timeout: 2000
          }).catch(() => ({ data: { id, name: 'Unknown Instructor' } }))
        )
      );
      return responses.map(res => res.data);
    } catch (err) {
      console.error('Error fetching instructors:', err);
      return instructorIds.map(id => ({ id, name: 'Unknown Instructor' }));
    }
  }, []);

  // Debounced search function with optimizations
  const performSearch = useCallback(async (term: string, number: string, schools: Record<SchoolKey, boolean>) => {
    try {
        setLoading(true);
        setError(null);
        
        const activeSchools = Object.entries(schools)
            .filter(([_, isSelected]) => isSelected)
            .map(([school]) => school);
        
        const response = await axios.get<Course[]>(`${process.env.BACKEND_LINK}/api/courses`, {
            params: {
                search: term,
                number: number,
                schools: activeSchools.join(',')
            },
            timeout: 5000
        });
        
        // Only fetch instructors if we have results
        if (response.data.length > 0) {
            const coursesWithInstructors = await Promise.all(
                response.data.map(async (course) => {
                    if (course.all_instructor_ids?.length > 0) {
                        const instructorIds = course.all_instructor_ids.map(instructor => 
                            typeof instructor === 'number' ? instructor : instructor.id
                        );
                        const instructors = await fetchInstructors(instructorIds);
                        return { ...course, all_instructor_ids: instructors };
                    }
                    return course;
                })
            );
            setResults(coursesWithInstructors);
        } else {
            setResults([]);
        }
    } catch (err) {
        console.error('Search error:', err);
        setError('Failed to fetch results. Please try again.');
        setResults([]);
    } finally {
        setLoading(false);
    }
}, [fetchInstructors]);

  // Debounce the search function (300ms delay)
  const debouncedSearch = useCallback(
    debounce(performSearch, 300),
    [performSearch]
  );

  // Trigger search when inputs change
  useEffect(() => {
    if (searchTerm || courseNumber) {
      debouncedSearch(searchTerm, courseNumber, selectedSchools);
    } else {
      setResults([]);
    }

    return () => debouncedSearch.cancel();
  }, [searchTerm, courseNumber, selectedSchools, debouncedSearch]);

  const handleSchoolToggle = (school: SchoolKey) => {
    setSelectedSchools(prev => ({
      ...prev,
      [school]: !prev[school]
    }));
  };

  const handleSort = (field: keyof Course) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    if (Array.isArray(aValue)) {
      const aString = aValue.join(', ');
      const bString = Array.isArray(bValue) ? bValue.join(', ') : '';
      return sortDirection === 'asc' 
        ? aString.localeCompare(bString) 
        : bString.localeCompare(aString);
    }
    
    return 0;
  });

  const extractSchoolCode = (code: string) => {
    // Extract last 2 characters of the code (e.g., "HM" from "POST188HM")
    const matches = code.match(/([A-Z]{2})$/);
    return matches ? matches[1] as SchoolKey : 'PO';
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="bg-gray-50 rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
          5C Course Search
        </h1>
        
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label htmlFor="search-term" className="block text-sm font-medium text-gray-700 mb-1">
              Course Name
            </label>
            <input
              id="search-term"
              type="text"
              placeholder="Search courses..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1">
            <label htmlFor="course-number" className="block text-sm font-medium text-gray-700 mb-1">
              Course Number (without school suffix)
            </label>
            <input
              id="course-number"
              type="text"
              placeholder="e.g., POST188"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={courseNumber}
              onChange={(e) => setCourseNumber(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Schools:</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(selectedSchools) as SchoolKey[]).map((school) => (
              <button
                key={school}
                type="button"
                onClick={() => handleSchoolToggle(school)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedSchools[school]
                    ? `${schoolColors[school].split(' ')[0]} text-white`
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {schoolNames[school]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {sortedResults.length > 0 ? (
          <>
            <div className="flex justify-between items-center">
              <p className="text-gray-600 text-sm">
                Showing {sortedResults.length} {sortedResults.length === 1 ? 'result' : 'results'}
              </p>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Sort by:</span>
                <select 
                  className="border rounded px-2 py-1 text-sm"
                  value={sortField}
                  onChange={(e) => handleSort(e.target.value as keyof Course)}
                >
                  <option value="name">Name</option>
                  <option value="code">Code</option>
                  <option value="id">ID</option>
                  <option value="created_at">Created Date</option>
                </select>
                <button 
                  className="px-2 py-1 bg-gray-200 rounded text-sm"
                  onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
            
            {sortedResults.map(course => (
              <CourseCard 
                key={course._id} 
                course={course} 
                schoolCode={extractSchoolCode(course.code)}
              />
            ))}
          </>
        ) : (
          !loading && (searchTerm || courseNumber) && (
            <div className="text-center py-8 text-gray-500">
              No courses found matching your search criteria.
            </div>
          )
        )}
      </div>
    </div>
  );
};

const CourseCard = React.memo(({ 
  course,
  schoolCode
}: {
  course: Course,
  schoolCode: SchoolKey
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">
              {course.code}: {course.name.trim()}
            </h3>
          </div>
          <span className={`${schoolColors[schoolCode]} text-xs px-2 py-1 rounded-full border`}>
            {schoolNames[schoolCode]}
          </span>
        </div>
        
        {course.description && (
          <p className="text-gray-700 mb-4">{course.description}</p>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {course.department_names?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-600">Departments:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {course.department_names.map((dept, index) => (
                  <span key={index} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                    {dept}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {course.requirement_names?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-600">Graduation Requirement:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {course.requirement_names.map((req, index) => (
                  <span key={index} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                    {req}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {course.all_instructor_ids?.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-600">Previous instructors:</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {course.all_instructor_ids.map((instructor, index) => {
                const name = typeof instructor === 'number' 
                  ? 'Unknown Instructor' 
                  : instructor.name;
                return (
                  <span key={index} className="text-blue-600 hover:text-blue-800 text-sm">
                    {name}
                  </span>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            View Details
          </button>
        </div>
      </div>
    </div>
  );
});

export default CourseSearchComponent;