import {
    getCourseInstructorAssociationKeys,
    pickInstructorCxidForCourse,
} from '../utils/courseInstructors';

describe('courseInstructors utils', () => {
    describe('getCourseInstructorAssociationKeys', () => {
        it('uses CxIDs when the array is non-empty', () => {
            expect(
                getCourseInstructorAssociationKeys({
                    all_instructor_cxids: [101, 102],
                    all_instructor_ids: [1, 2],
                })
            ).toEqual({ mode: 'cxid', keys: [101, 102] });
        });

        it('falls back to legacy ids when CxIDs are missing or empty', () => {
            expect(
                getCourseInstructorAssociationKeys({
                    all_instructor_ids: [7, 8],
                })
            ).toEqual({ mode: 'legacy', keys: [7, 8] });
        });

        it('treats empty CxID array as legacy', () => {
            expect(
                getCourseInstructorAssociationKeys({
                    all_instructor_cxids: [],
                    all_instructor_ids: [9],
                })
            ).toEqual({ mode: 'legacy', keys: [9] });
        });
    });

    describe('pickInstructorCxidForCourse', () => {
        it('prefers a CxID that appears on both instructor and course', () => {
            expect(
                pickInstructorCxidForCourse(
                    { cxids: [1000, 2000] },
                    [2000, 3000]
                )
            ).toBe(2000);
        });

        it('falls back to first instructor CxID when no overlap with course', () => {
            expect(
                pickInstructorCxidForCourse({ cxids: [1000, 2000] }, [9999])
            ).toBe(1000);
        });

        it('returns undefined when instructor has no cxids', () => {
            expect(pickInstructorCxidForCourse({}, [1])).toBeUndefined();
            expect(
                pickInstructorCxidForCourse({ cxids: [] }, [1])
            ).toBeUndefined();
        });
    });
});
