# ASPC Platform Features

## Content Management System

### Static Page Management
- **Rich Text Editing**: Integrated TinyMCE editor for creating and updating content
- **Content Organization**: Pages organized by sections (about, members, resources, pressroom, elections)
- **Content Versioning**: Update and track changes to existing pages
- **Page Routing**: Dynamic routes based on page section and ID (`/pages/[section]/[id]`)

### Link Management
- **External Links**: Create pages that redirect to external resources
- **Internal Links**: Create shortcuts to other platform pages
- **Link Organization**: Links organized by the same section system as static content


## Staff Directory

### Staff Management
- **Profile Management**: Create and update staff member profiles
- **Group Organization**: Staff members organized by groups:
  - Senate
  - Staff
  - Software
- **Role-Based Organization**: Track staff positions and responsibilities

### Profile Features
- **Profile Pictures**: Upload and manage staff photos (stored in GridFS)
- **Biographical Information**: Staff biographies and personal statements
- **Contact Information**: Staff roles and position information
- **Dynamic Display**: Staff profiles organized by group on frontend

## Events System

### Events Calendar
- **Engage API Integration**: Pull event data from campus Engage platform
- **Calendar Views**: View events by day, week, or month
- **Event Details**: Display comprehensive event information including:
  - Event name
  - Location
  - Time
  - Description
  - Host organization
  - Status (active, canceled)

### Homepage Events
- **Featured Events**: Display highlighted events on the homepage
- **Upcoming Events**: Show the day's events
- **Pagination**: Navigate through multiple events
- **Direct Links**: Link to detailed event pages

## Admin Dashboard

### Content Management Dashboard
- **Page Editor**: Create, edit, and delete content pages
- **Section Management**: Organize content into sections
- **Form Validation**: Ensure all required fields are completed
- **Preview**: View content changes before publishing

### Staff Management Dashboard
- **Staff Editor**: Add, edit, and remove staff profiles
- **Group Assignment**: Assign staff to organizational groups
- **Image Upload**: Manage staff profile pictures
- **Form Validation**: Ensure all required fields are completed

## Academic Resources
(Based on database models, specific frontend implementation may be in progress)

### Course Information
- **Course Database**: Store and retrieve course information
- **Department Organization**: Courses organized by academic departments
- **Course Details**: Course codes, names, and additional information

### Course Reviews
- **Rating System**: Multiple rating dimensions including:
  - Overall rating
  - Challenge rating
  - Inclusivity rating
  - Work per week
  - Total cost
- **User Comments**: Textual feedback on courses
- **Instructor Association**: Reviews linked to specific instructors

## Housing Resources
(Based on database models, specific frontend implementation may be in progress)

### Housing Information
- **Building Database**: Campus housing building information
- **Room Details**: Information about specific rooms including:
  - Size
  - Occupancy type
  - Closet type
  - Bathroom type
  - Room number

### Housing Reviews
- **Rating System**: Multiple rating dimensions including:
  - Overall rating
  - Quiet rating
  - Layout rating
  - Temperature rating
- **User Comments**: Textual feedback on housing
- **Photo Upload**: Ability to add room pictures

## Instructor Information
(Based on database models, specific frontend implementation may be in progress)

### Instructor Profiles
- **Instructor Database**: Store instructor information
- **Rating Aggregation**: Average ratings across multiple dimensions:
  - Inclusivity rating
  - Competency rating
  - Challenge rating

## Responsive Design

### Cross-Device Compatibility
- **Mobile-Friendly Navigation**: Hamburger menu for smaller screens
- **Responsive Layouts**: Content adapts to different screen sizes
- **Touch-Friendly Controls**: Optimized for both mouse and touch input

### Accessibility
- **Semantic HTML**: Proper use of HTML elements for better screen reader support
- **Keyboard Navigation**: Support for keyboard-only navigation
- **Image Alternatives**: Alt text for images

## Additional Features

### Footer Information
- **Contact Information**: ASPC contact details
- **Social Media Links**: Links to ASPC social profiles
- **Location Information**: Campus location details

### Header Navigation
- **Dropdown Menus**: Organized section navigation
- **User Status**: Display login status and admin options
- **Mobile Adaptation**: Collapsible menu for smaller screens
