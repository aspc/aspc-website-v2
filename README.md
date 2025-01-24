# Aspc-website-v2

This is the repository for the new ASPC website. 

### Software Developer Team:
Haram Yoon,
Cole Uyematsu,
Vadym Musiienko,
Kartika Santoso,
Abrar Yaser


### How to run the website locally:
1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/aspc-website-v2.git
    cd aspc-website-v2
    ```

2. Navigate to the frontend folder and install dependencies:
    ```bash
    cd frontend
    npm install
    ```

3. Start the frontend development server:
    ```bash
    npm run dev
    ```

4. Open a new terminal, navigate to the backend folder and install dependencies:
    ```bash
    cd backend
    npm install
    ```

5. Start the backend server:
    ```bash
    npm run dev
    ```

6. Open your browser and go to `http://localhost:3000` to see the website.

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

