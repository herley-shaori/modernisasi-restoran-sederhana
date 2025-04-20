import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export class ModernisasiRestoranSederhanaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Apply tags to all resources in the stack
    cdk.Tags.of(this).add('Project', 'restaurant');

    // Define a Lambda function
    const helloWorldLambda = new lambda.Function(this, 'HelloWorldLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      timeout: cdk.Duration.seconds(30),
    });

    // Grant S3 permissions to the Lambda function
    helloWorldLambda.addToRolePolicy(
        new iam.PolicyStatement({
          actions: [
            's3:ListAllMyBuckets',
            's3:GetBucketLocation',
            's3:ListBucket',
            's3:DeleteObject',
            's3:DeleteBucket',
          ],
          resources: ['*'], // Allows access to all S3 buckets for these operations
        })
    );

    // Output the Lambda function ARN
    new cdk.CfnOutput(this, 'LambdaArn', {
      value: helloWorldLambda.functionArn,
      description: 'The ARN of the Hello World Lambda Function',
    });
  }
}