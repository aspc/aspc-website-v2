# Pull Request Guidelines

This document outlines the standard practices and requirements for submitting pull requests in our repository.

## Branch Naming Convention

All branches should follow this naming pattern:

- `feature/` - For new features or enhancements
- `fix/` - For bug fixes
- `refactor/` - For code refactoring without functional changes

**Examples:**
```
feature/user-authentication
fix/login-validation-error
refactor/api-error-handling
```

## Task Linking

- **Always link PRs to their corresponding task/issue** when applicable
- Multiple PRs per task are encouraged when:
  - The task has multiple moving parts
  - It makes reviews easier and more focused
  - It allows for incremental shipping of features

## Pre-Submission Requirements

Before submitting your PR:

1. **Rebase or merge from `main`** to ensure your branch is up-to-date
   ```bash
   git checkout main
   git pull origin main
   git checkout your-branch
   git rebase main  # or git merge main
   ```

## Pull Request Content Requirements

Every PR must include:

### 1. Context
- Brief explanation of what problem this PR solves
- Link to related task/issue
- Any relevant background information

### 2. Description of Changes/Execution
- Clear summary of what was changed
- Technical approach taken
- Any breaking changes or migration steps

### 3. Testing Requirements

#### Backend Testing
- **API Routes**: Include curl statements in a bash file for all new/modified endpoints
- **Unit Tests**: Provide unit tests for helper functions and scripts
- **Screenshots**: Include screenshots showing successful execution of tests

**Testing Script Location**: `backend/src/__tests__/api-routes.sh`

**Example curl commands for HTTPS development setup:**
```bash
#!/bin/bash
# Note: Using -k flag for local HTTPS with self-signed certificates
BASE_URL="https://localhost:5000"

# Test authentication endpoints
curl -k -X GET "$BASE_URL/api/auth/current_user"

# Test course endpoints
curl -k -X GET "$BASE_URL/api/courses"
curl -k -X GET "$BASE_URL/api/courses/1"

# Test POST requests
curl -k -X POST "$BASE_URL/api/courses/1/reviews" \
  -H "Content-Type: application/json" \
  -d '{"overall": 4, "challenge": 3, "comments": "Great course!"}'
```

#### Frontend Testing
- **Screenshots or Videos**: Always include visual proof of the feature working
- **Multiple States**: Show different UI states (loading, success, error, etc.)

#### End-to-End Testing (E2E)
- **Both Backend and Frontend Requirements**: Include curl statements AND screenshots/videos
- **Integration Testing**: Show the complete user flow working

#### All Feature Types
- **Local Reproduction Steps**: Provide clear directions for reviewers to reproduce results locally



## PR Template Checklist

Use this checklist when creating your PR:

- [ ] Branch follows naming convention (`feature/`, `fix/`, `refactor/`)
- [ ] Branch is rebased/merged with latest `main`
- [ ] Task/issue is linked to PR
- [ ] Context and description provided
- [ ] Testing requirements met:
  - [ ] Backend: Test script provided (`backend/src/__tests__/api-routes.sh`)
  - [ ] Backend: Unit tests included  
  - [ ] Frontend: Screenshots/videos included
  - [ ] Local reproduction steps documented
  - [ ] HTTPS development setup tested
- [ ] All tests pass locally
- [ ] Code follows project style guidelines

## Best Practices

- Keep PRs focused and atomic
- Write clear, descriptive commit messages
- Include screenshots for UI changes
- Test edge cases and error scenarios
- Update documentation when necessary
- Respond to review feedback constructively
- **For HTTPS development**: Use `-k` flag with curl for local testing
- **API Testing**: Always run the comprehensive test script before submitting

## Development Environment Notes

### Backend Server
- **Development**: HTTPS on `https://localhost:5000` with self-signed certificates
- **Production**: HTTP (SSL terminated at load balancer)
- **API Testing**: Use provided script at `backend/src/__tests__/api-routes.sh`

### Common Commands
```bash
# Test single endpoint
curl -k https://localhost:5000/api/courses

# Run full API test suite
./backend/src/__tests__/api-routes.sh

# Check server connectivity
curl -k -v https://localhost:5000
```

---

Following these guidelines helps maintain code quality, makes reviews more efficient, and ensures smooth feature delivery.