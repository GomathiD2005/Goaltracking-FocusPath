FROM node:20

# Reuse the pre-existing 'node' user (UID 1000) in the official Node image
USER node
WORKDIR /home/node/app

# Copy dependency files with correct ownership
COPY --chown=node package*.json ./
RUN npm install

# Copy all application files with correct ownership
COPY --chown=node . .

# Build frontend and server
RUN npm run build

# Set environment variables
ENV PORT=7860
ENV NODE_ENV=production

# Expose port 7860 for Hugging Face
EXPOSE 7860

# Start the server
CMD ["npm", "start"]
