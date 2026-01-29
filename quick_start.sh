#!/bin/bash

echo "================================"
echo "  UNI - Quick Start Script"
echo "================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found!"
    echo ""
    echo "Install Node.js:"
    echo "→ Mac: brew install node"
    echo "→ Windows: Download from https://nodejs.org"
    echo "→ Linux: sudo apt install nodejs npm"
    exit 1
fi

echo "✓ Node.js $(node -v)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Installation failed"
    exit 1
fi

echo "✓ Dependencies installed"
echo ""
echo "🚀 Starting Uni..."
echo ""
echo "   Open: http://localhost:3000"
echo "   Stop:  Press Ctrl+C"
echo ""
echo "================================"
echo ""

npm start
