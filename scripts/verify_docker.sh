#!/usr/bin/env bash
set -e

echo "======================================================================"
echo "SafeMove Docker Container Verification"
echo "======================================================================"

python scripts/verify_docker.py
