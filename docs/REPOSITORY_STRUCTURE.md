# Repository Structure

```
project/
├── backend/                          # Node.js Express backend
│   ├── src/
│   │   ├── config/                   # Configuration files
│   │   │   ├── samlConfig.ts         # SAML configuration settings
│   │   │   └── serverConfig.ts       # HTTPS server configuration
│   │   ├── models/                   # Database models
│   │   │   ├── Courses.ts            # Course and department models
│   │   │   ├── Forum.ts              # Open Forum event review models
│   │   │   ├── Housing.ts            # Housing and building models
│   │   │   ├── PageContent.ts        # Dynamic content page models
│   │   │   ├── People.ts             # SAMLUser, Staff, and Instructors models
│   │   │   └── Voting.ts             # Election, Candidate, and Vote models
│   │   ├── routes/                   # API route handlers
│   │   │   ├── AuthRoutes.ts         # Authentication (/api/auth)
│   │   │   ├── CoursesRoutes.ts      # Course data (/api/courses)
│   │   │   ├── EventsRoutes.ts       # Engage events (/api/events)
│   │   │   ├── ForumRoutes.ts        # Open Forum (/api/openforum)
│   │   │   ├── HousingRoutes.ts      # Housing data (/api/campus/housing)
│   │   │   ├── InstructorsRoutes.ts  # Instructor data (/api/instructors)
│   │   │   ├── ReviewsRoutes.ts      # Course/Housing reviews (/api/reviews)
│   │   │   ├── VotingRoutes.ts       # Voting endpoints (/api/voting)
│   │   │   └── admin/                # Admin-only routes
│   │   │       ├── PagesRoutes.ts    # Content management (/api/admin/pages)
│   │   │       ├── StaffRoutes.ts    # Staff management (/api/members)
│   │   │       └── VotingAdminRoutes.ts # Election management (/api/admin/elections)
│   │   ├── services/                 # Business logic
│   │   │   └── EngageEventsService.ts # External API integrations
│   │   └── server.ts                 # Main server entry point
│   ├── certs/                        # SSL certificates for dev
│   └── package.json                  # Dependencies and scripts
├── frontend/                         # Next.js React frontend
│   ├── src/
│   │   ├── app/                      # Next.js app directory
│   │   │   ├── campus/               # Academic & Housing resources
│   │   │   │   ├── courses/          # Course search & reviews
│   │   │   │   ├── housing/          # Building & room resources
│   │   │   │   └── instructors/      # Instructor lookup & reviews
│   │   │   ├── dashboard/            # Admin dashboard
│   │   │   ├── events/               # Events calendar
│   │   │   ├── open-forum/           # Peer event review platform
│   │   │   ├── pages/                # Dynamic content pages
│   │   │   ├── staff/                # Staff directory
│   │   │   ├── vote/                 # Secure voting interface
│   │   │   ├── globals.css           # Global styles (Tailwind)
│   │   │   ├── layout.tsx            # Main layout wrapper
│   │   │   └── page.tsx              # Homepage
│   │   ├── components/               # UI components
│   │   │   ├── courses/              # Course-specific components
│   │   │   ├── housing/              # Housing-specific components
│   │   │   ├── open-forum/           # Forum-specific components
│   │   │   ├── ui/                   # Reusable UI elements (Header, Footer, etc.)
│   │   │   └── vote/                 # Voting platform components
│   │   ├── hooks/                    # Custom React hooks (useAuth, etc.)
│   │   └── types.ts                  # Shared TypeScript definitions
│   ├── package.json                  # Dependencies and scripts
│   └── tailwind.config.ts            # Tailwind CSS configuration
└── docs/                             # Project documentation

```

LAST UPDATED: 4/13/2026
