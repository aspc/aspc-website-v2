# ASPC Student Platform Overview

## Introduction

The ASPC (Associated Students of Pomona College) Student Platform is a web application designed to serve Pomona College students. It provides access to student resources, event information, staff directory, and various services offered by the student government.

## Purpose

The platform aims to:
- Centralize student resources and information
- Provide a unified login experience using Pomona College credentials
- Offer an intuitive interface for students to access ASPC services
- Enable staff members to manage content and events
- Create a sustainable platform that can be maintained by future ASPC tech teams

## Target Users

1. **Pomona College Students**
   - Access resources, event information, housing/couse resources, and services
   - Authenticate with their Pomona College credentials
   - Participate in student government initiatives like voting and funding requests

2. **ASPC Staff Members**
   - Manage content and resources
   - Create and update events
   - Administer the platform

3. **Pomona College Community**
   - Access public information about ASPC
   - View public events and resources

## Core Features

### Single Sign-On Authentication
- Seamless login using Pomona College credentials
- SAML integration with Microsoft Entra ID (Pomona ITS)
- Secure session management and user profile auto-creation

### Academic & Housing Resources
- Comprehensive course database with department filtering
- Instructor profiles and course-specific reviews
- Housing database with building details, floor plans, and room reviews

### Voting Platform
- Secure, anonymous ranked-choice voting for student elections
- Eligibility verification based on class year and campus location
- Admin dashboard for election and candidate management

### Open Forum
- Peer review system for campus events
- Custom rating dimensions and anonymous feedback
- Statistical aggregation of event quality and engagement

### Events Management
- Integration with campus Engage API
- Interactive calendar of campus events
- Featured and upcoming events displays

### Staff Directory
- Information about ASPC staff, Senate, and Software Team
- Role descriptions and contact details
- Profile management with image uploads

### Static Content Pages
- Dynamic CMS for about pages, documents, and resources
- Rich text editing for staff administrators

## Technology Stack

The platform is built using modern web technologies:

- **Frontend**: Next.js (App Router) with TypeScript and Tailwind CSS
- **Backend**: Node.js with Express and TypeScript
- **Database**: MongoDB with Mongoose ODM and GridFS for file storage
- **Authentication**: SAML 2.0 integration with Pomona College ITS
- **Deployment**: Docker containerization, Vercel (Frontend), AWS Lightsail (Backend)

