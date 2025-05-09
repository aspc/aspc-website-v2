# ASPC Platform Features

## Content Management System

### Static Page Management
- **Rich Text Editing**: Integrated TinyMCE editor for creating and updating content
- **Content Organization**: Pages organized by sections (about, members, resources, press room, scs internship)
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

### Course Information
- **Course Database**: Comprehensive database storing course codes, names, descriptions and metadata
- **Department Organization**: Courses organized by academic departments with filtering capabilities
- **Course Details**: Detailed course information including:
  - Course code and name
  - Department affiliations
  - Graduation requirement fulfillment
  - Terms offered (historical data)
  - Course descriptions
  - Associated instructors

### Course Search System
- **Text-Based Search**: Search by course name or course code
- **School Filtering**: Filter courses by the 5C college (Pomona, CMC, Scripps, Harvey Mudd, Pitzer)
- **Visual School Indicators**: Color-coded course cards based on the offering institution
- **Results Management**: Pagination and sorting of search results

### Course Reviews
- **Multi-dimensional Rating System**:
  - Overall rating (5-star scale)
  - Challenge rating (5-star scale)
  - Inclusivity rating (5-star scale)
  - Work per week (hours estimation)
- **Review Management**: Users can create, edit, and delete their own reviews
- **Instructor Association**: Reviews linked to specific instructors who taught the course
- **Statistical Summaries**: Aggregated rating averages displayed with review counts
- **Comment System**: Detailed text feedback on course experiences
- **Timestamp Tracking**: Record of when reviews were created and last updated

## Housing Resources

### Building Information
- **Campus Organization**: Buildings organized by campus location
- **Building Database**: Comprehensive information including:
  - Building name and location
  - Number of floors
  - Building descriptions
  - Campus affiliation
- **Building Gallery**: Images of each residence hall
- **Floor Plans**: Viewable floor plans for each building level

### Room Browsing System
- **Building-based Navigation**: Browse rooms organized by building
- **Room Type Filtering**: View rooms based on occupancy type (single, double, triple)
- **Room Size Information**: Square footage details where available

### Room Details
- **Room Specifications**:
  - Room number
  - Occupancy type (single, double, triple)
  - Room size in square feet
  - Closet type information
  - Bathroom type information
- **Room Location**: Building and floor information

### Housing Reviews
- **Multi-dimensional Rating System**:
  - Overall rating (5-star scale)
  - Quiet rating (5-star scale)
  - Layout rating (5-star scale)
  - Temperature rating (5-star scale)
- **Photo Documentation**: Upload and view photos of rooms
  - Photo gallery for each review
  - Enlarged view modal for detailed inspection
- **Review Management**: Create, edit, and delete your own reviews
- **Statistical Summaries**: Aggregated rating averages for each dimension
- **Comment System**: Detailed text feedback on housing experiences
- **Timestamp Tracking**: Record of when reviews were created and last updated

## Instructor Information

### Instructor Profiles
- **Instructor Database**: Comprehensive storage of faculty information
- **School Affiliation**: Association with specific colleges
- **Course History**: Record of courses taught by each instructor

### Instructor Search
- **Name-based Search**: Find instructors by name
- **School Filtering**: Visual indication of instructor's home institution
- **Color-coded Interface**: School-specific styling for instructor cards

### Instructor Reviews
- **Rating Aggregation**: Average ratings across multiple dimensions:
  - Overall rating
  - Inclusivity rating
  - Challenge rating
- **Course-Specific Feedback**: Reviews linked to specific courses taught
- **Review Management**: Users can create, edit, and delete their own reviews
- **Review Statistics**: Summary of instructor performance across all courses

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
