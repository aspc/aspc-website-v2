import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Courses } from '../models/Courses'; // Adjust path as needed

dotenv.config();

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
        const response = await fetch(
            'https://jicsweb.pomona.edu/api/CourseAreas',
            {
                headers: {
                    'Authorization-Token': apiKey,
                },
            }
        );

        if (!response.ok) {
            throw new Error(
                `Failed to fetch course areas: ${response.status} ${response.statusText}`
            );
        }

        const courseAreas: APICourseArea[] = await response.json();

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
    } catch (error) {
        console.error('Error fetching department mappings:', error);
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
        const url = `https://jicsweb.pomona.edu/api/Courses/${termKey}/${courseArea}`;
        const isRequirement = /^\d/.test(courseArea);

        console.log(
            `  Fetching ${isRequirement ? 'requirement' : 'department'} ${courseArea}...`
        );

        const response = await fetch(url, {
            headers: {
                'Authorization-Token': apiKey,
            },
        });

        if (!response.ok) {
            // Handle various error cases gracefully
            if (response.status === 404) {
                console.log(`    ⚠ No courses found for ${courseArea}`);
                return [];
            } else if (response.status === 400) {
                console.log(`    ⚠ Invalid area: ${courseArea}`);
                return [];
            } else {
                console.log(
                    `    ⚠ Error ${response.status} for ${courseArea}`
                );
                return [];
            }
        }

        const courses: APICourse[] = await response.json();
        console.log(`    ✓ Found ${courses.length} courses`);

        return courses;
    } catch (error: any) {
        console.log(`    ⚠ Error fetching ${courseArea}: ${error.message}`);
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

        // Combine all area codes (departments + requirements)
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
                // Store each course with its source area
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
    } catch (error) {
        console.error('Error fetching all courses:', error);
        throw error;
    }
}

// Helper function to strip section number from course code
function stripSectionNumber(courseCode: string): string {
    // Pattern to match course code without section number
    // Examples: "CSCI005  HM-01" -> "CSCI005 HM"
    const match = courseCode.match(/^([A-Z]+\d+[A-Z]?)\s+([A-Z]+)/);

    if (match) {
        return `${match[1]} ${match[2]}`;
    }

    // If pattern doesn't match, try to remove anything after the last hyphen
    const lastHyphenIndex = courseCode.lastIndexOf('-');
    if (lastHyphenIndex > 0) {
        return courseCode.substring(0, lastHyphenIndex).trim();
    }

    return courseCode;
}

// Helper function to generate code_slug from code
function generateCodeSlug(code: string): string {
    // "CSCI005 HM" -> "CSCI005-HM"
    return code.replace(/\s+/g, '-');
}

// Helper function to get the next available ID
async function getNextCourseId(): Promise<number> {
    const maxCourse = await Courses.findOne().sort({ id: -1 }).exec();
    return maxCourse ? maxCourse.id + 1 : 1;
}

// Helper function to extract department code from course code
function extractDepartmentCode(courseCode: string): string {
    // Extract the letter prefix from course code
    // "CSCI005 HM" -> "CSCI"
    const match = courseCode.match(/^([A-Z]+)/);
    return match ? match[1] : '';
}

// Helper function to get department names from department code
function getDepartmentNames(deptCode: string): string[] {
    if (!deptCode) {
        console.warn('Department code is empty');
        return [];
    }

    const deptName = departmentMap.get(deptCode);
    if (deptName) {
        return [deptName];
    }
    // If not found in mapping, return the code itself
    console.warn(`Department code ${deptCode} not found in mappings`);
    return [deptCode];
}

// Main function to process courses with source tracking
async function updateCoursesFromAPI(
    coursesWithSource: { course: APICourse; sourceArea: string }[]
) {
    try {
        let coursesCreated = 0;
        let coursesUpdated = 0;
        let coursesSkipped = 0;
        let errors = 0;

        // Track processed courses
        const processedCourses: Set<string> = new Set();

        for (const { course: apiCourse, sourceArea } of coursesWithSource) {
            try {
                // Strip section number from course code
                const courseCode = stripSectionNumber(apiCourse.CourseCode);
                const courseCodeSlug = generateCodeSlug(courseCode);

                // Generate term key
                const termKey = '2025;FA';

                // Check if source is requirement or department
                const isRequirement = /^\d/.test(sourceArea);

                console.log(
                    `Processing: ${apiCourse.CourseCode} -> ${courseCode} (from ${isRequirement ? 'requirement' : 'department'} ${sourceArea})`
                );

                // Check if course exists
                const existingCourse = await Courses.findOne({
                    code: courseCode,
                });

                if (existingCourse) {
                    // Course exists - update it
                    let updated = false;

                    // Add term key if new
                    if (!existingCourse.term_keys.includes(termKey)) {
                        existingCourse.term_keys.push(termKey);
                        updated = true;
                    }

                    if (isRequirement) {
                        // Add requirement if not already present
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
                        // Add department if not already present
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

                    if (updated) {
                        await existingCourse.save();
                        console.log(`  ✓ Updated course ${courseCode}`);
                        coursesUpdated++;
                    } else {
                        coursesSkipped++;
                    }
                } else {
                    // Course doesn't exist - create it
                    const nextId = await getNextCourseId();

                    // Extract department from course code
                    const deptCode = extractDepartmentCode(courseCode);

                    // Initialize arrays
                    let departmentNames: string[] = [];
                    let requirementCodes: string[] = [];
                    let requirementNames: string[] = [];

                    if (isRequirement) {
                        // Coming from requirement area
                        requirementCodes = [sourceArea];
                        requirementNames = [
                            requirementMap.get(sourceArea) || sourceArea,
                        ];
                        // Try to get department from course code
                        departmentNames = getDepartmentNames(deptCode);
                    } else {
                        // Coming from department area
                        departmentNames = [
                            departmentMap.get(sourceArea) || sourceArea,
                        ];
                        // Requirements empty for now
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
                    });

                    await newCourse.save();
                    console.log(`  ✓ Created course ${courseCode}`);
                    coursesCreated++;
                }

                processedCourses.add(courseCode);
            } catch (error) {
                console.error(
                    `  ✗ Error processing ${apiCourse.CourseCode}:`,
                    error
                );
                errors++;
            }
        }

        console.log('\n=== Processing Summary ===');
        console.log(`Courses created: ${coursesCreated}`);
        console.log(`Courses updated: ${coursesUpdated}`);
        console.log(`Courses skipped: ${coursesSkipped}`);
        console.log(`Unique courses: ${processedCourses.size}`);
        console.log(`Errors: ${errors}`);
    } catch (error) {
        console.error('Fatal error processing courses:', error);
        throw error;
    }
}

// Main execution function
async function main() {
    const API_KEY = process.env.POMONA_API_KEY;
    if (!API_KEY) {
        console.error('Error: POMONA_API_KEY environment variable is not set');
        console.log(
            'Please set it in your .env file: POMONA_API_KEY=your_api_key_here'
        );
        process.exit(1);
    }

    const TERM_KEY = '2025;FA';

    try {
        // Connect to MongoDB
        const MONGODB_URI =
            process.env.MONGODB_URI ||
            'mongodb://localhost:27017/school-platform';
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // First, fetch and separate departments/requirements
        console.log('Fetching course areas...');
        await fetchDepartmentMappings(API_KEY);

        // Then, fetch courses from all areas
        const coursesWithSource = await fetchAllCoursesFromAPI(
            TERM_KEY,
            API_KEY
        );

        // Process all courses
        console.log('\nProcessing courses...');
        await updateCoursesFromAPI(coursesWithSource);

        console.log('\n✓ Script completed successfully');
    } catch (error) {
        console.error('Error in main:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Command line argument support
async function runWithArgs() {
    const args = process.argv.slice(2);
    await main();
}

// Run the script
if (require.main === module) {
    runWithArgs();
}

export {
    updateCoursesFromAPI,
    stripSectionNumber,
    generateCodeSlug,
    fetchAllCoursesFromAPI,
    fetchDepartmentMappings,
};
