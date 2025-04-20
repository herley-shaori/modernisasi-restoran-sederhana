import { S3Client, ListBucketsCommand, GetBucketLocationCommand, ListObjectsV2Command, DeleteObjectsCommand, DeleteBucketCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'ap-southeast-3' });

export const handler = async (event: any): Promise<any> => {
    try {
        console.log('Fetching S3 buckets...');

        // List all S3 buckets
        const listBucketsCommand = new ListBucketsCommand({});
        const listBucketsResponse = await s3Client.send(listBucketsCommand);

        if (!listBucketsResponse.Buckets) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'No S3 buckets found.',
                    buckets: [],
                }),
            };
        }

        // Filter buckets by region and prefix
        const targetRegion = 'ap-southeast-3';
        const prefix = 'cicd-';
        const filteredBuckets: { name: string, arn: string }[] = [];

        for (const bucket of listBucketsResponse.Buckets) {
            if (!bucket.Name) continue;

            // Check if the bucket name starts with 'cicd-'
            if (!bucket.Name.startsWith(prefix)) continue;

            // Get the bucket's region
            const getLocationCommand = new GetBucketLocationCommand({ Bucket: bucket.Name });
            const locationResponse = await s3Client.send(getLocationCommand);
            const bucketRegion = locationResponse.LocationConstraint || 'ap-southeast-3';

            // Include the bucket if it's in ap-southeast-3
            if (bucketRegion === targetRegion) {
                const bucketArn = `arn:aws:s3:::${bucket.Name}`;
                filteredBuckets.push({ name: bucket.Name, arn: bucketArn });
            }
        }

        // Delete objects and buckets
        for (const bucket of filteredBuckets) {
            console.log(`Processing bucket: ${bucket.name}`);

            // List all objects in the bucket
            let continuationToken: string | undefined;
            do {
                const listObjectsCommand = new ListObjectsV2Command({
                    Bucket: bucket.name,
                    ContinuationToken: continuationToken,
                });
                const listObjectsResponse = await s3Client.send(listObjectsCommand);

                if (listObjectsResponse.Contents && listObjectsResponse.Contents.length > 0) {
                    // Delete all objects in the bucket
                    const deleteObjectsCommand = new DeleteObjectsCommand({
                        Bucket: bucket.name,
                        Delete: {
                            Objects: listObjectsResponse.Contents.map((object) => ({
                                Key: object.Key!,
                            })),
                        },
                    });
                    await s3Client.send(deleteObjectsCommand);
                    console.log(`Deleted objects in bucket: ${bucket.name}`);
                }

                continuationToken = listObjectsResponse.NextContinuationToken;
            } while (continuationToken);

            // Delete the bucket
            const deleteBucketCommand = new DeleteBucketCommand({ Bucket: bucket.name });
            await s3Client.send(deleteBucketCommand);
            console.log(`Deleted bucket: ${bucket.name}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: filteredBuckets.length > 0 ? 'S3 buckets found and deleted.' : 'No S3 buckets found with prefix cicd- in ap-southeast-3.',
                buckets: filteredBuckets,
            }),
        };
    } catch (error) {
        console.error('Error processing S3 buckets:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error processing S3 buckets.',
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};