FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Create upload directories
RUN mkdir -p public/uploads/screenshots public/uploads/icons

# Expose the port the app runs on
EXPOSE 3002

# Command to run the application
CMD ["npm", "start"]
