#!/bin/bash

# Set error handling
set -e

# Log current working directory
echo "Current working directory: $(pwd)"

# Define variables
PROJECT_NAME="WarungIntegrasiRasa-Build"
REGION="ap-southeast-3"

# Step 1: Build the CDK project
echo "Building CDK project..."
npm run build

# Step 2: Deploy all CDK stacks
echo "Deploying CDK stacks..."
cdk deploy --all --require-approval never

# Step 3: Check if zip_and_upload.sh exists
ZIP_SCRIPT="./zip_and_upload.sh"
if [ ! -f "$ZIP_SCRIPT" ]; then
  echo "Error: $ZIP_SCRIPT not found"
  exit 1
fi

# Step 4: Ensure zip_and_upload.sh is executable
chmod +x "$ZIP_SCRIPT"

# Step 5: Run zip_and_upload.sh to create and upload the zip file
echo "Running $ZIP_SCRIPT to create and upload zip file..."
"$ZIP_SCRIPT"

# Step 6: Start the CodeBuild project
echo "Starting CodeBuild project: $PROJECT_NAME..."
aws codebuild start-build --project-name "$PROJECT_NAME" --region "$REGION"

echo "Deployment completed successfully, zip file uploaded to S3, and CodeBuild project started"