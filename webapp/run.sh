#!/bin/bash
# R2B Progress Viewer 起動スクリプト

cd "$(dirname "$0")/.."

# venv がなければ作成
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install pyyaml fastapi uvicorn markdown
else
    source .venv/bin/activate
fi

echo "Starting R2B Progress Viewer..."
echo "Open http://localhost:8000 in your browser"
python3 webapp/server.py
