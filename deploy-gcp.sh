#!/bin/bash

# Google Cloud Platform Deployment Script for Momence Cancellation
# This script deploys your existing lc1.js to Google Cloud's free tier

echo "🌟 Setting up Momence Member Cancellation on Google Cloud Platform..."
echo "📌 Your GitHub Actions will continue running unchanged!"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI not found${NC}"
    echo ""
    echo "Please install it first:"
    echo "🍎 macOS: brew install --cask google-cloud-sdk"
    echo "🐧 Linux: https://cloud.google.com/sdk/docs/install"
    echo "🪟 Windows: https://cloud.google.com/sdk/docs/install"
    echo ""
    echo "After installation, run:"
    echo "gcloud auth login"
    echo "gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

# Check if user is logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
    echo -e "${RED}❌ Not logged into Google Cloud${NC}"
    echo "Please run: gcloud auth login"
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠️  No project set${NC}"
    echo "Create a new project or use existing one:"
    echo "gcloud projects create momence-automation-$(date +%s)"
    echo "gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}✅ Using project: $PROJECT_ID${NC}"
echo -e "${BLUE}🌍 Region: us-central1 (free tier)${NC}"

# Check for required environment variables
echo -e "${BLUE}🔍 Checking environment variables...${NC}"
if [ -z "$MOMENCE_ACCESS_TOKEN" ] || [ -z "$MOMENCE_ALL_COOKIES" ]; then
    echo -e "${YELLOW}⚠️  Environment variables not set${NC}"
    echo "Please set the following environment variables:"
    echo "export MOMENCE_ACCESS_TOKEN='your_token_here'"
    echo "export MOMENCE_ALL_COOKIES='your_cookies_here'"
    echo "export GOOGLE_CLIENT_ID='your_client_id'"
    echo "export GOOGLE_CLIENT_SECRET='your_client_secret'"
    echo "export GOOGLE_REFRESH_TOKEN='your_refresh_token'"
    echo "export GOOGLE_SHEET_ID='your_sheet_id'"
    echo ""
    echo "Or they will be set interactively during deployment..."
fi

# Enable required APIs
echo -e "${BLUE}📡 Enabling required APIs...${NC}"
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable cloudbuild.googleapis.com

echo -e "${GREEN}✅ APIs enabled${NC}"

# Copy your existing files to deployment directory
echo -e "${BLUE}📁 Preparing deployment files...${NC}"
cp ../lc1.js ./ 2>/dev/null || echo "⚠️  lc1.js will be referenced from parent directory"
cp ../.env ./ 2>/dev/null || echo "No .env file found (will use environment variables)"

# Deploy Cloud Function
echo -e "${BLUE}🚀 Deploying Cloud Function...${NC}"
echo "This will take 2-3 minutes..."

gcloud functions deploy cancelMemberBookings \
    --runtime nodejs18 \
    --trigger-http \
    --allow-unauthenticated \
    --memory 512MB \
    --timeout 540s \
    --region us-central1 \
    --set-env-vars "MOMENCE_ACCESS_TOKEN=${MOMENCE_ACCESS_TOKEN},MOMENCE_ALL_COOKIES=${MOMENCE_ALL_COOKIES},GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID},GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET},GOOGLE_REFRESH_TOKEN=${GOOGLE_REFRESH_TOKEN},GOOGLE_SHEET_ID=${GOOGLE_SHEET_ID}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Cloud Function deployed successfully!${NC}"
else
    echo -e "${RED}❌ Function deployment failed${NC}"
    exit 1
fi

# Get the function URL
FUNCTION_URL=$(gcloud functions describe cancelMemberBookings --region=us-central1 --format="value(httpsTrigger.url)")
echo -e "${GREEN}🌐 Function URL: $FUNCTION_URL${NC}"

# Test the function
echo -e "${BLUE}🧪 Testing function...${NC}"
curl -s "$FUNCTION_URL" > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Function is responsive${NC}"
else
    echo -e "${YELLOW}⚠️  Function test failed (but deployment was successful)${NC}"
fi

# Create Cloud Scheduler job (every 5 minutes)
echo -e "${BLUE}⏰ Creating scheduler job for every 5 minutes...${NC}"
gcloud scheduler jobs create http momence-cancellation-job \
    --schedule="*/5 * * * *" \
    --uri="$FUNCTION_URL" \
    --http-method=GET \
    --time-zone="Asia/Kolkata" \
    --location="us-central1" \
    --description="Momence member cancellation every 5 minutes - FREE tier"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Scheduler created successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Scheduler creation failed, but function is deployed${NC}"
    echo "You can create it manually in the console or run:"
    echo "gcloud scheduler jobs create http momence-cancellation-job --schedule=\"*/5 * * * *\" --uri=\"$FUNCTION_URL\" --time-zone=\"Asia/Kolkata\" --location=\"us-central1\""
fi

echo ""
echo -e "${GREEN}🎉 Google Cloud Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}📊 What's Running Now:${NC}"
echo "• 🔵 GitHub Actions: STILL RUNNING (every 5 minutes)"
echo "• 🟢 Google Cloud: NOW RUNNING (every 5 minutes)"
echo "• 💰 Cost: GitHub Actions ~$191/month, Google Cloud $0/month"
echo ""
echo -e "${BLUE}📋 Resources Created:${NC}"
echo "• Cloud Function: cancelMemberBookings"
echo "• Function URL: $FUNCTION_URL"
echo "• Scheduler Job: momence-cancellation-job"
echo "• Schedule: Every 5 minutes (Asia/Kolkata timezone)"
echo ""
echo -e "${BLUE}📊 Monitoring & Management:${NC}"
echo "• Console: https://console.cloud.google.com/functions"
echo "• Logs: gcloud functions logs read cancelMemberBookings --region=us-central1"
echo "• Manual run: gcloud scheduler jobs run momence-cancellation-job --location=us-central1"
echo "• Test URL: curl $FUNCTION_URL"
echo ""
echo -e "${YELLOW}💡 Next Steps:${NC}"
echo "1. Monitor both systems for 1 week"
echo "2. Compare logs to ensure identical behavior"  
echo "3. Once confident, disable GitHub Actions to save $191/month"
echo "4. Keep Google Cloud running for free!"
echo ""
echo -e "${GREEN}✨ Both systems will now run in parallel safely!${NC}"