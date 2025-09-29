#!/bin/bash

# 🚀 GitHub Actions Deployment Script
# This script sets up everything needed for automated member cancellation

echo "🎯 Setting up Momence Member Cancellation with GitHub Actions..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ This is not a git repository. Initializing...${NC}"
    git init
    echo -e "${GREEN}✅ Git repository initialized${NC}"
fi

# Step 2: Check if GitHub remote exists
if ! git remote get-url origin &>/dev/null; then
    echo -e "${YELLOW}⚠️  No GitHub remote found${NC}"
    echo "Please add your GitHub repository as origin:"
    echo "git remote add origin https://github.com/yourusername/momence-cancellation.git"
    echo ""
else
    REPO_URL=$(git remote get-url origin)
    echo -e "${GREEN}✅ GitHub remote found: ${REPO_URL}${NC}"
fi

# Step 3: Create .env.example if it doesn't exist
if [ ! -f ".env.example" ]; then
    cat > .env.example << 'EOF'
# Momence API Credentials
MOMENCE_ACCESS_TOKEN=your_access_token_here
MOMENCE_ALL_COOKIES=your_cookies_string_here

# Google Sheets ID (optional - can be set in GitHub secrets)
GOOGLE_SHEET_ID=your_google_sheet_id_here
EOF
    echo -e "${GREEN}✅ Created .env.example${NC}"
fi

# Step 4: Create local .env if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Created .env file - please update with your credentials${NC}"
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# Step 5: Add .env to .gitignore
if [ ! -f ".gitignore" ]; then
    cat > .gitignore << 'EOF'
# Environment files
.env
.env.local
.env.production

# Node modules
node_modules/

# Logs
*.log
npm-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# macOS
.DS_Store

# Windows
Thumbs.db
EOF
    echo -e "${GREEN}✅ Created .gitignore${NC}"
elif ! grep -q ".env" .gitignore; then
    echo ".env" >> .gitignore
    echo -e "${GREEN}✅ Added .env to .gitignore${NC}"
fi

# Step 6: Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
if command -v npm &> /dev/null; then
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ npm not found. Please install Node.js first${NC}"
    exit 1
fi

# Step 7: Test the script
echo -e "${BLUE}🧪 Testing script...${NC}"
if [ -f ".env" ] && grep -q "your_access_token_here" .env; then
    echo -e "${YELLOW}⚠️  Please update .env with real credentials before testing${NC}"
else
    if node -e "require('./lc-7.js')" 2>/dev/null; then
        echo -e "${GREEN}✅ Script loads without errors${NC}"
    else
        echo -e "${YELLOW}⚠️  Script has issues - check your .env file${NC}"
    fi
fi

# Step 8: Commit and push
echo -e "${BLUE}📤 Preparing for GitHub...${NC}"
git add .
git status

echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Update .env with your real Momence credentials"
echo "2. Test locally: npm start"
echo "3. Commit and push to GitHub:"
echo "   git commit -m 'Add automated member cancellation'"
echo "   git push origin main"
echo ""
echo "4. Add GitHub Secrets (in your repo settings):"
echo "   • MOMENCE_ACCESS_TOKEN"
echo "   • MOMENCE_ALL_COOKIES"
echo "   • GOOGLE_SHEET_ID (optional)"
echo ""
echo "5. Enable GitHub Actions in your repository"
echo ""
echo -e "${GREEN}🚀 Your automated system will run every 15 minutes!${NC}"