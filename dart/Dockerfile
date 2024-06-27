# Use the Dart image to get the Dart SDK
FROM dart:stable AS dart_base

# # ALL custom templates must use GlyphyAI's template-base image
FROM ghcr.io/glyphyai/template-base:latest

# Copy Dart SDK from dart_base
COPY --from=dart_base /usr/lib/dart /usr/lib/dart

# Add Dart to PATH
ENV PATH="/usr/lib/dart/bin:${PATH}"

# Install additional dependencies if needed
RUN apt-get update && apt-get install -y \
    libglu1-mesa \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory for the Dart app
WORKDIR /workspace

# Copy the Dart app source code into the container
COPY . .

# Fetch dependencies for the Dart app (uncomment if needed)
RUN dart pub get

# Expose the ports
EXPOSE 3000

# Switch workdir to start a web-server
WORKDIR /server

# Entrypoint sets up the SSH keys
ENTRYPOINT ["/entrypoint.sh"]

# Start the web-server
CMD ["npm", "run", "dev"]