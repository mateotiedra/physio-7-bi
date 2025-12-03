#!/bin/bash

# Get optional arguments for page and patient index
pageIndex=$1
patientIndex=$2

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
nohup $cmd > /app/scraper.log 2>&1 &

echo ""
echo "✅ Scraper started successfully!"
echo ""
echo "View logs with:"
echo "  tail -f /app/scraper.log"

