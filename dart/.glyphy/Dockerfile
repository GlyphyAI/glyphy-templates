FROM dart:stable

# Install dependencies
RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    libglu1-mesa \
    xz-utils \
    curl \
    git \
    nodejs \
    npm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /workspace

# Copy the app source code into the container
COPY ../ .

# Fetch dependencies
RUN dart pub get

# Install Node.js dependencies
RUN npm install express glob

# Expose the ports
EXPOSE 3000

# Start the API server
CMD ["node", "/workspace/.glyphy/server.js"]