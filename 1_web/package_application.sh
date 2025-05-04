#!/bin/bash

# Define the application directory, output ZIP file, and S3 details
APP_DIR="application"
OUTPUT_ZIP="warung_integrasi_rasa.zip"
S3_BUCKET="elasticbeanstalk-ap-southeast-3-warungintegrasirasa"
REGION="ap-southeast-3"
APP_NAME="WarungIntegrasiRasa"
ENV_NAME="WarungIntegrasiRasa-env"

# Generate a unique version label using a timestamp
VERSION_LABEL="v$(date +%Y%m%d%H%M%S)"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required to parse JSON output. Please install jq (e.g., 'brew install jq' on macOS or 'sudo apt install jq' on Ubuntu)."
    exit 1
fi

# Remove any existing ZIP file
if [ -f "$OUTPUT_ZIP" ]; then
    echo "Removing existing ZIP file: $OUTPUT_ZIP"
    rm "$OUTPUT_ZIP"
fi

# Navigate to the application directory and create the ZIP file
echo "Creating ZIP file from $APP_DIR..."
cd "$APP_DIR" || { echo "Failed to navigate to $APP_DIR"; exit 1; }
zip -r "../$OUTPUT_ZIP" . -x "*.DS_Store" || { echo "Failed to create ZIP file"; exit 1; }
cd ..

echo "ZIP file created successfully: $OUTPUT_ZIP"

echo "Environment status check completed."