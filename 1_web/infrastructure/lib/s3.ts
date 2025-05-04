import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';

// Read the configuration file
const configPath = path.join(__dirname, '../infrastructure_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export interface S3Props extends cdk.StackProps {}

export class S3 extends Construct {
    public readonly bucket: s3.Bucket;

    constructor(scope: Construct, id: string, props: S3Props = {}) {
        super(scope, id);

        // Create an S3 bucket
        this.bucket = new s3.Bucket(this, 'ApplicationBucket', {
            bucketName: `elasticbeanstalk-${config.region}-${config.application_name.toLowerCase()}`,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // Delete the bucket when the stack is deleted
            autoDeleteObjects: true, // Automatically delete objects in the bucket when the bucket is deleted
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Block all public access
            encryption: s3.BucketEncryption.S3_MANAGED, // Use S3-managed encryption
            versioned: false, // Disable versioning for simplicity
        });

        // Add tags to the bucket
        cdk.Tags.of(this.bucket).add('stack-name', config.stack_name);
        cdk.Tags.of(this.bucket).add('Application', 'WarungIntegrasiRasaEB');
    }
}