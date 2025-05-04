import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';

// Read and parse the configuration file
const configPath = path.join(__dirname, '../infrastructure_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    // Merge the provided props with the description from config
    const stackProps: cdk.StackProps = {
      ...props,
      description: config.description,
    };


    // Apply the stack-name tag to all resources in the stack
    super(scope, id, stackProps);
    cdk.Tags.of(this).add('stack-name', config.stack_name);
  }
}