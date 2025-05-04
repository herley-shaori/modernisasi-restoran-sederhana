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

# Upload the ZIP file to S3
echo "Uploading $OUTPUT_ZIP to S3 bucket: $S3_BUCKET..."
aws s3 cp "$OUTPUT_ZIP" "s3://$S3_BUCKET/$OUTPUT_ZIP" --region "$REGION" || { echo "Failed to upload to S3"; exit 1; }

echo "Upload to S3 completed successfully."

# Check if the application version already exists
echo "Checking if application version $VERSION_LABEL exists..."
VERSION_EXISTS=$(aws elasticbeanstalk describe-application-versions \
    --application-name "$APP_NAME" \
    --version-label "$VERSION_LABEL" \
    --region "$REGION" \
    --no-cli-pager | jq -r '.ApplicationVersions | length')

if [ "$VERSION_EXISTS" -gt 0 ]; then
    echo "Error: Application version $VERSION_LABEL already exists. Please try again."
    exit 1
fi

# Create an Elastic Beanstalk application version
echo "Creating Elastic Beanstalk application version: $VERSION_LABEL..."
aws elasticbeanstalk create-application-version \
    --application-name "$APP_NAME" \
    --version-label "$VERSION_LABEL" \
    --source-bundle S3Bucket="$S3_BUCKET",S3Key="$OUTPUT_ZIP" \
    --region "$REGION" || { echo "Failed to create application version"; exit 1; }

echo "Application version $VERSION_LABEL created successfully."

# Wait for the environment to be in a Ready state
echo "Checking environment status before deployment..."
MAX_ATTEMPTS=30
ATTEMPT=1
while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    STATUS=$(aws elasticbeanstalk describe-environments \
        --environment-name "$ENV_NAME" \
        --region "$REGION" \
        --no-cli-pager | jq -r '.Environments[0].Status')

    if [ "$STATUS" = "Ready" ]; then
        echo "Environment is Ready. Proceeding with deployment."
        break
    else
        echo "Environment status is $STATUS. Waiting 10 seconds... (Attempt $ATTEMPT/$MAX_ATTEMPTS)"
        sleep 10
        ATTEMPT=$((ATTEMPT + 1))
    fi

    if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
        echo "Error: Environment did not reach Ready state after $MAX_ATTEMPTS attempts."
        exit 1
    fi
done

# Update the Elastic Beanstalk environment
echo "Deploying version $VERSION_LABEL to environment: $ENV_NAME..."
aws elasticbeanstalk update-environment \
    --environment-name "$ENV_NAME" \
    --version-label "$VERSION_LABEL" \
    --region "$REGION" || { echo "Failed to update environment"; exit 1; }

echo "Deployment to Elastic Beanstalk initiated successfully."

# Check the environment status
echo "Checking Elastic Beanstalk environment status..."
aws elasticbeanstalk describe-environments \
    --environment-name "$ENV_NAME" \
    --region "$REGION" \
    --no-cli-pager | \
jq -r '.Environments[] | "Environment: \(.EnvironmentName)\nStatus: \(.Status)\nHealth: \(.Health)\nVersion: \(.VersionLabel)\nEndpoint: \(.EndpointURL)"' || { echo "Failed to retrieve environment status"; exit 1; }

echo "Environment status check completed."