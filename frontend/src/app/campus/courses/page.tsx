'use client';

import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
    Suspense,
} from 'react';
import axios, { CancelTokenSource } from 'axios';
import { debounce } from 'lodash';
import type { Course, Instructor, SchoolKey, CourseCardProps } from '@/types';
import Loading from '@/components/Loading';
import { useSearchParams, useRouter } from 'next/navigation';

const schoolData = {
    PO: {
        name: 'Pomona',
        bgColor: 'bg-blue-400',
        buttonColor: 'bg-blue-100 text-blue-800 border-blue-300',
        textColor: 'text-blue-800',
    },
    CM: {
        name: 'Claremont McKenna',
        bgColor: 'bg-red-400',
        buttonColor: 'bg-red-100 text-red-800 border-red-300',
        textColor: 'text-red-800',
    },
    HM: {
        name: 'Harvey Mudd',
        bgColor: 'bg-yellow-300',
        buttonColor: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        textColor: 'text-yellow-800',
    },
    SC: {
        name: 'Scripps',
        bgColor: 'bg-green-200',
        buttonColor: 'bg-green-100 text-green-800 border-green-300',
        textColor: 'text-green-800',
    },
    PZ: {
        name: 'Pitzer',
        bgColor: 'bg-orange-300',
        buttonColor: 'bg-orange-100 text-orange-800 border-orange-300',
        textColor: 'text-orange-800',
    },
};

interface PaginationInfo {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

interface CoursesResponse {
    courses: Course[];
    pagination: PaginationInfo;
}

const CourseSearchComponent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSchools, setSelectedSchools] = useState<
        Record<SchoolKey, boolean>
    >({
        PO: true,
        CM: true,
        HM: true,
        SC: true,
        PZ: true,
    });
    const [results, setResults] = useState<Course[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [instructorCache, setInstructorCache] = useState<
        Record<number, Instructor>
    >({});
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);

    const instructorCacheRef = useRef(instructorCache);
    const cancelTokenSourceRef = useRef<CancelTokenSource | null>(null);

    // Get pagination params from URL
    const currentPage = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    useEffect(() => {
        instructorCacheRef.current = instructorCache;
    }, [instructorCache]);

    const fetchInstructors = useCallback(
        async (ids: number[]): Promise<void> => {
            try {
                const uncachedIds = ids.filter(
                    (id) => !instructorCacheRef.current[id]
                );

                if (uncachedIds.length === 0) return;

                // Single bulk request instead of multiple individual requests
                const response = await axios.get<Instructor[]>(
                    `${process.env.BACKEND_LINK}/api/instructors/bulk`,
                    {
                        params: { ids: uncachedIds.join(',') },
                        timeout: 5000,
                        withCredentials: true,
                    }
                );

                setInstructorCache((prev) => ({
                    ...prev,
                    ...response.data.reduce(
                        (acc, instructor) => {
                            acc[instructor.id] = instructor;
                            return acc;
                        },
                        {} as Record<number, Instructor>
                    ),
                }));
            } catch (err) {
                if (!axios.isCancel(err)) {
                    console.error('Error fetching instructors:', err);
                }
            }
        },
        []
    );

    const performSearch = useCallback(
        async (
            term: string,
            schools: Record<SchoolKey, boolean>,
            page: number,
            itemLimit: number
        ) => {
            // Don't search if term is too short
            if (!term || term.length < 2) {
                setResults([]);
                setPagination(null);
                setLoading(false);
                return;
            }
            if (cancelTokenSourceRef.current) {
                cancelTokenSourceRef.current.cancel(
                    'Operation canceled due to new request'
                );
            }

            const cleanedTerm = term.replace(/\\/g, '').trim();
            const source = axios.CancelToken.source();
            cancelTokenSourceRef.current = source;

            try {
                setLoading(true);
                setError(null);

                const activeSchools = Object.entries(schools)
                    .filter(([_, isSelected]) => isSelected)
                    .map(([school]) => school);

                const response = await axios.get<CoursesResponse>(
                    `${process.env.BACKEND_LINK}/api/courses`,
                    {
                        params: {
                            search: cleanedTerm,
                            schools: activeSchools.join(','),
                            page: page,
                            limit: itemLimit,
                        },
                        timeout: 5000,
                        cancelToken: source.token,
                        withCredentials: true,
                    }
                );

                console.log('API Response:', response.data); // Debug log

                // Handle both paginated and non-paginated responses
                let coursesData: Course[] = [];
                let paginationData: PaginationInfo | null = null;

                if (response.data) {
                    if (response.data.courses && response.data.pagination) {
                        // Paginated response
                        coursesData = response.data.courses || [];
                        paginationData = response.data.pagination;
                    } else if (Array.isArray(response.data)) {
                        // Non-paginated response (legacy)
                        coursesData = response.data;
                        paginationData = {
                            currentPage: 1,
                            totalPages: 1,
                            totalCount: coursesData.length,
                            limit: coursesData.length,
                            hasNextPage: false,
                            hasPrevPage: false,
                        };
                    } else if (response.data.courses) {
                        coursesData = response.data.courses || [];
                    }
                }

                setResults(coursesData);
                setPagination(paginationData);

                // Only fetch instructors if we have courses
                if (Array.isArray(coursesData) && coursesData.length > 0) {
                    const instructorIds = coursesData.flatMap(
                        (course) => course.all_instructor_ids || []
                    );

                    if (instructorIds.length > 0) {
                        fetchInstructors(instructorIds);
                    }
                }
            } catch (err) {
                if (axios.isCancel(err)) {
                    console.log('Request canceled:', err.message);
                    return;
                }
                console.error('Search error:', err);
                setError('Failed to fetch results. Please try again.');
                setResults([]);
                setPagination(null);
            } finally {
                setLoading(false);
            }
        },
        [fetchInstructors]
    );

    const debouncedSearch = useMemo(
        () => debounce(performSearch, 300, { leading: false, trailing: true }),
        [performSearch]
    );

    useEffect(() => {
        debouncedSearch(searchTerm, selectedSchools, currentPage, limit);

        return () => {
            debouncedSearch.cancel();
            if (cancelTokenSourceRef.current) {
                cancelTokenSourceRef.current.cancel('Component unmounted');
            }
        };
    }, [searchTerm, selectedSchools, currentPage, limit, debouncedSearch]);

    const handleSchoolToggle = (school: SchoolKey) => {
        setSelectedSchools((prev) => {
            const allSelected = Object.values(prev).every(Boolean);

            if (allSelected) {
                const newState: Record<SchoolKey, boolean> = {
                    PO: false,
                    CM: false,
                    HM: false,
                    SC: false,
                    PZ: false,
                };
                newState[school] = true;
                return newState;
            }

            const newState = {
                ...prev,
                [school]: !prev[school],
            };

            const anySelected = Object.values(newState).some(Boolean);

            if (!anySelected) {
                return { PO: true, CM: true, HM: true, SC: true, PZ: true };
            }

            return newState;
        });

        // Reset to page 1 when changing filters
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', '1');
        router.push(`/campus/courses?${params.toString()}`);
    };

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        router.push(`/campus/courses?${params.toString()}`);
    };

    const handleLimitChange = (newLimit: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', '1'); // Reset to first page when changing limit
        params.set('limit', newLimit.toString());
        router.push(`/campus/courses?${params.toString()}`);
    };

//     const sortedresults = useMemo(() => {
//     return [...results].sort((a, b) => (b.reviews_count || 0) - (a.reviews_count || 0));
// }, [results]);

    const extractSchoolCode = (code: string): SchoolKey => {
        const schoolCode = code.slice(-2) as SchoolKey;
        return schoolData[schoolCode] ? schoolCode : 'PO';
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6">
            <div className="bg-gray-50 rounded-lg shadow-md p-6 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
                    5C Course Search
                </h1>

                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="flex-1">
                        <label
                            htmlFor="search-term"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Course Name or Code
                        </label>
                        <input
                            id="search-term"
                            type="text"
                            placeholder="Search by name or code (min 2 chars)"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                // Reset to page 1 on new search
                                const params = new URLSearchParams(
                                    searchParams.toString()
                                );
                                params.set('page', '1');
                                router.push(
                                    `/campus/courses?${params.toString()}`
                                );
                            }}
                            autoComplete="off"
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Schools:
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {(Object.keys(selectedSchools) as SchoolKey[]).map(
                            (school) => (
                                <button
                                    key={school}
                                    type="button"
                                    onClick={() => handleSchoolToggle(school)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                        selectedSchools[school]
                                            ? `${schoolData[school].buttonColor} border-2 border-white shadow-md`
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border-2 border-transparent'
                                    }`}
                                >
                                    {schoolData[school].name}
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
                    <p>{error}</p>
                </div>
            )}

            <div className="space-y-4">
                {loading ? (
                    <Loading />
                ) : results.length > 0 ? (
                    <>
                        <div className="flex justify-between items-center">
                            <p className="text-white text-sm">
                                {pagination ? (
                                    <>
                                        Showing {(currentPage - 1) * limit + 1}-
                                        {Math.min(
                                            currentPage * limit,
                                            pagination.totalCount
                                        )}{' '}
                                        of {pagination.totalCount} results
                                    </>
                                ) : (
                                    <>
                                        Showing {results.length}{' '}
                                        {results.length === 1
                                            ? 'result'
                                            : 'results'}
                                    </>
                                )}
                            </p>
                            {pagination && (
                                <select
                                    value={limit}
                                    onChange={(e) =>
                                        handleLimitChange(
                                            Number(e.target.value)
                                        )
                                    }
                                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="10">10 per page</option>
                                    <option value="20">20 per page</option>
                                    <option value="50">50 per page</option>
                                    <option value="100">100 per page</option>
                                </select>
                            )}
                        </div>

                        {results.map((course) => (
                            <CourseCardComponent
                                key={course._id}
                                course={course}
                                schoolCode={extractSchoolCode(course.code)}
                                instructorCache={instructorCache}
                            />
                        ))}

                        {/* Pagination Controls */}
                        {pagination && (
                            <div className="flex justify-center items-center gap-2 mt-8 pb-4">
                                {/* Previous Button */}
                                <button
                                    onClick={() =>
                                        handlePageChange(currentPage - 1)
                                    }
                                    disabled={!pagination.hasPrevPage}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                        pagination.hasPrevPage
                                            ? 'bg-gray-700 text-white hover:bg-gray-800'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    ← Previous
                                </button>

                                {/* Page Numbers */}
                                <div className="flex gap-1">
                                    {currentPage > 2 && (
                                        <>
                                            <button
                                                onClick={() =>
                                                    handlePageChange(1)
                                                }
                                                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                                            >
                                                1
                                            </button>
                                            {currentPage > 3 && (
                                                <span className="px-2 py-2">
                                                    ...
                                                </span>
                                            )}
                                        </>
                                    )}

                                    {Array.from(
                                        { length: pagination.totalPages },
                                        (_, i) => i + 1
                                    )
                                        .filter((pageNum) => {
                                            return (
                                                pageNum >= currentPage - 1 &&
                                                pageNum <= currentPage + 1
                                            );
                                        })
                                        .map((pageNum) => (
                                            <button
                                                key={pageNum}
                                                onClick={() =>
                                                    handlePageChange(pageNum)
                                                }
                                                className={`px-3 py-2 rounded-md transition-colors text-sm ${
                                                    pageNum === currentPage
                                                        ? 'bg-gray-700 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        ))}

                                    {currentPage <
                                        pagination.totalPages - 1 && (
                                        <>
                                            {currentPage <
                                                pagination.totalPages - 2 && (
                                                <span className="px-2 py-2">
                                                    ...
                                                </span>
                                            )}
                                            <button
                                                onClick={() =>
                                                    handlePageChange(
                                                        pagination.totalPages
                                                    )
                                                }
                                                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                                            >
                                                {pagination.totalPages}
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Next Button */}
                                <button
                                    onClick={() =>
                                        handlePageChange(currentPage + 1)
                                    }
                                    disabled={!pagination.hasNextPage}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                        pagination.hasNextPage
                                            ? 'bg-gray-700 text-white hover:bg-gray-800'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    !loading &&
                    searchTerm && (
                        <div className="text-center py-8 text-gray-500">
                            No courses found matching your search criteria.
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

const CourseCardComponent = ({
    course,
    schoolCode,
    instructorCache,
}: Omit<CourseCardProps, 'onInstructorLoad'>) => {
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow relative">
            <div
                className={`${schoolData[schoolCode].bgColor} h-2 w-full`}
            ></div>

            <div className="p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-1">
                            {course.code}: {course.name}
                        </h3>
                    </div>
                    <span
                        className={`${schoolData[schoolCode].buttonColor} text-xs px-2 py-1 rounded-full border`}
                    >
                        {schoolData[schoolCode].name}
                    </span>
                </div>

                {course.description && (
                    <p className="text-gray-700 mb-4">{course.description}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {course.department_names?.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-600">
                                Departments:
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {course.department_names.map((dept, index) => (
                                    <span
                                        key={index}
                                        className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
                                    >
                                        {dept}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {course.requirement_names?.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-600">
                                Graduation Requirement:
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {course.requirement_names.map((req, index) => (
                                    <span
                                        key={index}
                                        className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
                                    >
                                        {req}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-between">
                    <div className="mb-4">
                        <p className="text-sm font-medium text-gray-600">
                            Instructors:
                        </p>
                        {course.all_instructor_ids?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1">
                                {course.all_instructor_ids
                                    .map((id) => instructorCache[id])
                                    .filter((instructor) => instructor?.name)
                                    .map((instructor) => (
                                        <div
                                            key={instructor.id}
                                            className={`${schoolData[schoolCode].bgColor} bg-opacity-20 px-2 py-1 rounded-md border ${schoolData[schoolCode].bgColor} border-opacity-30`}
                                        >
                                            <a
                                                href={`/campus/instructors/${instructor.id}`}
                                                className={`${schoolData[schoolCode].textColor} text-sm font-medium`}
                                            >
                                                {instructor.name}
                                            </a>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-4">
                        <a
                            href={`/campus/courses/${course.id}`}
                            className={`inline-block ${schoolData[schoolCode].buttonColor} px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity text-center`}
                        >
                            View {course.review_count ?? 0}{' '}
                            {course.review_count === 1 ? 'Course Review' : 'Course Reviews'}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function CourseSearchPage() {
    return (
        <Suspense fallback={<Loading />}>
            <CourseSearchComponent />
        </Suspense>
    );
}
