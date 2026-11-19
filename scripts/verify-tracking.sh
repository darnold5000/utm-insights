#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
PROJECT_KEY="${2:-pk_mdl_dev_seed_001}"
VISITOR_ID="${3:-$(uuidgen | tr '[:upper:]' '[:lower:]')}"
SESSION_ID="${4:-$(uuidgen | tr '[:upper:]' '[:lower:]')}"

echo "Posting page_view to $BASE_URL/api/v1/events"

curl -sS -X POST "$BASE_URL/api/v1/events" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d "{
    \"projectKey\": \"$PROJECT_KEY\",
    \"eventId\": \"test:pv:1\",
    \"visitorId\": \"$VISITOR_ID\",
    \"sessionId\": \"$SESSION_ID\",
    \"eventType\": \"page_view\",
    \"pagePath\": \"http://localhost:3000/?utm_source=facebook&utm_medium=organic_social&utm_campaign=indiana_gyms&utm_content=plainfield_parent_post\",
    \"landingPage\": \"/\",
    \"firstTouch\": {
      \"utmSource\": \"facebook\",
      \"utmMedium\": \"organic_social\",
      \"utmCampaign\": \"indiana_gyms\",
      \"utmContent\": \"plainfield_parent_post\"
    },
    \"lastTouch\": {
      \"utmSource\": \"facebook\",
      \"utmMedium\": \"organic_social\",
      \"utmCampaign\": \"indiana_gyms\",
      \"utmContent\": \"plainfield_parent_post\"
    }
  }"

echo ""
echo "Posting gym_interest_submitted conversion"

curl -sS -X POST "$BASE_URL/api/v1/events" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d "{
    \"projectKey\": \"$PROJECT_KEY\",
    \"eventId\": \"test:conversion:1\",
    \"visitorId\": \"$VISITOR_ID\",
    \"sessionId\": \"$SESSION_ID\",
    \"eventType\": \"gym_interest_submitted\",
    \"pagePath\": \"http://localhost:3000/gyms\",
    \"firstTouch\": {
      \"utmSource\": \"facebook\",
      \"utmMedium\": \"organic_social\",
      \"utmCampaign\": \"indiana_gyms\",
      \"utmContent\": \"plainfield_parent_post\"
    },
    \"lastTouch\": {
      \"utmSource\": \"facebook\",
      \"utmMedium\": \"organic_social\",
      \"utmCampaign\": \"indiana_gyms\",
      \"utmContent\": \"plainfield_parent_post\"
    }
  }"

echo ""