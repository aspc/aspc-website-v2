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
- SAML integration with ITS (Information Technology Services)
- Secure session management

### Student Resources
- Academic resources
- Campus life information
- Student government documents
- Support services information

### Events Management
- Calendar of campus events
- Event registration functionality
- Event reminders and notifications

### Staff Directory
- Information about ASPC staff members
- Contact details and office hours
- Role descriptions and responsibilities

### Static Content Pages
- About ASPC
- Mission and vision
- Constitutional documents
- Policies and procedures

### User Profiles
- Personal information management
- Preferences and settings
- Activity history

## Technology Stack

The platform is built using modern web technologies:

- **Frontend**: Next.js React application with TypeScript
- **Backend**: Node.js with Express and TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: SAML integration with Pomona College ITS
- **Deployment**: Docker containerization

