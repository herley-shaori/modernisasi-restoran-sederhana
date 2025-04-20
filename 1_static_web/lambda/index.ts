import { S3Client, ListBucketsCommand, GetBucketLocationCommand } from '@aws-sdk/client-s3';

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

            // Check if the bucket name starts with 'cdk-'
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

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: filteredBuckets.length > 0 ? 'S3 buckets found.' : 'No S3 buckets found with prefix cdk- in ap-southeast-3.',
                buckets: filteredBuckets,
            }),
        };
    } catch (error) {
        console.error('Error fetching S3 buckets:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error fetching S3 buckets.',
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};