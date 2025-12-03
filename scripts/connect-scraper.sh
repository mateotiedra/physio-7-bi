#!/bin/bash

# Script to connect to the scraper Docker container
# Usage: ./connect-scraper.sh

# Get the container ID for the scraper
containerId=$(docker ps --filter "name=business-inteligence-medionline-patients-scaper" --format "{{.ID}}")

if [ -z "$containerId" ]; then
    echo "Error: No running container found with name containing 'business-inteligence-medionline-patients-scaper'"
    exit 1
fi

echo "Found container: $containerId"
echo "Connecting to container..."
echo ""

# Open an interactive bash shell in the container
docker exec -it $containerId bash
