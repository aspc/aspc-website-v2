# Stage 1: Build
FROM --platform=linux/amd64 node:18-alpine AS build

# Set working directory in docker container
WORKDIR /app

# Copy only package files first
COPY package*.json ./

# Install all dependencies 
RUN npm install

# Copy the rest of the backend code
COPY . .

# Run the build step
RUN npm run build


# Stage 2: Run
FROM node:18-alpine

# Creating a clean working directory for the final (prod) container
WORKDIR /app

# Copy compiled output + package files from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Expose port 5000 (subject to change)
EXPOSE 5000

# 10) Final command to start the server
CMD ["node", "dist/server.js"]