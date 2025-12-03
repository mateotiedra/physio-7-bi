#!/bin/bash

# Get the container ID for the scraper
containerId=$(docker ps --filter "name=business-inteligence-medionline-patients-scaper" --format "{{.ID}}")

if [ -z "$containerId" ]; then
    echo "Error: No running container found with name containing 'business-inteligence-medionline-patients-scaper'"
    exit 1
fi

echo "Found container: $containerId"
echo "Stopping scraper..."

# Kill both the npm and node processes
docker exec $containerId pkill -f "npm run scrape" || true
docker exec $containerId pkill -f "node dist/scrapers/patients.js" || true

echo ""
echo "✅ Scraper stopped successfully!"
