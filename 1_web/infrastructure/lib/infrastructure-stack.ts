import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';
import { Network } from './network';
import { ElasticBeanstalk } from './elasticbeanstalk';
import { S3 } from './s3';

// Read and parse the configuration file
const configPath = path.join(__dirname, '../infrastructure_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    // Merge the provided props with the description from config
    const stackProps: cdk.StackProps = {
      ...props,
      description: config.description,
      env: {
        region: config.region,
      },
    };

    super(scope, id, stackProps);

    // Create VPC using the Network construct
    const network = new Network(this, 'Network', {
      maxAzs: 3,
    });

    // Create S3 bucket for application storage
    const s3 = new S3(this, 'S3');

    // Create Elastic Beanstalk environment
    const elasticBeanstalk = new ElasticBeanstalk(this, 'ElasticBeanstalk', {
      network,
    });

    // Apply the stack-name tag to all resources in the stack
    cdk.Tags.of(this).add('stack-name', config.stack_name);
  }
}