# ASPC Course Review System: Instructor CxID Migration

## Project Overview

This document outlines the database migration process for transitioning the ASPC (Associated Students of Pomona College) course review system from legacy instructor IDs to API-based instructor CxIDs. The migration was necessary to align the system with the Pomona API's data structure and improve data accuracy.

## Background

The ASPC course review system serves students across the Claremont Colleges consortium (Harvey Mudd, Pomona, Claremont McKenna, Scripps, and Pitzer). The system originally used legacy internal instructor IDs inherited from a previous PostgreSQL database. However, the external Pomona API uses CxIDs (arbitrary numerical identifiers) for instructors.

### Database Structure

**Three main MongoDB collections:**
1. **Instructors** - Professor information
2. **Courses** - Course offerings with instructor associations  
3. **CourseReviews** - Student reviews linked to specific courses and instructors

### Initial Data State
- **887 unique instructor names** in the system
- **26 instructors** have multiple CxIDs (taught at different schools)
- Courses stored with codes like `CSCI005 HM` and slugs like `CSCI005-HM`
- **Average instructors per course:** 48.26 (clearly erroneous)

### The Core Problem

Same professor can have multiple CxIDs if they taught at different schools throughout their career, creating a many-to-one mapping challenge. The legacy system's internal IDs didn't align with the API's data source, and we needed to maintain historical accuracy for existing course reviews while migrating to the new system.

## Migration Process

### Phase 1: Code Slug Refactoring

**The Challenge:** Course codes contained complex formatting with department codes, numbers, and sometimes letter suffixes (e.g., "BIOL052R", "CSCI005 HM"). School codes are strictly 2-letter identifiers, and the `code_slug` field needed to be consistent for proper matching with API data.

**Objective:** Standardize the `code_slug` format across all courses in the database

**Process:**
- Parse course codes to extract department and number components
- Handle edge cases with letter suffixes
- Ensure school codes match 2-letter format
- Standardize `code_slug` format (e.g., `CSCI005-HM`)
- Validate consistency between course codes and slugs

**Result:** Clean, consistent course identifiers ready for API matching

### Phase 2: Historical Course Data Collection

**Objective:** Build complete CxID mappings from API historical data

**The Breakthrough:** Instead of trying to map legacy IDs directly, we realized the API's historical data contains which specific CxID was used for each course section. This solved the critical problem of determining instructor identity for past offerings.

**Process:**
- Fetch historical course data from 2002-2025 using `GET api/Courses/{termKey}`
- Extract instructor CxIDs associated with each course section
- Map instructor names → CxIDs → courses → terms
- Build accurate historical associations by school and term

**Implementation:**
- Iterate through all term keys from Fall 2002 to Spring 2025
- Store mappings in a structured format for later phases
- Use MongoDB aggregation pipelines to process large datasets

### Phase 3: Update Instructors Collection

**Objective:** Add CxID arrays to existing instructor documents

**Changes:**
- Add `cxids: []` array field to each instructor document
- Populate from Phase 2 mappings
- Maintain existing `name` field for compatibility
- Keep legacy IDs temporarily during transition

**Example Structure:**
```javascript
{
  _id: ObjectId(...),
  name: "Professor Smith",
  cxids: [12345, 67890],  // Multiple if taught at different schools
  // legacy fields preserved for transition period
}
```

**Result:** Instructor documents now contain both old and new identifier systems

### Phase 4: Update Courses Collection

**Objective:** Replace instructor IDs with CxID-based references

**Changes:**
- Replace `all_instructor_ids: []` with `all_instructor_cxids: []`
- Populate using mappings from Phase 2
- Match courses by code_slug and term to find correct CxIDs

**Key Insight:** Courses like "CSCI005 HM" and "CSCI005 PO" are the same course at different schools, but should have school-specific instructor lists based on who actually taught each section.

**Result:** 
- **98% course match rate** between database and API
- **Average instructors per course:** 48.26 → 2.81 (dramatic improvement)
- Accurate historical instructor associations maintained

### Phase 5: Update CourseReviews Collection

**Objective:** Link reviews to specific instructor CxIDs

**Process:**
- Add `instructor_cxid` field to each review
- Use Phase 2 mappings to determine correct CxID based on:
  - Course code and school
  - Term/year of the review
  - Instructor name
- Maintain data integrity for historical reviews

**Status:** Implementation phase - some missing data exists where historical mappings couldn't be determined with certainty

## Technical Implementation

### Challenge: Complex Course Code Formatting

**Issue:** Course codes contained inconsistent formatting with:
- Department codes of varying lengths
- Course numbers with optional letter suffixes (e.g., "BIOL052R")
- School codes that needed to be exactly 2 letters
- Various spacing and delimiter patterns

**Solution:** 
- Built robust parsing logic using regex patterns
- Standardized code_slug format across all courses
- Validated school codes strictly as 2-letter identifiers
- Handled edge cases through iterative testing

### MongoDB Aggregation Pipelines

Used extensively throughout the migration for:
- Matching courses between database and API data
- Calculating instructor statistics and identifying data quality issues
- Building CxID mappings at scale
- Batch updating collections efficiently

### TypeScript Integration

- Type-safe handling of API responses
- Robust error handling for data inconsistencies
- Batch processing for large-scale updates
- Validation of data transformations at each phase

### API Integration

**Primary Endpoint:**
- `GET api/Courses/{termKey}` - Historical course data by term
- Term keys from Fall 2002 through Spring 2025
- Systematic iteration through all historical terms

## Results

### Migration Outcomes

- **98% course match rate** between database and API data
- **Average instructors per course:** 48.26 → 2.81 (significant improvement)
- **Data quality:** Dramatically improved with accurate instructor associations
- **Historical accuracy:** Maintained for existing course reviews where mappings were available

### System State

**Completed:**
- Phase 1: Code slug standardization ✓
- Phase 2: Historical CxID mapping collection ✓
- Phase 3: Instructors collection updated ✓
- Phase 4: Courses collection migrated to CxIDs ✓

**In Progress:**
- Phase 5: CourseReviews collection (some missing data for older reviews)

### Before vs. After

**Before:**
- Legacy internal IDs disconnected from data source
- No clear mapping to API data
- Inflated instructor counts due to mapping errors
- Inconsistent code_slug formatting

**After:**
- Direct CxID alignment with Pomona API
- Accurate historical instructor associations (where data available)
- Clean, consistent course identifiers
- Realistic instructor counts per course

## Key Takeaways

1. **Code standardization first:** Cleaning up code_slug format was essential before attempting API matching
2. **Historical data is crucial:** API historical records provided the ground truth for accurate CxID mappings
3. **Incremental validation:** Each phase allowed us to verify data quality before proceeding
4. **Missing data reality:** Some historical data gaps exist and that's acceptable - perfect migration wasn't possible
5. **Dramatic improvements:** Even with gaps, data quality improved significantly (48 → 2.8 instructors per course)

## Long-Term Benefits

1. **Data Source Alignment:** System now uses same identifiers as authoritative API
2. **Future-Proof:** New courses automatically use correct CxID system
3. **Accurate Reviews:** Students can trust instructor-specific reviews
4. **Maintainability:** Reduced complexity in data management
5. **API Consistency:** Eliminates need for translation layers between systems

---

**Project:** ASPC Website - Course Review System  
**Database:** MongoDB  
**Tech Stack:** TypeScript, Node.js  
**Migration Scope:** Historical data from 2002-2025  
**Colleges:** Harvey Mudd, Pomona, CMC, Scripps, Pitzer