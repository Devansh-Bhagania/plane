# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the port your app runs on (adjust if needed)
EXPOSE 3000

# Define the command to run your app
CMD ["node", "server.js"]
