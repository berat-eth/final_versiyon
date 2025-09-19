#!/bin/bash

echo "🚀 Starting Notification System Test..."
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if axios is installed
if ! npm list axios &> /dev/null; then
    echo "📦 Installing axios..."
    npm install axios
fi

# Run the test
echo "🧪 Running notification tests..."
node test-notifications-remote.js

echo ""
echo "✅ Test completed!"
echo "========================================"
