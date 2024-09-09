FROM ghcr.io/glyphyai/sandbox-server:latest

RUN groupadd -r appuser && useradd -r -g appuser -s /bin/bash appuser

RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    libglu1-mesa \
    xz-utils \
    curl \
    gosu \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /workspace/app /home/appuser /sandbox-server \
    && chown -R appuser:appuser /workspace /home/appuser /sandbox-server

ENV FLUTTER_ROOT="/opt/flutter"
ENV PATH="${FLUTTER_ROOT}/bin:${PATH}"
ARG channel=stable

RUN git clone -b $channel https://github.com/flutter/flutter "${FLUTTER_ROOT}" \
    && chown -R appuser:appuser /opt/flutter

USER appuser

RUN flutter config --enable-web --disable-analytics && \
    flutter doctor -v && \
    flutter precache --web

EXPOSE 3000 8080

ENTRYPOINT ["/entrypoint.sh"]

CMD ["npm", "run", "dev"]