import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';

// Read the configuration file
const configPath = path.join(__dirname, '../infrastructure_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export interface ECRProps extends cdk.StackProps {}

export class ECR extends Construct {
    public readonly repository: ecr.Repository;

    constructor(scope: Construct, id: string, props: ECRProps = {}) {
        super(scope, id);

        // Create an ECR repository
        this.repository = new ecr.Repository(this, 'ApplicationRepository', {
            repositoryName: `${config.application_name.toLowerCase()}-repo`,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // Delete the repository when the stack is deleted
            imageScanOnPush: true, // Enable vulnerability scanning for images
            lifecycleRules: [
                {
                    maxImageCount: 5, // Keep only the latest 5 images
                    description: 'Keep only the latest 5 images',
                },
            ],
        });

        // Add tags to the repository
        cdk.Tags.of(this.repository).add('stack-name', config.stack_name);
        cdk.Tags.of(this.repository).add('Application', 'WarungIntegrasiRasaEB');
    }
}