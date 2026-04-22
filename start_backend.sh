#!/bin/bash
cd /home/runner/workspace
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload --reload-exclude "*/node_modules/*" --reload-exclude "mobile/*"
