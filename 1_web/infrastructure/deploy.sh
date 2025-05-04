#!/bin/bash

# Set error handling
set -e

# Log current working directory
echo "Current working directory: $(pwd)"

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

echo "Deployment completed successfully, including zip file upload to S3"