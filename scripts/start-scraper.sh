#!/bin/bash

# Get optional arguments for page and patient index
pageIndex=$1
patientIndex=$2

# Get the container ID for the scraper
containerId=$(docker ps --filter "name=business-inteligence-medionline-patients-scaper" --format "{{.ID}}")

if [ -z "$containerId" ]; then
    echo "Error: No running container found with name containing 'business-inteligence-medionline-patients-scaper'"
    exit 1
fi

echo "Found container: $containerId"

# Build the command with optional arguments
cmd="npm run scrape"
if [ -n "$pageIndex" ]; then
    cmd="$cmd $pageIndex"
    if [ -n "$patientIndex" ]; then
        cmd="$cmd $patientIndex"
    fi
fi

# Run the scraper in background with logging
echo "Starting scraper in background..."
if [ -n "$pageIndex" ]; then
    echo "Starting from page: $pageIndex, patient: ${patientIndex:-0}"
fi
docker exec -d $containerId sh -c "$cmd > /app/scraper.log 2>&1"

echo ""
echo "✅ Scraper started successfully!"
echo ""
echo "View logs with:"
echo "  docker exec -t $containerId tail -f /app/scraper.log"
echo ""
echo "Or use this command:"
echo "  docker logs -f $containerId"

