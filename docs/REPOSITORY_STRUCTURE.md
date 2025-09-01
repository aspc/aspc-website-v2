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
│   │   │   ├── Housing.ts            # Housing models
│   │   │   ├── PageContent.ts        # Content page model
│   │   │   └── People.ts             # User and staff models
│   │   ├── routes/                   # API route handlers
│   │   │   ├── AuthRoutes.ts         # Authentication routes
│   │   │   ├── EventsRoutes.ts       # Events API routes
│   │   │   └── admin/                # Admin-only routes
│   │   │       ├── PagesRoutes.ts    # Page content management
│   │   │       └── StaffRoutes.ts    # Staff management
│   │   ├── services/                 # Business logic
│   │   │   └── EngageEventsService.ts # Events API integration
│   │   └── server.ts                 # Main server file
│   ├── certs/                        # SSL certificates
│   │   ├── localhost.key
│   │   └── localhost.crt
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── nodemon.json
│   └── .gitignore
├── frontend/                         # Next.js React frontend
    |── .next                         # Next.js build directory
│   ├── certs                         # SSL certificates
│   ├── public                        # Static assets
│   ├── src/
│   │   ├── app/                      # Next.js app directory
│   │   │   ├── dashboard/            # Admin dashboard
│   │   │   │   └── page.tsx
│   │   │   ├── events/               # Events calendar
│   │   │   │   └── page.tsx
│   │   │   ├── login/                # Login page
│   │   │   │   └── page.tsx
│   │   │   ├── pages/                # Dynamic pages
│   │   │   │   ├── [header]/
│   │   │   │   │   ├── [pageid]/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── staff/                # Staff directory
│   │   │   │   ├── [slug]/
│   │   │   │   │   └── page.tsx
│   │   │   ├── globals.css           # Global styles
│   │   │   ├── layout.tsx            # Root layout
│   │   │   └── page.tsx              # Homepage
│   │   ├── components/               # React components
│   │   │   ├── Loading.tsx           # Loading component
│   │   │   └── ui/                   # UI components
│   │   │       ├── Footer.tsx
│   │   │       ├── Header.tsx
│   │   │       ├── HomepageEvents.tsx
│   │   │       ├── PageDashboard.tsx
│   │   │       └── StaffDashboard.tsx
│   │   ├── hooks/                    # Custom React hooks
│   │   │   └── useAuth.ts            # Authentication hook
│   │   ├── middleware.ts             # Next.js middleware
|   |   ├── utils                     # util shared functions
|   |   |   └── textFormatting.tsx    # Review Comment Formatting function
│   │   └── types.ts                  # TypeScript type definitions
│   ├── certs/                        # SSL certificates
│   │   ├── localhost.key
│   │   └── localhost.crt
│   ├── package.json
│   ├── package-lock.json
│   └── next.config.ts               
│   ├── postcss.config.mjs          
│   ├── tailwind.config.ts            
│   └── tsconfig.json                
├── docker-compose.yml                # Docker configuration
└── docs/                             # Documentation files

```

LAST UPDATED: 3/20/2025
