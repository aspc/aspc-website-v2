# ASPC Student Platform

## Introduction

This repository contains the ASPC Student Platform, a web application for Pomona College students. The platform provides authentication through Pomona's ITS system using SAML, and serves as a central hub for student resources.

### Software Developer Team:

Haram Yoon,
Cole Uyematsu,
Kartika Santoso,
Prince Bashangezi,
Ella Zhu,
Vadym Musiienko,
Abrar Yaser

# Deployment Information

The application is currently deployed as follows:

Backend: AWS Lightsail at api.pomonastudents.org
Frontend: Vercel at pomonastudents.org

## Documentation

This repository includes several documentation files to help you understand and work with the application:

- [Platform Overview](./docs/OVERVIEW.md) - Information about the student platform
- [Architecture](./docs/ARCHITECTURE.md) - High-level design of the application
- [Authentication](./docs/AUTHENTICATION.md) - Details on the SAML authentication system
- [Features](./docs/FEATURES.md) - Explanation of application features and functionalities

## Basic Repository Structure

- Detailed can be found at [Repository Structure](./docs/REPOSITORY_STRUCTURE.md)

```
project/
├── backend/           # Node.js Express backend
│   ├── src/
│   │   ├── config/    # Configuration files including SAML and server config
│   │   ├── models/    # Database models
│   │   ├── routes/    # API route handlers
│   │   ├── services/  # Business logic
│   │   └── server.ts  # Main server file
│   ├── certs/         # SSL certificates
│   └── package.json
├── frontend/          # Next.js React frontend
│   ├── certs/         # SSL certificates
│   └── package.json
├── docker-compose.yml # Docker configuration
└── docs/              # Documentation files
```

## Contributing

When contributing to this project, please follow the existing code structure and naming conventions. Make sure to test your changes thoroughly before submitting a pull request.

---

# Getting Started with ASPC Student Platform

This guide provides instructions for setting up the ASPC Student Platform both locally and with Docker. This will hep you setup the backend, frontend, and database components of the application. More details about the application can be found in the folder `docs`.

## Local Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB
- OpenSSL for certificate generation

### SSL Certificate Setup

SSL certificates are required for both frontend and backend due to SAML authentication requirements.

#### Backend Certificates

```bash
mkdir backend/certs
cd backend/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout localhost.key -out localhost.crt
# When prompted:
# Common Name: localhost
# Other fields can be left blank
```

#### Frontend Certificates

```bash
mkdir frontend/certs
cp backend/certs/localhost.* frontend/certs/
```

### Starting the Application Locally

1. **Backend Setup**

```bash
cd backend
npm install
npm run dev
```

This will start the backend server at https://localhost:5000

2. **Frontend Setup**

```bash
cd frontend
npm install
# Run Next.js app on HTTP
npm run dev
# In another terminal, run the SSL proxy
npm install -g local-ssl-proxy
local-ssl-proxy --source 3001 --target 3000
```

This will make the frontend available at https://localhost:3001

### Environment Variables

Create a `.env` file in both the frontend and backend directories with the following variables:

**Backend .env**

```
NODE_ENV=development
SESSION_SECRET=your_secret_key_here
ENTITY_ID=<backend_server_url>
IDP_METADATA_URL=<url_from_ITS>
ENGAGE_API_URL=<engage_url>
ENGAGE_API_KEY=<engage key>
```

Note: last four are only needed for events pulling or authentication, and application can still be run without them.

**Frontend .env**

```
BACKEND_LINK=https://localhost:5000
```

## Docker Setup

### Prerequisites

- Docker
- Docker Compose

### Building and Running with Docker

1. Build the images:

```bash
docker-compose build
```

2. Start the containers:

```bash
docker-compose up
```

This will start the application with the following services:

- MongoDB on port 27017
- Backend on port 5000
- Frontend on port 3001

### Docker Configuration

The Docker setup includes:

- Volume for MongoDB persistence
- Volume for certificates
- Environment variable configuration

### Production Deployment

The application is currently deployed as follows:

- Backend: AWS Lightsail at api.pomonastudents.org
- Frontend: Vercel at pomonastudents.org

For production deployment:

1. Update environment variables for production
2. Use proper SSL certificates (not self-signed)
3. Configure SAML settings for production environment

## Troubleshooting

### Common Issues

1. **SSL Certificate Problems**

    - Ensure certificates are properly generated
    - Check that certificate paths are correct in config files
    - Verify Common Name is set to 'localhost' for local development

2. **SAML Authentication Issues**

    - Verify IDP metadata is correctly downloaded and saved
    - Check entity ID and ACS URL configuration
    - Ensure HTTPS is working correctly on both frontend and backend

3. **Docker Issues**
    - Check if ports are already in use
    - Verify environment variables in docker-compose.yml
    - Ensure MongoDB volume has correct permissions

### How to run the docker container locally:

1. Build the container:

    ```bash
    cd backend
    docker build -t aspc-backend .
    ```

2. Run your new container, you can change the port from 5001 to any port available. This will be the port your docker container connects to. Make sure to insert the correct environment variables.
    ```bash
    docker run -p 5001:5000 \
      -e MONGODB_URI="mongodb+srv://{user}:{password}@aspc.qm4l8.mongodb.net/school-platform?retryWrites=true&w=majority&appName=ASPC" \
      -e NEXT_PUBLIC_TINYMCE_API_KEY="{key}" \
      aspc-backend
    ```

### How to deploy:

1. Clear all previous builders:

    ```bash
    docker buildx rm mybuilder || true
    ```

2. Create a new builder, you can name it anything:

    ```bash
    docker buildx create --use --name mybuilder
    ```

3. Build the container and push it to dockerhub:

    ```bash
    docker buildx build \
      --platform linux/amd64 \
      -t aspcsoftware/aspc-backend:latest \
      --push \
      .
    ```

4. Check architecture (has to be linux amd64 for Amazon Lightsail):

    ```bash
    docker manifest inspect aspcsoftware/aspc-backend:latest
    ```

5. Deploy on lightsail using this image reference:
    ```bash
    docker.io/aspcsoftware/aspc-backend:latest
    ```
