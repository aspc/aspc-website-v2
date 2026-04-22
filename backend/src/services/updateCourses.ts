import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { Courses } from '../models/Courses';

dotenv.config();

interface SyncSummary {
    termKey: string;
    timestamp: string;
    coursesCreated: number;
    coursesUpdated: number;
    coursesSkipped: number;
    uniqueCourses: number;
    errors: number;
    errorDetails: string[];
}

// Interface for API Response
interface APIInstructor {
    EmailAddress: string | null;
    Name: string;
    CxID: number;
}

interface APISchedule {
    BuildingCode: string | null;
    Building: string;
    Campus: string;
    MeetTime: string;
    Room: string;
    Weekdays: string;
}

interface APICourse {
    Catalog: string;
    CourseCode: string;
    CourseStatus: string;
    Credits: string;
    Department: string;
    Description: string;
    GradingStyle: string;
    Instructors: APIInstructor[];
    Name: string;
    Note: string;
    PermCount: number | null;
    PrimaryAssociation: string;
    Requisites: string;
    Schedules: APISchedule[];
    SeatsFilled: number | null;
    SeatsTotal: number | null;
    Session: string;
    SubSession: string;
    Year: string;
}

interface APICourseArea {
    Code: string;
    Description: string;
}

// Global mappings - separate for departments and requirements
let departmentMap: Map<string, string> = new Map();
let requirementMap: Map<string, string> = new Map();

// Fetch department/course area mappings and separate into departments vs requirements
async function fetchDepartmentMappings(apiKey: string): Promise<void> {
    try {
        const response = await axios.get(
            'https://jicsweb.pomona.edu/api/CourseAreas',
            {
                headers: {
                    'Authorization-Token': apiKey,
                },
            }
        );

        const courseAreas: APICourseArea[] = response.data;

        // Separate departments from requirements based on first character
        courseAreas.forEach((area) => {
            if (area.Code && area.Code.length > 0) {
                if (/^\d/.test(area.Code)) {
                    // Starts with number - it's a requirement
                    requirementMap.set(area.Code, area.Description);
                } else {
                    // Starts with letter - it's a department
                    departmentMap.set(area.Code, area.Description);
                }
            }
        });

        console.log(`Loaded ${departmentMap.size} department mappings`);
        console.log(`Loaded ${requirementMap.size} requirement mappings`);
    } catch (error: any) {
        console.error('Error fetching department mappings:', error.message);
        throw error;
    }
}

// Fetch courses for a specific course area (could be department or requirement)
async function fetchCoursesForArea(
    termKey: string,
    courseArea: string,
    apiKey: string
): Promise<APICourse[]> {
    try {
        const encodedTerm = encodeURIComponent(termKey);
        const encodedArea = encodeURIComponent(courseArea);
        const url = `https://jicsweb.pomona.edu/api/Courses/${encodedTerm}/${encodedArea}`;

        const isRequirement = /^\d/.test(courseArea);

        console.log(
            `  Fetching ${isRequirement ? 'requirement' : 'department'} ${courseArea}...`
        );

        const response = await axios.get(url, {
            headers: {
                'Authorization-Token': apiKey,
            },
        });

        const courses: APICourse[] = response.data;
        console.log(`    ✓ Found ${courses.length} courses`);

        return courses;
    } catch (error: any) {
        if (error.response) {
            if (error.response.status === 404) {
                console.log(`    ⚠ No courses found for ${courseArea}`);
            } else {
                console.log(
                    `    ⚠ Error ${error.response.status} for ${courseArea}`
                );
            }
        } else {
            console.log(
                `    ⚠ Error fetching ${courseArea}: ${error.message}`
            );
        }
        return [];
    }
}

// Fetch all courses from both departments and requirements
async function fetchAllCoursesFromAPI(
    termKey: string,
    apiKey: string
): Promise<{ course: APICourse; sourceArea: string }[]> {
    try {
        const allCoursesWithSource: {
            course: APICourse;
            sourceArea: string;
        }[] = [];

        const allAreaCodes = [
            ...Array.from(departmentMap.keys()),
            ...Array.from(requirementMap.keys()),
        ];

        console.log(
            `\nFetching courses from ${departmentMap.size} departments and ${requirementMap.size} requirements...`
        );

        let successfulAreas = 0;
        let failedAreas = 0;

        for (const areaCode of allAreaCodes) {
            const courses = await fetchCoursesForArea(
                termKey,
                areaCode,
                apiKey
            );

            if (courses.length > 0) {
                courses.forEach((course) => {
                    allCoursesWithSource.push({ course, sourceArea: areaCode });
                });
                successfulAreas++;
            } else {
                failedAreas++;
            }

            // Small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        console.log(`\n=== Fetch Summary ===`);
        console.log(`Successful areas: ${successfulAreas}`);
        console.log(`Failed/empty areas: ${failedAreas}`);
        console.log(`Total course entries: ${allCoursesWithSource.length}`);

        return allCoursesWithSource;
    } catch (error: any) {
        console.error('Error fetching all courses:', error.message);
        throw error;
    }
}

// Helper function to strip section number from course code and normalize spacing
function stripSectionNumber(courseCode: string): string {
    // 1. Remove section suffix (e.g., "-01", "-02")
    const base = courseCode.replace(/-[0-9A-Z]+$/, '').trim();
    // 2. Normalize internal whitespace to single spaces
    return base.replace(/\s+/g, ' ');
}

// Helper function to generate code_slug from code
function generateCodeSlug(code: string): string {
    // Standardize format to DEPTNUM-SCHOOL (e.g., "ANTH087-SC")
    // to match migration refactor-course-slug.ts
    const cleanCode = code.replace(/\s+/g, '').toUpperCase();
    const schoolMatch = cleanCode.match(/^(.+?)([A-Z]{2})$/);

    if (schoolMatch) {
        const [, baseCode, schoolCode] = schoolMatch;
        return `${baseCode}-${schoolCode}`;
    }

    return cleanCode;
}

// Helper function to get the next available ID
async function getNextCourseId(): Promise<number> {
    const maxCourse = await Courses.findOne().sort({ id: -1 }).exec();
    return maxCourse ? maxCourse.id + 1 : 1;
}

// Helper function to extract department code from course code
function extractDepartmentCode(courseCode: string): string {
    const match = courseCode.match(/^([A-Z]+)/);
    return match ? match[1] : '';
}

// Helper function to get department names from department code
function getDepartmentNames(deptCode: string): string[] {
    if (!deptCode) return [];

    const deptName = departmentMap.get(deptCode);
    if (deptName) return [deptName];

    return [deptCode];
}

// Main function to process courses with source tracking
async function updateCoursesFromAPI(
    coursesWithSource: { course: APICourse; sourceArea: string }[],
    termKey: string
): Promise<SyncSummary> {
    const summary: SyncSummary = {
        termKey,
        timestamp: new Date().toISOString(),
        coursesCreated: 0,
        coursesUpdated: 0,
        coursesSkipped: 0,
        uniqueCourses: 0,
        errors: 0,
        errorDetails: [],
    };

    try {
        const processedCourses: Set<string> = new Set();

        for (const { course: apiCourse, sourceArea } of coursesWithSource) {
            try {
                const courseCode = stripSectionNumber(apiCourse.CourseCode);
                const courseCodeSlug = generateCodeSlug(courseCode);

                const isRequirement = /^\d/.test(sourceArea);

                // Extract instructor CxIDs from API payload
                const instructorCxids = [
                    ...new Set(
                        apiCourse.Instructors?.map((i) => i.CxID).filter(
                            (id) => id != null && !isNaN(id)
                        ) || []
                    ),
                ];

                let existingCourse = await Courses.findOne({
                    $or: [{ code_slug: courseCodeSlug }, { code: courseCode }],
                });

                if (existingCourse) {
                    let updated = false;

                    if (existingCourse.code_slug !== courseCodeSlug) {
                        existingCourse.code_slug = courseCodeSlug;
                        updated = true;
                    }

                    if (existingCourse.code !== courseCode) {
                        existingCourse.code = courseCode;
                        updated = true;
                    }

                    if (!existingCourse.term_keys.includes(termKey)) {
                        existingCourse.term_keys.push(termKey);
                        updated = true;
                    }

                    if (isRequirement) {
                        if (
                            !existingCourse.requirement_codes.includes(
                                sourceArea
                            )
                        ) {
                            existingCourse.requirement_codes.push(sourceArea);
                            const requirementName =
                                requirementMap.get(sourceArea) || sourceArea;
                            existingCourse.requirement_names.push(
                                requirementName
                            );
                            updated = true;
                            console.log(
                                `  + Added requirement: ${sourceArea} - ${requirementName}`
                            );
                        }
                    } else {
                        const deptName =
                            departmentMap.get(sourceArea) || sourceArea;
                        if (
                            !existingCourse.department_names.includes(deptName)
                        ) {
                            existingCourse.department_names.push(deptName);
                            updated = true;
                            console.log(`  + Added department: ${deptName}`);
                        }
                    }

                    if (instructorCxids.length > 0) {
                        if (!existingCourse.all_instructor_cxids) {
                            existingCourse.all_instructor_cxids = [];
                        }
                        instructorCxids.forEach((cxid) => {
                            if (
                                !existingCourse.all_instructor_cxids!.includes(
                                    cxid
                                )
                            ) {
                                existingCourse.all_instructor_cxids!.push(cxid);
                                updated = true;
                                console.log(
                                    `  + Added instructor CxID: ${cxid}`
                                );
                            }
                        });
                    }

                    if (updated) {
                        await existingCourse.save();
                        console.log(`  ✓ Updated course ${courseCode}`);
                        summary.coursesUpdated++;
                    } else {
                        summary.coursesSkipped++;
                    }
                } else {
                    const nextId = await getNextCourseId();
                    const deptCode = extractDepartmentCode(courseCode);

                    let departmentNames: string[] = [];
                    let requirementCodes: string[] = [];
                    let requirementNames: string[] = [];

                    if (isRequirement) {
                        requirementCodes = [sourceArea];
                        requirementNames = [
                            requirementMap.get(sourceArea) || sourceArea,
                        ];
                        departmentNames = getDepartmentNames(deptCode);
                    } else {
                        departmentNames = [
                            departmentMap.get(sourceArea) || sourceArea,
                        ];
                    }

                    const newCourse = new Courses({
                        id: nextId,
                        code: courseCode,
                        code_slug: courseCodeSlug,
                        name: apiCourse.Name
                            ? apiCourse.Name.trim()
                            : 'Untitled Course',
                        department_names: departmentNames,
                        requirement_codes: requirementCodes,
                        requirement_names: requirementNames,
                        term_keys: [termKey],
                        description: apiCourse.Description || '',
                        all_instructor_ids: [],
                        all_instructor_cxids: instructorCxids,
                    });

                    await newCourse.save();
                    console.log(`  ✓ Created course ${courseCode}`);
                    summary.coursesCreated++;
                }

                processedCourses.add(courseCode);
            } catch (error: any) {
                console.error(
                    `  ✗ Error processing ${apiCourse.CourseCode}:`,
                    error.message
                );
                summary.errors++;
                summary.errorDetails.push(
                    `${apiCourse.CourseCode}: ${error.message}`
                );
            }
        }

        summary.uniqueCourses = processedCourses.size;

        console.log('\n=== Processing Summary ===');
        console.log(`Courses created: ${summary.coursesCreated}`);
        console.log(`Courses updated: ${summary.coursesUpdated}`);
        console.log(`Courses skipped: ${summary.coursesSkipped}`);
        console.log(`Unique courses: ${summary.uniqueCourses}`);
        console.log(`Errors: ${summary.errors}`);

        return summary;
    } catch (error: any) {
        console.error('Fatal error processing courses:', error.message);
        throw error;
    }
}

async function main() {
    const API_KEY = process.env.COURSE_API_KEY;
    if (!API_KEY) {
        console.error('Error: COURSE_API_KEY environment variable is not set');
        process.exit(1);
    }

    const TERM_KEY = '2026;SP';

    try {
        const MONGODB_URI =
            process.env.MONGODB_TEST_URI ||
            'mongodb://localhost:27017/school-platform';
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('Fetching course areas...');
        await fetchDepartmentMappings(API_KEY);

        const coursesWithSource = await fetchAllCoursesFromAPI(
            TERM_KEY,
            API_KEY
        );

        console.log('\nProcessing courses...');
        const summary = await updateCoursesFromAPI(coursesWithSource, TERM_KEY);

        // Save summary to file
        const fileName = `sync_summary_${TERM_KEY.replace(';', '_')}.json`;
        const filePath = path.join(process.cwd(), fileName);
        fs.writeFileSync(filePath, JSON.stringify(summary, null, 2));
        console.log(`\n✓ Summary saved to ${fileName}`);

        console.log('\n✓ Script completed successfully');
    } catch (error: any) {
        console.error('Error in main:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

if (require.main === module) {
    main();
}

export {
    updateCoursesFromAPI,
    stripSectionNumber,
    generateCodeSlug,
    fetchAllCoursesFromAPI,
    fetchDepartmentMappings,
};
