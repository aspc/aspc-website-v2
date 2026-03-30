# CxID / course data migrations

One-off and periodic scripts live here (not Jest tests). Generated JSON and run reports stay in `migration-data/`.

## Layout

- `cxid.ts` — Phase 1: fetch historical API data, write `cxid-mappings.json`, `instructor-cxids.json`, `course-cxids.json`, `summary.json`.
- `instructors_migrate.ts` — Phase 2: attach `cxids` to `Instructors` documents.
- `instructor_to_course.ts` — Phase 3: set `all_instructor_cxids` on `Courses`.
- `update_reviews.ts` — Phase 4/5: set `instructor_cxid` on `CourseReviews`.
- `refactor-course-slug.ts` — `code_slug` normalization (run with care; uses DB URL in file — prefer env).
- `validate-cxid-parity.ts` — **read-only** parity report: per course, legacy vs CxID distinct instructor counts; per review, resolvable via `instructor_cxid` vs legacy id. Writes JSON under `migration-data/parity-report-*.json`.

Paths under `migration-data/` resolve via `path.join(__dirname, 'migration-data', ...)`, so you can run from the **backend** root:

```bash
cd backend
npx ts-node src/migration/cxid.ts
```

Set `MONGODB_URI` (or the URI each script expects) before running anything that writes to MongoDB.

## Automated tests

API behavior for courses and instructors is covered by Jest in `src/__tests__/`, not in this folder.
