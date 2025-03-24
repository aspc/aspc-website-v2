# Authentication System

## SAML Authentication Architecture

The ASPC Student Platform implements SAML (Security Assertion Markup Language) authentication to integrate with Pomona College's Identity Provider (IdP), which is Microsoft Entra ID managed by ITS.

### Authentication Flow Diagram

```
+------------------+                 +------------------+                 +------------------+
|                  |  1. Login       |                  |  2. SAML        |                  |
|  Student         |---------------->|  ASPC Platform   |---------------->|  Pomona ITS      |
|  (Browser)       |                 |  (Service        |                 |  (Identity       |
|                  |                 |   Provider)      |                 |   Provider)      |
|                  |<----------------|                  |<----------------|                  |
|                  |  6. Redirect    |                  |  3. Redirect    |                  |
+------------------+                 +------------------+                 +------------------+
       ^                                    ^                                    |
       |                                    |                                    |
       |                                    |                                    |
       |                                    |                                    v
       |                                    |                             +------------------+
       |                                    |  5. SAML                    |                  |
       |                                    |<--------------------------- |  Microsoft       |
       |                                    |  Response                   |  Entra ID        |
       |                                    |                             |                  |
       |                                    |                             +------------------+
       |                                    |
       |                                    |
       |                                    v
       |                             +------------------+
       |                             |                  |
       |  7. Authenticated           |  MongoDB         |
       |  User Session               |  (User Storage)  |
       +----------------------------->                  |
                                     +------------------+
```

## Detailed Authentication Flow

1. **Initiation**: User clicks "Login" and is directed to `/login/saml` endpoint
2. **SAML Request**: Backend generates SAML request and redirects to ITS login page
3. **User Authentication**: User enters Pomona College credentials
4. **Identity Verification**: ITS verifies credentials and generates SAML response
5. **SAML Response**: ITS sends SAML response with user attributes to `/saml/consume` endpoint
6. **Session Creation**: Backend validates SAML response and creates user session
7. **User Creation/Retrieval**: System checks if user exists in database
   - If new user: creates user record with data from SAML attributes
   - If existing user: retrieves user record and updates if needed
8. **Redirection**: User is redirected to the application

## Configuration Details

### Service Provider (ASPC) Configuration

- **Entity ID**:
  - Production: `https://api.pomonastudents.org/`
  - Development: `https://localhost:5000`
  
- **Assertion Consumer Service (ACS) URL**:
  - Production: `https://api.pomonastudents.org/api/auth/saml/consume`
  - Development: `https://localhost:5000/saml/consume`

### Identity Provider (ITS) Configuration

- **IDP Metadata**: Obtained from ITS as XML file or URL
- **Metadata Location**: Saved as `idp_metadata.xml` in the project

## User Attributes Mapping

SAML responses from ITS include the following attributes:

| SAML Attribute    | Application Field |
|-------------------|-------------------|
| Given name        | firstName         |
| Surname           | lastName          |
| Email address     | email             |
| Full name         | displayName       |
| Unique identifier | azureId           |

## Implementation Details

### SAML Configuration (samlConfig.ts)

This file initializes:
1. Identity Provider (IdP) object using ITS metadata
2. Service Provider (SP) object with ASPC URLs

### Authentication Routes (AuthRoutes.ts)

- **/login/saml**: Initiates SAML authentication flow
- **/saml/consume**: Processes SAML response from ITS
- **/get_current_user**: Retrieves user details after authentication
- **/logout/saml**: Terminates user session and redirects through Azure logout flow

### User Model (User.ts)

The User model includes fields for:
- Authentication information (azureId, email)
- Personal information (firstName, lastName, displayName)
- Role information (isAdmin, permissions)
- Session management (lastLogin, accountStatus)

## Security Considerations

- All communications are over HTTPS
- SSL certificates properly managed and renewed
- Secure session management implementation
- Protection against CSRF attacks
- Regular security audits for authentication flow

## Testing Strategy

- Local development testing with SSL certificates
- Production environment testing
- User attribute verification from SAML responses
- Session management validation
- Error handling verification for authentication edge cases

## Common Issues and Solutions

1. **SAML Response Validation Failures**
   - Verify correct SSL certificate usage
   - Check that Entity ID and ACS URL match ITS configuration
   - Validate IDP metadata is current

2. **Session Management Problems**
   - Ensure proper session storage configuration
   - Verify session timeouts are appropriate
   - Check for proper session cleanup on logout

3. **User Creation Issues**
   - Confirm all required attributes are being received from ITS
   - Check database connectivity and permissions
   - Verify user model validation rules