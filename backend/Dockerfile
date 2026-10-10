# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (some yt-dlp extractors might need it, and it was in requirements)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy requirements.txt
COPY requirements.txt .

# Install Python dependencies
# Using --no-cache-dir to keep the image small
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose the port the app runs on (Railway provides $PORT)
EXPOSE 8000

# Command to run the application using Uvicorn
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
