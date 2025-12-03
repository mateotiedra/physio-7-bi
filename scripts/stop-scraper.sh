#!/bin/bash

echo "Stopping scraper..."

# Kill both the npm and node processes
kill $(ps aux | grep 'npm run scrape' | grep -v grep | awk '{print $2}') 2>/dev/null || true
kill $(ps aux | grep 'node dist/scrapers/patients.js' | grep -v grep | awk '{print $2}') 2>/dev/null || true

echo ""
echo "✅ Scraper stopped successfully!"
