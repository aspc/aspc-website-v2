# ASPC Platform Architecture

## System Overview

The ASPC Student Platform is a web application with a client-server architecture that serves Pomona College students. It consists of three primary components:

1. **Next.js Frontend** - Client-side application (pomonastudents.org)
2. **Express Backend API** - Server-side application (api.pomonastudents.org)
3. **MongoDB Database** - Data persistence layer

## Architecture Diagram

```
                                 +----------------+
                                 |                |
                                 |   MongoDB      |
                                 |   Database     |
                                 |                |
                                 +--------+-------+
                                          ^
                                          |
                                          |
+-------------------+          +----------+---------+
|                   |  HTTP/S  |                    |
|   Next.js         +--------->+    Express         |
|   Frontend        |  API     |    Backend         |
|                   |  Calls   |                    |
+-------------------+          +----------+---------+
                                          ^
                                          |
                                          |
                                 +--------+-------+
                                 |                |
                                 |  Microsoft     |
                                 |  Entra ID      |
                                 |  (Pomona ITS)  |
                                 +----------------+
```

## Frontend Architecture

The frontend is a Next.js React application using the App Router pattern:

- **Client-side routing** with dynamic page components
- **Component-based architecture** for UI elements
- **Server-side data fetching** via API calls to the backend
- **Responsive design** using Tailwind CSS

## Backend Architecture

The backend is an Express.js application with a RESTful API architecture:

- **Resource-based Routing**: Modular API design with dedicated routes for Academic Resources, Housing, Voting, and Open Forum.
- **Controller Pattern**: Clean separation of concerns between route definitions and business logic.
- **Middleware-based Processing**: Authentication (`authMiddleware.ts`), session management, and validation.
- **Service Layer**: External integrations such as the Engage API for campus events.
- **Database Layer**: Mongoose models for structured data and GridFS for binary storage (staff photos, housing review images).

## Data Flow

### Client-Server Communication

1. Frontend makes HTTP requests to backend API endpoints (e.g., `/api/voting`, `/api/openforum`).
2. Backend processes requests, interacts with MongoDB via Mongoose.
3. Backend returns JSON responses to the frontend.
4. Frontend renders the data using React components.

### Secure Voting Flow (Privacy-Preserving)

The platform implements a unique privacy-preserving flow for student elections:
1. **Eligibility Check**: Backend verifies if the authenticated user is in the `StudentBallotInfo` collection.
2. **Ballot Access**: User retrieves candidates they are eligible to vote for based on their year and campus location.
3. **Anonymous Submission**: When a vote is cast:
   - The user's `StudentBallotInfo` record is updated to `hasVoted: true`.
   - A separate `Vote` document is created **without any reference** to the user's ID or email.
   - Both operations are executed within a MongoDB transaction to ensure atomicity.

### External System Integration

- Backend integrates with Pomona College ITS for authentication
- Backend fetches campus events from the Engage API
  - Events service (`EngageEventsService.ts`) retrieves, filters, and formats campus events
  - Provides standardized event data to frontend calendar and homepage displays
  - Events service (`EngageEventsService.ts`) retrieves, filters, and formats campus events
  - Provides standardized event data to frontend calendar and homepage displays

## Deployment Architecture

### Production Environment

```
                           +-------------------+
Internet <---------------->| API Gateway/Proxy |
                           +--------+----------+
                                    |
                                    v
    +-----------------+    +--------+----------+
    |                 |    |                   |
    | Vercel          |    | AWS Lightsail     |
    | (Frontend)      |    | (Backend)         |
    |                 |    |                   |
    +-----------------+    +--------+----------+
                                    |
                                    v
                           +--------+----------+
                           |                   |
                           | MongoDB Database  |
                           |                   |
                           +-------------------+
```

- **Frontend**: Deployed on Vercel (pomonastudents.org)
- **Backend**: Deployed on AWS Lightsail (api.pomonastudents.org)
- **Database**: MongoDB instance

### Development Environment

- Local HTTPS-enabled development servers
- Self-signed SSL certificates for SAML compatibility
- Docker containerization for consistent environments

## Key Technical Decisions

1. **Next.js for Frontend**: Provides server-side rendering capabilities and modern React features
2. **Express for Backend**: Lightweight, flexible Node.js server framework
3. **MongoDB for Database**: Flexible schema design for evolving requirements
4. **SAML Authentication**: Integration with college's existing identity system
5. **GridFS for File Storage**: Storage of binary files (images) directly in MongoDB
6. **Engage API Integration**: External service for retrieving and displaying campus events
