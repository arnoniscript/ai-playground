#!/bin/bash

# Setup script for AI Marisa Playground
# This script initializes both backend and frontend

set -e

echo "🚀 AI Marisa Playground - Setup Script"
echo "========================================"

# Check Node version
echo "Checking Node.js version..."
node_version=$(node -v)
echo "✓ Node.js $node_version"

# Backend setup
echo ""
echo "📦 Setting up backend..."
cd backend
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local from .env.example"
    cp .env.example .env.local
    echo "⚠️  Please fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, and JWT_SECRET in backend/.env.local"
fi

echo "Installing backend dependencies..."
npm install
echo "✓ Backend dependencies installed"

# Frontend setup
echo ""
echo "📦 Setting up frontend..."
cd ../frontend
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local from .env.example"
    cp .env.example .env.local
    echo "⚠️  Please fill in NEXT_PUBLIC_API_URL and Supabase keys in frontend/.env.local"
fi

echo "Installing frontend dependencies..."
npm install
echo "✓ Frontend dependencies installed"

# Summary
echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Fill in .env.local files with your Supabase credentials"
echo "2. Create database schema in Supabase using supabase/migrations/001_initial_schema.sql"
echo "3. Run backend: cd backend && npm run dev"
echo "4. Run frontend: cd frontend && npm run dev"
echo "5. Visit http://localhost:3000"
