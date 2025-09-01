#!/bin/bash

echo "Starting the application..."
echo ""

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "Checking prerequisites..."
if ! command_exists python3; then
    echo "Python 3 is required but not installed."
    exit 1
fi

if ! command_exists node; then
    echo "Node.js is required but not installed."
    exit 1
fi

if ! command_exists npm; then
    echo "npm is required but not installed."
    exit 1
fi

echo "All prerequisites are installed!"
echo ""

echo "Starting FastAPI backend..."
cd backend

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Starting backend server on http://localhost:8000"
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd ..

echo "Starting React frontend..."
cd frontend


echo "Installing Node.js dependencies..."
npm install

s
echo "Starting frontend server on http://localhost:3000"
npm start &
FRONTEND_PID=$!

cd ..

sleep 5 

s
echo "Opening the app in Safari..."
open -a Safari http://localhost:3000

echo ""
echo "Pulsar App is starting up!"
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all services"

trap 'echo ""; echo "Stopping services..."; kill $BACKEND_PID $FRONTEND_PID; exit' INT
wait