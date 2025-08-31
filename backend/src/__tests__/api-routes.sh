#!/bin/bash

# API Routes Testing Script with Authentication
# Usage: ./test-api-routes.sh [--with-auth]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="https://localhost:5000"
API_BASE="$BASE_URL/api"

# Authentication variables
COOKIE_FILE="/tmp/api-test-cookies.txt"
WITH_AUTH=false
SESSION_COOKIE=""

# Debug: Show all arguments
echo "DEBUG: Script arguments: $@"
echo "DEBUG: Number of arguments: $#"

# Parse command line arguments
for arg in "$@"; do
    echo "DEBUG: Processing argument: '$arg'"
    if [[ "$arg" == "--with-auth" ]]; then
        WITH_AUTH=true
        echo "DEBUG: WITH_AUTH set to true"
    fi
done

echo "DEBUG: Final WITH_AUTH value: '$WITH_AUTH'"

# SSL options for local development
SSL_OPTS=""
if [[ $BASE_URL == https* ]]; then
    SSL_OPTS="-k"
    echo -e "${YELLOW}Note: Using -k flag to bypass SSL certificate verification${NC}"
fi

# Function to simulate authentication
simulate_auth() {
    echo -e "\n${YELLOW}=== AUTHENTICATION SETUP ===${NC}"
    echo -e "${BLUE}Authentication Options:${NC}"
    echo -e "1. ${YELLOW}Manual Session Cookie${NC} - Paste session cookie from browser"
    echo -e "2. ${YELLOW}Test Current Session${NC} - Test if you're already logged in"  
    echo -e "3. ${YELLOW}Skip Authentication${NC} - Test without auth"
    
    read -p "Choose option (1-3): " auth_choice
    echo "DEBUG: You chose option: $auth_choice"
    
    case $auth_choice in
        1)
            setup_manual_session
            ;;
        2)
            test_existing_session
            ;;
        3)
            echo -e "${YELLOW}Skipping authentication${NC}"
            WITH_AUTH=false
            ;;
        *)
            echo -e "${RED}Invalid choice, proceeding without authentication${NC}"
            WITH_AUTH=false
            ;;
    esac
}

# Setup manual session cookie
setup_manual_session() {
    echo -e "\n${BLUE}Manual Session Setup:${NC}"
    echo -e "1. Go to: ${GREEN}${BASE_URL}/api/auth/login/saml${NC}"
    echo -e "2. Complete SAML login"
    echo -e "3. Open Dev Tools (F12) → Application → Cookies → https://localhost:5000"
    echo -e "4. Copy the ${YELLOW}'connect.sid'${NC} cookie value"
    echo -e ""
    
    echo -n "Paste cookie value here: "
    read -r cookie_value
    
    echo "DEBUG: Cookie value received: '$cookie_value'"
    echo "DEBUG: Cookie length: ${#cookie_value}"
    
    if [[ -n "$cookie_value" && ${#cookie_value} -gt 10 ]]; then
        echo -e "${GREEN}✅ Cookie received, testing...${NC}"
        
        # Test the cookie
        local test_response=$(curl $SSL_OPTS -s -w "HTTPSTATUS:%{http_code}" \
            -H "Cookie: connect.sid=$cookie_value" \
            "$API_BASE/auth/current_user")
        
        local http_status=$(echo $test_response | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
        echo "DEBUG: Auth test status: $http_status"
        
        if [[ "$http_status" == "200" ]]; then
            echo -e "${GREEN}✅ Authentication successful!${NC}"
            SESSION_COOKIE="$cookie_value"
        else
            echo -e "${RED}❌ Authentication failed (Status: $http_status)${NC}"
            WITH_AUTH=false
        fi
    else
        echo -e "${RED}No valid cookie provided${NC}"
        WITH_AUTH=false
    fi
}

# Test existing session
test_existing_session() {
    echo -e "\n${YELLOW}Testing for existing session...${NC}"
    local test_response=$(curl $SSL_OPTS -s -w "HTTPSTATUS:%{http_code}" "$API_BASE/auth/current_user")
    local http_status=$(echo $test_response | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    
    if [[ "$http_status" == "200" ]]; then
        echo -e "${GREEN}✅ Already authenticated!${NC}"
    else
        echo -e "${YELLOW}No existing session found${NC}"
        WITH_AUTH=false
    fi
}

# Function to make authenticated requests
make_request() {
    local method=$1
    local url=$2
    local data=${3:-""}
    
    local curl_cmd="curl $SSL_OPTS -s -w \"HTTPSTATUS:%{http_code}\" -X $method"
    
    if [[ $WITH_AUTH == true && -n "$SESSION_COOKIE" ]]; then
        curl_cmd="$curl_cmd -H \"Cookie: connect.sid=$SESSION_COOKIE\""
    fi
    
    if [[ -n "$data" ]]; then
        curl_cmd="$curl_cmd -H \"Content-Type: application/json\" -d '$data'"
    fi
    
    curl_cmd="$curl_cmd \"$url\""
    
    local response=$(eval $curl_cmd)
    local status=$(echo $response | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    echo "$status"
}

# Function to test endpoints
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=${3:-"2xx"}
    local auth_required=${4:-false}
    local data=${5:-""}
    
    local full_url="$API_BASE$endpoint"
    local status=$(make_request "$method" "$full_url" "$data")
    
    if [[ $status -ge 200 && $status -lt 300 ]]; then
        echo -e "${GREEN}✓ PASS${NC} - $method $endpoint (Status: $status)"
    elif [[ $status == 302 && $endpoint == *"login"* ]]; then
        echo -e "${GREEN}✓ PASS${NC} - $method $endpoint (Status: $status - Redirect OK)"
    elif [[ $status == 401 && $auth_required == true && $WITH_AUTH != true ]]; then
        echo -e "${YELLOW}⚠ AUTH REQUIRED${NC} - $method $endpoint (Status: $status)"
    elif [[ $expected_status == "4xx" && $status -ge 400 && $status -lt 500 ]]; then
        echo -e "${YELLOW}⚠ EXPECTED${NC} - $method $endpoint (Status: $status)"
    else
        echo -e "${RED}✗ FAIL${NC} - $method $endpoint (Status: $status)"
    fi
}

# Start testing
echo -e "${BLUE}Starting API Routes Testing...${NC}"
echo -e "Testing against: $BASE_URL"

# Test connectivity
echo -e "\n${YELLOW}Testing connectivity...${NC}"
connectivity_status=$(curl $SSL_OPTS -s -w "%{http_code}" -o /dev/null "$BASE_URL")
if [[ "$connectivity_status" != "000" ]]; then
    echo -e "${GREEN}✅ Server reachable (Status: $connectivity_status)${NC}"
else
    echo -e "${RED}❌ Cannot connect to server${NC}"
    exit 1
fi

# Setup authentication if requested
if [[ $WITH_AUTH == true ]]; then
    simulate_auth
else
    echo -e "${YELLOW}Running without authentication (use --with-auth flag to test auth)${NC}"
fi

echo -e "\n${BLUE}=================== TESTING ROUTES ===================${NC}"

# Auth routes
echo -e "\n${BLUE}Authentication Routes:${NC}"
test_endpoint "GET" "/auth/test-saml-metadata"
test_endpoint "GET" "/auth/login/saml" 
test_endpoint "GET" "/auth/current_user" "2xx" true
test_endpoint "GET" "/auth/users"
test_endpoint "GET" "/auth/logout/saml"

# Course routes  
echo -e "\n${BLUE}Course Routes:${NC}"
test_endpoint "GET" "/courses"
test_endpoint "GET" "/courses?search=math"
test_endpoint "GET" "/courses?number=101" 
test_endpoint "GET" "/courses?schools=CS,MATH"
test_endpoint "GET" "/courses?limit=10"
test_endpoint "GET" "/courses/1"
test_endpoint "GET" "/courses/999999" "4xx"
test_endpoint "GET" "/courses/abc" "4xx"
test_endpoint "GET" "/courses/1/reviews"
test_endpoint "GET" "/courses/1/instructors"

# Course CRUD operations
test_endpoint "POST" "/courses" "4xx" true '{
    "id": 99999,
    "code": "TEST101",
    "code_slug": "test-101", 
    "name": "Test Course",
    "department_names": ["Test Department"],
    "requirement_codes": ["GE"],
    "requirement_names": ["General Education"],
    "term_keys": ["2024SP"],
    "description": "A test course for API testing",
    "all_instructor_ids": [1]
}'

test_endpoint "PUT" "/courses/1" "4xx" true '{
    "name": "Updated Course Name",
    "description": "Updated description"
}'

test_endpoint "DELETE" "/courses/99999" "4xx" true

# Course Reviews
test_endpoint "POST" "/courses/1/reviews" "4xx" true '{
    "overall": 4,
    "challenge": 3,
    "inclusivity": 5,
    "workPerWeek": 10,
    "instructorId": 1,
    "comments": "Great course! Very engaging.",
    "email": "test@example.com"
}'

test_endpoint "PATCH" "/courses/reviews/1" "4xx" true '{
    "overall": 5,
    "challenge": 4,
    "inclusivity": 5,
    "workPerWeek": 8,
    "comments": "Updated review - even better than expected!"
}'

test_endpoint "DELETE" "/courses/reviews/99999" "4xx" true

# Instructor routes
echo -e "\n${BLUE}Instructor Routes:${NC}"
test_endpoint "GET" "/instructors"
test_endpoint "GET" "/instructors?search=john"
test_endpoint "GET" "/instructors/1"
test_endpoint "GET" "/instructors/999999" "4xx"
test_endpoint "GET" "/instructors/abc" "4xx"
test_endpoint "GET" "/instructors/1/reviews"
test_endpoint "GET" "/instructors/1/courses"

# Instructor CRUD operations
test_endpoint "POST" "/instructors" "4xx" true '{
    "id": 99999,
    "name": "Dr. Test Instructor",
    "inclusivity_rating": 4.5,
    "competency_rating": 4.8,
    "challenge_rating": 3.5
}'

test_endpoint "PUT" "/instructors/1" "4xx" true '{
    "name": "Updated Instructor Name",
    "inclusivity_rating": 4.0
}'

# Housing routes
echo -e "\n${BLUE}Housing Routes:${NC}" 
test_endpoint "GET" "/campus/housing"
test_endpoint "GET" "/campus/housing/1"
test_endpoint "GET" "/campus/housing/999999" "4xx"
test_endpoint "GET" "/campus/housing/abc" "4xx"
test_endpoint "GET" "/campus/housing/1/rooms"
test_endpoint "GET" "/campus/housing/1/reviews"
test_endpoint "GET" "/campus/housing/1/101/reviews"
test_endpoint "GET" "/campus/housing/review_pictures/507f1f77bcf86cd799439011" "4xx"

# Housing Reviews (these will fail without multipart/form-data for images)
echo -e "${YELLOW}Note: Housing review POST/PATCH with images requires multipart/form-data (not tested)${NC}"
test_endpoint "DELETE" "/campus/housing/reviews/99999" "4xx" true

# Event routes
echo -e "\n${BLUE}Event Routes:${NC}"
test_endpoint "GET" "/events"
test_endpoint "GET" "/events/day"
test_endpoint "GET" "/events/week"  
test_endpoint "GET" "/events/month"
test_endpoint "GET" "/events/1"

# Reviews routes (general)
echo -e "\n${BLUE}Review Routes:${NC}"
test_endpoint "GET" "/reviews/1"
test_endpoint "GET" "/reviews/999999" "4xx"
test_endpoint "GET" "/reviews/abc" "4xx"

test_endpoint "POST" "/reviews" "4xx" true '{
    "id": 99999,
    "overall_rating": 4,
    "challenge_rating": 3,
    "inclusivity_rating": 5,
    "work_per_week": 10,
    "total_cost": 500,
    "comments": "Test review via API",
    "course_id": 1,
    "instructor_id": 1,
    "user_id": 1
}'

test_endpoint "PUT" "/reviews/1" "4xx" true '{
    "overall_rating": 5,
    "comments": "Updated review comment"
}'

test_endpoint "DELETE" "/reviews/99999" "4xx" true

# Admin Pages routes
echo -e "\n${BLUE}Admin Page Routes:${NC}"
test_endpoint "GET" "/admin/pages"
test_endpoint "GET" "/admin/pages/home"
test_endpoint "GET" "/admin/pages/header/main"

test_endpoint "POST" "/admin/pages" "4xx" true '{
    "id": "test-page-api",
    "name": "Test Page via API",
    "header": "test",
    "content": "This is a test page created via API testing"
}'

test_endpoint "PUT" "/admin/pages/home" "4xx" true '{
    "name": "Updated Home Page",
    "content": "Updated content for home page"
}'

test_endpoint "DELETE" "/admin/pages/test-page-api" "4xx" true

# Staff/Members routes  
echo -e "\n${BLUE}Staff/Member Routes:${NC}"
test_endpoint "GET" "/members"
test_endpoint "GET" "/members/1"
test_endpoint "GET" "/members/999999" "4xx"
test_endpoint "GET" "/members/group/admin"
test_endpoint "GET" "/members/group/nonexistent" "4xx"
test_endpoint "GET" "/members/profile-pic/507f1f77bcf86cd799439011" "4xx"

# Staff CRUD (these require multipart/form-data for file uploads)
echo -e "${YELLOW}Note: Staff POST/PATCH with profile pictures require multipart/form-data (not tested)${NC}"
test_endpoint "DELETE" "/members/99999" "4xx" true

# Additional edge cases and error testing
echo -e "\n${BLUE}Edge Cases & Error Testing:${NC}"

# Test malformed JSON
test_endpoint "POST" "/courses" "4xx" true '{"invalid": json}'

# Test missing required fields
test_endpoint "POST" "/courses" "4xx" true '{}'

test_endpoint "POST" "/admin/pages" "4xx" true '{
    "name": "Missing required fields"
}'

# Test invalid IDs in various formats
test_endpoint "GET" "/courses/-1" "4xx"
test_endpoint "GET" "/instructors/0" "4xx"
test_endpoint "GET" "/campus/housing/-999" "4xx"

# Test very large numbers
test_endpoint "GET" "/courses/999999999999999999" "4xx"

# Test SQL injection attempts (should be safely handled)
test_endpoint "GET" "/courses/1'; DROP TABLE courses; --" "4xx"

# Test XSS attempts in search
test_endpoint "GET" "/courses?search=<script>alert('xss')</script>" "2xx"
test_endpoint "GET" "/instructors?search=javascript:alert(1)" "2xx"

# Test various HTTP methods on endpoints that don't support them
test_endpoint "DELETE" "/courses?search=test" "4xx"
test_endpoint "PUT" "/events/day" "4xx"
test_endpoint "PATCH" "/auth/users" "4xx"

echo -e "\n${BLUE}=================== TESTING COMPLETE ===================${NC}"

# Cleanup
if [[ -f "$COOKIE_FILE" ]]; then
    rm -f "$COOKIE_FILE"
fi

echo -e "\n${YELLOW}Legend:${NC}"
echo -e "${GREEN}✓ PASS${NC} - Test passed"
echo -e "${YELLOW}⚠ AUTH REQUIRED${NC} - Requires authentication"  
echo -e "${YELLOW}⚠ EXPECTED${NC} - Expected error"
echo -e "${RED}✗ FAIL${NC} - Unexpected failure"