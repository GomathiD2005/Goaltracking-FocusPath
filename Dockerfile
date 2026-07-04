FROM node:20

# Create a non-root user with UID 1000
RUN useradd -m -u 1000 user
WORKDIR /home/user/app

# Copy dependency definition files
COPY --chown=user package*.json ./
RUN npm install

# Copy the rest of the application files
COPY --chown=user . .

# Build the frontend and bundle the backend
RUN npm run build

# Set environment variables
ENV PORT=7860
ENV NODE_ENV=production

# Expose port 7860 for Hugging Face Space
EXPOSE 7860

# Start the application
CMD ["npm", "start"]
