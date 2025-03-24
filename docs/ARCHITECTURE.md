# High-Level Architecture

## System Overview

The ASPC Student Platform follows a modern web application architecture with clearly separated concerns:

```
+------------------+       +------------------+       +------------------+
|                  |       |                  |       |                  |
|  Frontend        |------>|  Backend API     |------>|  Database        |
|  (Next.js)       |       |  (Express)       |       |  (MongoDB)       |
|                  |       |                  |       |                  |
+------------------+       +------------------+       +------------------+
         |                         |
         |                         |
         v                         v
+------------------+       +------------------+
|                  |       |                  |
|  Client Browser  |       |  SAML IdP        |
|                  |       |  (Pomona ITS)    |
+------------------+       +------------------+
```

## Component Architecture

### Frontend (Next.js)

The frontend is built with Next.js, a React framework that provides server-side rendering, static site generation, and routing.

**Key Structure:**
- **Pages**: Route-based views (e.g., home, events, resources)
- **Components**: Reusable UI elements
- **Hooks**: State management and API integration
- **Context**: Global state for user authentication
- **Services**: API client and helper functions

### Backend (Express)

The backend is an Express.js application that provides RESTful API endpoints and handles authentication.

**Key Structure:**
- **Routes**: API endpoint definitions
- **Controllers**: Request handlers
- **Models**: Data schemas for MongoDB
- **Middleware**: Authentication, validation, error handling
- **Services**: Business logic and external integrations
- **Config**: Environment-specific configuration

### Database (MongoDB)

MongoDB serves as the primary data store with the following collections:

- **Users**: Student and staff accounts
- **Events**: Calendar events and details
- **Resources**: Student resources and information
- **Pages**: Content for static pages
- **Settings**: System configuration

## Authentication Flow

The system uses SAML authentication with Pomona College's Identity Provider (IdP):

1. User attempts to access protected resource
2. System redirects to `/login/saml` endpoint
3. Backend creates SAML request to ITS
4. User authenticates with college credentials at ITS
5. ITS sends SAML response with user attributes
6. Backend validates response and creates session
7. User is redirected to the original resource

## Data Flow

1. **Content Creation**:
   - Staff creates content (events, resources)
   - Content is stored in MongoDB
   - Content becomes available via API

2. **Content Consumption**:
   - User requests page from frontend
   - Frontend fetches data from backend API
   - Backend retrieves data from MongoDB
   - Frontend renders data for user

## System Interfaces

### External Interfaces

- **SAML Integration**: Authentication with Pomona College ITS
- **Email Service**: Notifications and alerts
- **File Storage**: Document and image storage

### Internal Interfaces

- **REST API**: Communication between frontend and backend
- **MongoDB Client**: Database connectivity
- **Logger**: System logging and monitoring

## Scalability Considerations

- Containerized deployment with Docker
- Stateless backend for horizontal scaling
- Caching for frequently accessed data
- Optimized database indexing

## Security Architecture

- HTTPS for all communications
- SAML for secure authentication
- JWT for API authorization
- Input validation and sanitization
- CSRF protection
- Rate limiting
- Security headers

## Development and Deployment

- Local development with SSL
- Development, staging, and production environments
- CI/CD pipeline for automated testing and deployment
- Docker for containerization
- Monitoring and logging




