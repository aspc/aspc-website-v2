# CxID / course data migrations

One-off migration scripts, run in order. Generated JSON and reports go in `migration-data/` and `results/`.

## Folder layout

```
migration/
├── 00-refactor-course-slug.ts          # Step 0: normalize code_slug format before CxID work
├── 01-build-cxid-mappings.ts           # Fetch API history → write JSON mappings
├── 02-merge-instructor-duplicates.ts   # Merge middle-name instructor duplicates in DB
├── 03-populate-instructor-cxids.ts     # Attach cxids[] to Instructor docs
├── 04-populate-course-cxids.ts         # Set all_instructor_cxids on Course docs
├── 05-populate-review-cxids.ts         # Set instructor_cxid on CourseReview docs
├── 06-validate-cxid-parity.ts          # Read-only parity report
├── rollback-recent.ts                  # Emergency rollback (not part of normal flow)
├── utilities/                          # Analysis helpers (used during investigation, not migration)
│   ├── group_instructors_by_lastname.ts
│   └── filter_grouped_instructors.ts
├── results/                            # Output from utility scripts
├── migration-data/                     # Output from scripts 01–06
├── README.md
└── INSTRUCTOR_CXID_MIGRATE.md          # Full narrative and context
```

## Execution order

| # | Script | Notes |
|---|--------|-------|
| 00 | `00-refactor-course-slug.ts` | Normalizes `code_slug` format (`MUS-130-SC` → `MUS130-SC`). Run once on any fresh DB before the CxID scripts. |
| 01 | `01-build-cxid-mappings.ts` | Reads from API, writes JSON to `migration-data/`. No DB writes. |
| 02 | `02-merge-instructor-duplicates.ts` | Dry-run by default. Run `--live` after reviewing output. |
| 03 | `03-populate-instructor-cxids.ts` | Attaches `cxids[]` to existing Instructor docs. |
| 04 | `04-populate-course-cxids.ts` | Sets `all_instructor_cxids` on Course docs. |
| 05 | `05-populate-review-cxids.ts` | Dry-run by default. Run `--live` after reviewing output. |
| 06 | `06-validate-cxid-parity.ts` | Read-only. Safe to run at any time. |

## Running scripts

```bash
cd backend

# 00 — normalize code_slug format (run once per fresh DB)
MONGODB_URI=... npx ts-node src/migration/00-refactor-course-slug.ts
MONGODB_URI=... npx ts-node src/migration/00-refactor-course-slug.ts --live

# 01 — build JSON mappings (no DB writes)
COURSE_API_KEY=... npx ts-node src/migration/01-build-cxid-mappings.ts

# 02 — merge middle-name duplicates (always dry-run first)
MONGODB_URI=... npx ts-node src/migration/02-merge-instructor-duplicates.ts
MONGODB_URI=... npx ts-node src/migration/02-merge-instructor-duplicates.ts --live

# 03–04 — populate DB
MONGODB_URI=... npx ts-node src/migration/03-populate-instructor-cxids.ts
MONGODB_URI=... npx ts-node src/migration/04-populate-course-cxids.ts

# 05 — populate reviews (always dry-run first)
MONGODB_URI=... npx ts-node src/migration/05-populate-review-cxids.ts
MONGODB_URI=... npx ts-node src/migration/05-populate-review-cxids.ts --live

# 06 — parity report (read-only)
MONGODB_URI=... npx ts-node src/migration/06-validate-cxid-parity.ts

# Emergency rollback
MONGODB_URI=... npx ts-node src/migration/rollback-recent.ts
MONGODB_URI=... npx ts-node src/migration/rollback-recent.ts --live
```

## Ongoing sync — updateCourses.ts

After migration, `src/services/updateCourses.ts` keeps data current each term. The term key is passed as a CLI argument (format: `YYYY;SP` or `YYYY;FA`):

```bash
MONGODB_URI=...       # target database
COURSE_API_KEY=...    # Pomona API key

npm run sync:courses -- "2026;SP"
# or directly:
npx tsx src/services/updateCourses.ts "2026;SP"
```

See `INSTRUCTOR_CXID_MIGRATE.md` for full context on the two-tier instructor lookup and course back-link fixes made to this service.

## Automated tests

API behavior for courses and instructors is covered by Jest in `src/__tests__/`, not in this folder.
