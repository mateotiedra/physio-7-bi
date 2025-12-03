#!/bin/bash

# Get the container ID for the scraper
containerId=$(docker ps --filter "name=business-inteligence-medionline-patients-scaper" --format "{{.ID}}")

if [ -z "$containerId" ]; then
    echo "Error: No running container found with name containing 'business-inteligence-medionline-patients-scaper'"
    exit 1
fi

echo "Viewing scraper logs (Press Ctrl+C to exit - scraper will keep running)"
echo "Container: $containerId"
echo ""

docker exec -t $containerId tail -f /app/scraper.log
