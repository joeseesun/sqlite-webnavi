FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Create directories for uploads
RUN mkdir -p public/uploads/screenshots public/uploads/icons public/uploads/qrcodes

# Bundle app source
COPY . .

# Make the entrypoint script executable
RUN chmod +x docker-entrypoint.sh

# Expose port
EXPOSE 3000

# Use the entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"] 