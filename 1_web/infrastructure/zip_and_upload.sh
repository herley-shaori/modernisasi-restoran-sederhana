#!/bin/bash

# Set error handling
set -e

# Define paths
CONFIG_PATH="infrastructure_config.json"
APP_DIR="../application"
BUILDSPEC_PATH="lib/codebuild/buildspec.yml"
ZIP_FILE="warung-integrasi-rasa-app.zip"
SCRIPT_DIR="$(pwd)"

# Log current working directory
echo "Current working directory: $SCRIPT_DIR"

# Validate required files
echo "Validating required files..."
if [ ! -f "$CONFIG_PATH" ]; then
  echo "Error: Configuration file not found at $CONFIG_PATH"
  exit 1
fi
if [ ! -d "$APP_DIR" ]; then
  echo "Error: Application directory not found at $APP_DIR"
  exit 1
fi
if [ ! -f "$APP_DIR/app.py" ]; then
  echo "Error: app.py not found in $APP_DIR"
  exit 1
fi
if [ ! -f "$APP_DIR/Dockerfile" ]; then
  echo "Error: Dockerfile not found in $APP_DIR"
  exit 1
fi
if [ ! -f "$BUILDSPEC_PATH" ]; then
  echo "Error: buildspec.yml not found at $BUILDSPEC_PATH"
  exit 1
fi
if [ ! -f "$APP_DIR/requirements.txt" ]; then
  echo "Warning: requirements.txt not found in $APP_DIR. Continuing, but ensure it's not required."
fi

# Log unexpected files in application directory
echo "Checking for unexpected files in $APP_DIR..."
find "$APP_DIR" -type f -not -name "app.py" -not -name "Dockerfile" -not -name "requirements.txt" -not -path "*/.ebextensions/*" | while read -r file; do
  echo "Warning: Found unexpected file: $file"
done

# Extract region and application name from config
REGION=$(jq -r '.region' "$CONFIG_PATH")
APP_NAME=$(jq -r '.application_name' "$CONFIG_PATH" | tr '[:upper:]' '[:lower:]')

# Construct S3 bucket name as defined in s3.ts
S3_BUCKET="elasticbeanstalk-${REGION}-${APP_NAME}"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "Error: jq is required to parse JSON. Please install jq (e.g., 'brew install jq' or 'sudo apt install jq')."
  exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
  echo "Error: AWS CLI is required. Please install AWS CLI."
  exit 1
fi

# Create a temporary directory for zipping
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

# Copy application folder contents to temp directory
echo "Copying application files from $APP_DIR to temporary directory..."
cp -r "$APP_DIR"/* "$TEMP_DIR/"

# Copy buildspec.yml to temp directory root
echo "Copying buildspec.yml to temporary directory..."
cp "$BUILDSPEC_PATH" "$TEMP_DIR/buildspec.yml"

# Create zip file directly in SCRIPT_DIR
echo "Creating zip file: $ZIP_FILE in $SCRIPT_DIR..."
cd "$TEMP_DIR"
zip -r "$SCRIPT_DIR/$ZIP_FILE" . -x "*.DS_Store"
cd "$SCRIPT_DIR"

# Check if zip file exists
if [ ! -f "$ZIP_FILE" ]; then
  echo "Error: Zip file $ZIP_FILE was not created"
  exit 1
fi

# Verify zip contents
echo "Verifying zip contents..."
unzip -l "$ZIP_FILE" | grep -E "buildspec.yml|app.py|Dockerfile" || {
  echo "Error: Zip file does not contain expected files (buildspec.yml, app.py, Dockerfile)"
  exit 1
}

# Upload zip file to S3
echo "Uploading $ZIP_FILE to s3://$S3_BUCKET/"
aws s3 cp "$ZIP_FILE" "s3://$S3_BUCKET/$ZIP_FILE" --region "$REGION"

# Clean up
rm "$ZIP_FILE"

echo "Successfully zipped application and buildspec.yml, and uploaded to s3://$S3_BUCKET/$ZIP_FILE"