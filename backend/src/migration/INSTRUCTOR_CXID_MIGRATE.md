# ASPC Course Review System: Instructor CxID Migration

## Project Overview

This document covers the full migration from legacy instructor IDs to API-based CxIDs, plus the ongoing-sync fixes made to `updateCourses.ts`. It is written for an engineer reproducing or extending this work.

---

## Background

The ASPC course review system serves students across the Claremont Colleges (Harvey Mudd, Pomona, CMC, Scripps, Pitzer). The system originally used internal numeric IDs inherited from a legacy PostgreSQL database. The Pomona API uses **CxIDs** — arbitrary numeric identifiers assigned per-school, per-instructor. The same professor can have different CxIDs at different schools.

### Initial data state
- ~887 unique instructor names in the database
- 26 instructors with multiple CxIDs (taught at more than one school)
- Average instructors per course: **48.26** (clearly wrong — caused by broken join logic)
- `code_slug` fields were inconsistently formatted (`MUS-130-SC` vs `MUS130-SC`)

### Core problem
The legacy system's internal IDs had no relationship to the API's CxIDs. Reviews, courses, and instructors all needed to be re-linked using CxID as the new canonical identifier. Additionally, the same professor often appears with multiple CxIDs (one per school) and sometimes with a middle name included in one school's data but not another's.

---

## Script 00 — Code Slug Normalization (`00-refactor-course-slug.ts`)

Run once on any fresh database before the CxID scripts. Course slugs in the legacy data were inconsistently formatted; this script standardizes `code_slug` to `DEPTNUM-SCHOOL` format (e.g., `MUS130-SC`). The `updateCourses.ts` service builds slugs in this format going forward, so this script only needs to run once per database.

---

## Script 01 — Build CxID Mappings (`01-build-cxid-mappings.ts`)

Fetches historical course data from the Pomona API for every term from Fall 2002 to the current term (using `new Date()` — no hardcoded year). For each term, extracts the CxID associated with each course section and instructor name.

**Outputs to `migration-data/`:**
- `cxid-mappings.json` — `{ courseCode, termKey, instructorName, cxid }[]`
- `instructor-cxids.json` — per-instructor CxID list
- `course-cxids.json` — per-course CxID list
- `summary.json` — run stats

The API endpoint is `GET api/Courses/{termKey}`. Term keys run `YYYY;FA` / `YYYY;SP` from `2002;FA` to the current term.

---

## Script 02 — Merge Instructor Duplicates (`02-merge-instructor-duplicates.ts`)

**Run before scripts 03–05.** Some schools include a middle name in the instructor name while others don't (e.g., `Carlson, Kevin David` at HM vs `Carlson, Kevin` at PO). Without merging, these exist as duplicate Instructor documents with separate CxIDs.

Groups all Instructor documents by `normalizeInstructorName(name)` (strips middle name, lowercases). Any group with 2+ members is a duplicate set.

**Merge rules:**
- `name` — keep the shortest (no middle name = canonical)
- `cxids` — union of all CxIDs, deduplicated
- `courses` — union by `courseId`, deduplicated across all members including canonical
- `numReviews` — sum
- `CourseReviews.instructor_id` — reassigned from deleted doc ids to canonical id so legacy reviews aren't orphaned

Dry-run by default. Pass `--live` to apply.

---

## Script 03 — Populate Instructor CxIDs (`03-populate-instructor-cxids.ts`)

Reads `instructor-cxids.json` and attaches a `cxids: number[]` array to each existing Instructor document. Matched by instructor name (exact, then token-sort normalized). Instructors with no match in the API data get an empty `cxids: []` array.

---

## Script 04 — Populate Course CxIDs (`04-populate-course-cxids.ts`)

Reads `course-cxids.json` and sets `all_instructor_cxids: number[]` on each Course document, matched by `code_slug`. Replaces the old `all_instructor_ids` join-table approach.

**Result:** 98% course match rate. Average instructors per course dropped from 48.26 → 2.81.

---

## Script 05 — Populate Review CxIDs (`05-populate-review-cxids.ts`)

Links each CourseReview to a specific `instructor_cxid`. Uses a four-tier matching strategy:

1. **Exact name match** — lowercase normalized instructor name vs `cxid-mappings.json`
2. **Token-sort match** — handles "Last, First" vs "First Last" ordering differences
3. **Levenshtein fuzzy match** — threshold of 3 edits, catches minor typos
4. **CxID-intersection fallback** — `pickInstructorCxidForCourse()` picks a CxID the course already knows about, avoiding cross-school mismatches

Runs in dry-run mode by default. Pass `--live` to apply. Writes per-run reports to `migration-data/phase4-report-*.json`. Applies updates in batched MongoDB transactions (500 per batch) — requires a replica set (Atlas satisfies this).

Some older reviews remain unmapped where the historical API data had no matching instructor — this is acceptable.

---

## Script 06 — Validate Parity (`06-validate-cxid-parity.ts`)

Read-only. Safe to run at any time. Compares:
- Per course: distinct instructor count via legacy `all_instructor_ids` vs new `all_instructor_cxids`
- Per review: resolvable via `instructor_cxid` vs legacy `instructor_id`

Mismatches in per-course counts are normal — the two systems answer different questions. Use the report to spot anomalies, not as a pass/fail gate. Writes JSON to `migration-data/parity-report-*.json`.

---

## Emergency Tool — Rollback (`rollback-recent.ts`)

Deletes all Course and Instructor documents created at or after the timestamp encoded in a given ObjectId. Used to undo a bad sync run without wiping unrelated data.

Edit `THRESHOLD_OID` in the script to the first ObjectId from the run you want to roll back, then run with `--live`. Not part of the normal migration sequence.

---

## Ongoing Sync — updateCourses.ts

`src/services/updateCourses.ts` runs each term to pull new courses from the API and keep the database current. Two bugs were fixed as part of this migration work:

### Bug 1 — Middle-name variants creating duplicate instructor docs

The API returns different name spellings across schools (e.g., `Carlson, Kevin` at PO, `Carlson, Kevin David` at HM). Without name normalization, each variant creates a new Instructor document instead of updating the existing one.

**Fix — two-tier instructor lookup before creating any new document:**
1. **CxID lookup** — exact match on `cxids[]` array (same school; name may vary term-to-term)
2. **Stripped-name lookup** — `normalizeInstructorName()` match (same person, different school → different CxID)

If either matches, the existing document is updated (`$addToSet` for new CxID, `$push` for new course back-link). Only if both miss does a new document get created — stored without middle name via `stripMiddleName()`.

All lookup maps are built once before the course loop and kept in sync with in-memory mutations after each DB write, so duplicate API entries within the same term don't trigger redundant writes.

### Bug 2 — New instructor docs missing course back-links

When `updateCourses.ts` created a new Instructor, the instructor's `courses[]` array was never populated. The Course doc correctly stored the CxID, but the instructor had no record of which courses they teach.

**Fix:** The instructor upsert block now always passes a `courseRef` (courseId, courseCode, courseName) and pushes it on both the create and update paths.

### Shared utilities

`stripMiddleName` and `normalizeInstructorName` are in `src/utils/instructorNames.ts`, imported by both `updateCourses.ts` and `02-merge-instructor-duplicates.ts`.

### Required env vars

```
MONGODB_URI=...       # target database
COURSE_API_KEY=...    # Pomona API key
TERM_KEY=2026;SP      # term to sync (YYYY;SP or YYYY;FA)
```

---

## Investigation Utilities (`utilities/`)

These scripts were used during the migration investigation and are **not part of the migration sequence**.

`utilities/group_instructors_by_lastname.ts` — groups all Instructor documents by last name, writes `results/grouped_instructors.json`. Used to spot potential duplicates that `02-merge-instructor-duplicates.ts` wouldn't catch (e.g., nickname differences).

`utilities/filter_grouped_instructors.ts` — reads `results/grouped_instructors.json`, filters to groups where all members are likely the same person (first-name match, nickname table, initial match), writes `results/grouped_instructors_filtered.json` for manual review.

---

## Results

| Metric | Before | After |
|--------|--------|-------|
| Average instructors per course | 48.26 | 2.81 |
| Course match rate vs API | — | 98% |
| Instructor docs with CxIDs | 0 | ~100% |
| CourseReviews with instructor_cxid | 0 | ~95%+ |

---

## Key Design Decisions

1. **CxID array per instructor** — one Instructor document holds all CxIDs the person has ever had across schools. Keeps review counts unified and avoids fan-out.

2. **Strip middle names at write time** — new Instructor docs are stored without middle names (`stripMiddleName()`). The full-name CxID is still recorded in `cxids[]`. Prevents future syncs from creating duplicates when the same person appears with/without a middle name.

3. **CxID-first lookup in ongoing sync** — CxID is stable for a given school even when the API changes the name spelling. The stripped-name fallback only fires for cross-school associations.

4. **Nickname mismatches left for manual fix** — "Nick" vs "Nicholas" type differences are not handled automatically. The `utilities/` scripts help identify these for manual review.

---

**Database:** MongoDB  
**Tech Stack:** TypeScript, Node.js, Mongoose  
**Migration scope:** Historical data from 2002 to present  
**Colleges:** Harvey Mudd (HM), Pomona (PO), CMC (CM), Scripps (SC), Pitzer (PZ)
