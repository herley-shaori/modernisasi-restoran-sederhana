REPO_NAME="warungintegrasirasa-repo"
REGION="ap-southeast-3"

# Get all image digests and delete them
IMAGE_IDS=$(aws ecr list-images --repository-name $REPO_NAME --region $REGION --query 'imageIds[*].imageDigest' --output text)
if [ -n "$IMAGE_IDS" ]; then
  echo "Deleting images from $REPO_NAME..."
  aws ecr batch-delete-image --repository-name $REPO_NAME --image-ids $(echo $IMAGE_IDS | tr ' ' '\n' | sed 's/^/imageDigest=/') --region $REGION
  echo "All images deleted."
else
  echo "No images found in $REPO_NAME."
fi
cdk destroy --all --force