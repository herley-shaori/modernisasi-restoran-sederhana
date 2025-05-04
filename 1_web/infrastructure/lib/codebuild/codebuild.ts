import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';

// Read the configuration file
const configPath = path.join(__dirname, '../../infrastructure_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export interface CodeBuildProps extends cdk.StackProps {
    ecrRepository: ecr.Repository;
}

export class CodeBuild extends Construct {
    public readonly project: codebuild.PipelineProject;

    constructor(scope: Construct, id: string, props: CodeBuildProps) {
        super(scope, id);

        // Create the CodeBuild project
        this.project = new codebuild.PipelineProject(this, 'BuildProject', {
            projectName: `${config.application_name}-Build`,
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
                privileged: true, // Required for Docker builds
            },
            buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
            environmentVariables: {
                ECR_REPOSITORY_URI: {
                    value: props.ecrRepository.repositoryUri,
                },
                AWS_DEFAULT_REGION: {
                    value: config.region,
                },
                IMAGE_TAG: {
                    value: 'latest',
                },
            },
        });

        // Grant CodeBuild permissions to push to ECR
        props.ecrRepository.grantPullPush(this.project);

        // Add additional permissions for Docker login and push
        this.project.addToRolePolicy(
            new iam.PolicyStatement({
                actions: [
                    'ecr:GetAuthorizationToken',
                    'ecr:BatchCheckLayerAvailability',
                    'ecr:CompleteLayerUpload',
                    'ecr:InitiateLayerUpload',
                    'ecr:PutImage',
                    'ecr:UploadLayerPart',
                ],
                resources: ['*'],
            })
        );

        // Add tags to the CodeBuild project
        cdk.Tags.of(this.project).add('stack-name', config.stack_name);
        cdk.Tags.of(this.project).add('Application', 'WarungIntegrasiRasaEB');
    }
}