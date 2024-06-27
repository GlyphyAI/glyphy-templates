#!/bin/bash

if [ -z "$GITHUB_USERNAME" ]; then
    echo "Error: GITHUB_USERNAME is not set."
    echo "Usage: export GITHUB_USERNAME=<your-github-username>"
    exit 1
fi

if [ -z "$GITHUB_PAT" ]; then
    echo "Error: GITHUB_TOKEN is not set."
    echo "Usage: export GITHUB_TOKEN=<your-github-token>"
    exit 1
fi

LOCAL_IMAGE_NAME="template-flutter"
OWNER="glyphyai"
IMAGE_NAME="template-flutter"
TAG="latest"

# Login to GitHub Container Registry
echo $GITHUB_PAT | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin

# Tag the Docker image
docker tag $LOCAL_IMAGE_NAME ghcr.io/$OWNER/$IMAGE_NAME:$TAG

# Push the Docker image to GHCR
docker push ghcr.io/$OWNER/$IMAGE_NAME:$TAG

# Output success message
echo "Image successfully pushed to ghcr.io/$OWNER/$IMAGE_NAME:$TAG"