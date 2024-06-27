# ALL custom templates must use GlyphyAI's template-base image
FROM ghcr.io/glyphyai/template-base:latest

RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    libglu1-mesa \
    xz-utils \
    curl \
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

# Set the working directory for the Flutter app
WORKDIR /workspace

# Copy the Flutter app source code into the container
COPY . .

# Fetch dependencies for the Flutter app
RUN flutter pub get

# Expose the ports
EXPOSE 3000 8080

# Switch workdir to start a web-server
WORKDIR /server

# Entrypoint sets up the SSH keys
ENTRYPOINT ["/entrypoint.sh"]

# Start the web-server
CMD ["npm", "run", "dev"]