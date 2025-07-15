#!/bin/bash
# GitHub Repository Setup Script

echo "🚀 Setting up GitHub repository for AIS Tracking Application"
echo "============================================================"

# Set GitHub CLI path
GH_CLI="./gh_2.75.1_linux_amd64/bin/gh"

# Check if authenticated
if ! $GH_CLI auth status >/dev/null 2>&1; then
    echo "❌ Please authenticate with GitHub first:"
    echo "   $GH_CLI auth login --web"
    exit 1
fi

echo "✅ GitHub CLI authenticated"

# Create the repository
echo "📁 Creating GitHub repository..."
$GH_CLI repo create ais-tracking-app \
    --public \
    --description "Real-time AIS ship tracking application with Node.js, React, and PostgreSQL" \
    --clone=false

if [ $? -eq 0 ]; then
    echo "✅ Repository created successfully!"
    
    # Add remote origin
    echo "🔗 Adding remote origin..."
    REPO_URL=$($GH_CLI repo view --json sshUrl -q .sshUrl)
    git remote add origin $REPO_URL
    
    # Push to GitHub
    echo "📤 Pushing code to GitHub..."
    git push -u origin main
    
    if [ $? -eq 0 ]; then
        echo "🎉 Successfully pushed to GitHub!"
        echo "🌐 Repository URL: $($GH_CLI repo view --json htmlUrl -q .htmlUrl)"
        echo ""
        echo "✨ What's next:"
        echo "   1. GitHub Actions will automatically run tests"
        echo "   2. Connect repository to Render for deployment"
        echo "   3. Ready to continue with Phase 2 development"
    else
        echo "❌ Failed to push to GitHub"
        exit 1
    fi
else
    echo "❌ Failed to create repository"
    exit 1
fi