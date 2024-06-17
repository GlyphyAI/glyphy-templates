# Use the official Dart image as the base
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

ENV FLUTTER_ROOT="/opt/flutter"
ENV PATH="${FLUTTER_ROOT}/bin:${PATH}"

# Set a default channel (branch)
ARG channel=stable

# Install Flutter
RUN git clone -b $channel https://github.com/flutter/flutter "${FLUTTER_ROOT}"

# Enable Flutter Web
RUN flutter config --enable-web --disable-analytics

# Perform a doctor run
RUN flutter doctor -v

# Precache Flutter Web
RUN flutter precache --web

# Set the working directory
WORKDIR /workspace

# Copy the app source code into the container
COPY ../ .

# Fetch dependencies
RUN flutter pub get

# Install Node.js dependencies
RUN npm install express glob

# Expose the ports
EXPOSE 8080 3000

# Start the API server
CMD ["node", "/workspace/.glyphy/server.js"]