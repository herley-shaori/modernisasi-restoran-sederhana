// elasticbeanstalk.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as elasticbeanstalk from 'aws-cdk-lib/aws-elasticbeanstalk';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as fs from 'fs';
import * as path from 'path';
import { Network } from './network';

const configPath = path.join(__dirname, '../infrastructure_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export interface ElasticBeanstalkProps extends cdk.StackProps {
    network: Network;
    ecrRepository: ecr.Repository; // Add ECR repository to props
}

export class ElasticBeanstalk extends Construct {
    constructor(scope: Construct, id: string, props: ElasticBeanstalkProps) {
        super(scope, id);

        const vpc = props.network.vpc;

        const publicSubnets = vpc.selectSubnets({
            subnetType: ec2.SubnetType.PUBLIC,
        });

        const securityGroup = new ec2.SecurityGroup(this, 'EBSecurityGroup', {
            vpc,
            description: 'Security group for Elastic Beanstalk environment',
            allowAllOutbound: true,
        });

        securityGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(8501),
            'Allow Streamlit traffic'
        );

        const app = new elasticbeanstalk.CfnApplication(this, 'Application', {
            applicationName: config.application_name,
            description: 'Elastic Beanstalk application for WarungIntegrasiRasa Streamlit app',
        });

        const instanceRole = new iam.Role(this, 'InstanceRole', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkMulticontainerDocker'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWorkerTier'),
                // Add ECR read permissions
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
            ],
        });

        const instanceProfile = new iam.CfnInstanceProfile(this, 'InstanceProfile', {
            roles: [instanceRole.roleName],
        });

        // Define the Dockerrun.aws.json file to specify the ECR image
        const dockerrun = {
            AWSEBDockerrunVersion: '1',
            Image: {
                Name: `${props.ecrRepository.repositoryUri}:latest`,
                Update: 'true',
            },
            Ports: [
                {
                    ContainerPort: 8501,
                    HostPort: 80, // Map container port 8501 to host port 80
                },
            ],
        };

        // Create an application version with Dockerrun.aws.json
        const appVersion = new elasticbeanstalk.CfnApplicationVersion(this, 'AppVersion', {
            applicationName: app.applicationName!,
            sourceBundle: {
                s3Bucket: `elasticbeanstalk-${config.region}-${config.application_name.toLowerCase()}`,
                s3Key: 'Dockerrun.aws.json',
            },
        });

        // Ensure the S3 bucket has the Dockerrun.aws.json file
        // You will upload this manually or via a script
        const optionSettings: elasticbeanstalk.CfnEnvironment.OptionSettingProperty[] = [
            {
                namespace: 'aws:autoscaling:launchconfiguration',
                optionName: 'InstanceType',
                value: 't3.micro',
            },
            {
                namespace: 'aws:autoscaling:launchconfiguration',
                optionName: 'SecurityGroups',
                value: securityGroup.securityGroupId,
            },
            {
                namespace: 'aws:autoscaling:launchconfiguration',
                optionName: 'IamInstanceProfile',
                value: instanceProfile.attrArn,
            },
            {
                namespace: 'aws:ec2:vpc',
                optionName: 'VPCId',
                value: vpc.vpcId,
            },
            {
                namespace: 'aws:ec2:vpc',
                optionName: 'Subnets',
                value: publicSubnets.subnetIds.join(','),
            },
            {
                namespace: 'aws:elasticbeanstalk:environment',
                optionName: 'ServiceRole',
                value: 'aws-elasticbeanstalk-service-role',
            },
            {
                namespace: 'aws:autoscaling:asg',
                optionName: 'MinSize',
                value: '1',
            },
            {
                namespace: 'aws:autoscaling:asg',
                optionName: 'MaxSize',
                value: '2',
            },
        ];

        const env = new elasticbeanstalk.CfnEnvironment(this, 'Environment', {
            applicationName: app.applicationName!,
            environmentName: `${config.application_name}-env`,
            solutionStackName: '64bit Amazon Linux 2023 v4.5.1 running Docker', // Use Docker platform
            optionSettings,
            cnamePrefix: config.application_name.toLowerCase(),
            description: 'Elastic Beanstalk environment for WarungIntegrasiRasa Streamlit app',
            versionLabel: appVersion.ref, // Reference the application version
        });

        env.node.addDependency(instanceProfile);
        env.node.addDependency(appVersion);

        cdk.Tags.of(this).add('stack-name', config.stack_name);
        cdk.Tags.of(this).add('Application', 'WarungIntegrasiRasaEB');
    }
}