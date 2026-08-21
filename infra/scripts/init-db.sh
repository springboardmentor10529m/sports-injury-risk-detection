#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
while ! nc -z postgres 5432; do
  sleep 1
done
echo "PostgreSQL started"

echo "Running TimescaleDB extension setup..."
PGPASSWORD=$POSTGRES_PASSWORD psql -h postgres -U $POSTGRES_USER -d $POSTGRES_DB -c "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"

echo "Running Alembic migrations..."
# Assuming backend directory contains alembic.ini
cd ../../backend && alembic upgrade head

echo "Creating MongoDB indexes..."
# Basic Mongo setup
mongosh "mongodb://safemove:safemove_dev@mongodb:27017/safemove?authSource=admin" --eval '
  db.getSiblingDB("safemove").createCollection("videos");
  db.getSiblingDB("safemove").videos.createIndex({ "athlete_id": 1 });
'

echo "Database initialization complete."
