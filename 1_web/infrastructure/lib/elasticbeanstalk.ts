import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as elasticbeanstalk from 'aws-cdk-lib/aws-elasticbeanstalk';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as fs from 'fs';
import * as path from 'path';
import { Network } from './network';

// Read the configuration file
const configPath = path.join(__dirname, '../infrastructure_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export interface ElasticBeanstalkProps extends cdk.StackProps {
    network: Network;
}

export class ElasticBeanstalk extends Construct {
    constructor(scope: Construct, id: string, props: ElasticBeanstalkProps) {
        super(scope, id);

        // Reference the VPC from the Network construct
        const vpc = props.network.vpc;

        // Select only the public subnets
        const publicSubnets = vpc.selectSubnets({
            subnetType: ec2.SubnetType.PUBLIC,
        });

        // Create a security group for the Elastic Beanstalk environment
        const securityGroup = new ec2.SecurityGroup(this, 'EBSecurityGroup', {
            vpc,
            description: 'Security group for Elastic Beanstalk environment',
            allowAllOutbound: true,
        });

        // Allow inbound traffic on port 8501 (Streamlit)
        securityGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(8501),
            'Allow Streamlit traffic'
        );

        // Create an Elastic Beanstalk application
        const app = new elasticbeanstalk.CfnApplication(this, 'Application', {
            applicationName: config.application_name,
            description: 'Elastic Beanstalk application for WarungIntegrasiRasa Streamlit app',
        });

        // Define the IAM role for Elastic Beanstalk EC2 instances
        const instanceRole = new iam.Role(this, 'InstanceRole', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkMulticontainerDocker'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWorkerTier'),
            ],
        });

        // Create an instance profile for the role
        const instanceProfile = new iam.CfnInstanceProfile(this, 'InstanceProfile', {
            roles: [instanceRole.roleName],
        });

        // Define Elastic Beanstalk environment settings
        const optionSettings: elasticbeanstalk.CfnEnvironment.OptionSettingProperty[] = [
            {
                namespace: 'aws:autoscaling:launchconfiguration',
                optionName: 'InstanceType',
                value: 't3.micro', // Cost-effective instance type
            },
            {
                namespace: 'aws:ec2:vpc',
                optionName: 'VPCId',
                value: vpc.vpcId,
            },
            {
                namespace: 'aws:ec2:vpc',
                optionName: 'Subnets',
                value: publicSubnets.subnetIds.join(','), // Use public subnets
            },
            {
                namespace: 'aws:ec2:vpc',
                optionName: 'SecurityGroups',
                value: securityGroup.securityGroupId,
            },
            {
                namespace: 'aws:elasticbeanstalk:environment',
                optionName: 'ServiceRole',
                value: 'aws-elasticbeanstalk-service-role',
            },
            {
                namespace: 'aws:elasticbeanstalk:application:environment',
                optionName: 'PORT',
                value: '8501', // Streamlit default port
            },
            {
                namespace: 'aws:autoscaling:asg',
                optionName: 'MinSize',
                value: '1',
            },
            {
                namespace: 'aws:autoscaling:asg',
                optionName: 'MaxSize',
                value: '2', // Allow scaling up to 2 instances
            },
            {
                namespace: 'aws:elasticbeanstalk:environment:process:default',
                optionName: 'Port',
                value: '8501',
            },
            {
                namespace: 'aws:elasticbeanstalk:environment:process:default',
                optionName: 'HealthCheckPath',
                value: '/', // Streamlit default path
            },
        ];

        // Create the Elastic Beanstalk environment
        const env = new elasticbeanstalk.CfnEnvironment(this, 'Environment', {
            applicationName: app.applicationName!,
            environmentName: `${config.application_name}-env`,
            solutionStackName: '64bit Amazon Linux 2023 v4.5.1 running Python 3.13', // Updated solution stack
            optionSettings,
            cnamePrefix: config.application_name.toLowerCase(),
            description: 'Elastic Beanstalk environment for WarungIntegrasiRasa Streamlit app',
        });

        // Ensure the environment depends on the instance profile
        env.node.addDependency(instanceProfile);

        // Add tags to the environment (avoid reserved 'Name' tag)
        cdk.Tags.of(this).add('stack-name', config.stack_name);
        cdk.Tags.of(this).add('Application', 'WarungIntegrasiRasaEB');
    }
}