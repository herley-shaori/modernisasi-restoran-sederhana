import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';
import { Network } from './network';
import { S3 } from './s3';
import { ECR } from './ecr';
import { CodeBuild } from './codebuild/codebuild';
import { ECS } from './ecs';

const configPath = path.join(__dirname, '../infrastructure_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    const stackProps: cdk.StackProps = {
      ...props,
      description: config.description,
      env: {
        region: config.region,
      },
    };

    super(scope, id, stackProps);

    const network = new Network(this, 'Network', {
      maxAzs: 3,
    });

    const s3 = new S3(this, 'S3');

    const ecr = new ECR(this, 'ECR');

    const codebuild = new CodeBuild(this, 'CodeBuild', {
      ecrRepository: ecr.repository,
      s3Bucket: s3.bucket,
    });

    const ecs = new ECS(this, 'ECS', {
      vpc: network.vpc,
      ecrRepository: ecr.repository,
    });

    cdk.Tags.of(this).add('stack-name', config.stack_name);
  }
}