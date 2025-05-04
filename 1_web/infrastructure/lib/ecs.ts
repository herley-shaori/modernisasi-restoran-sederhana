import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';

// Read the configuration file
const configPath = path.join(__dirname, '../infrastructure_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export interface ECSProps extends cdk.StackProps {
    vpc: ec2.IVpc;
    ecrRepository: ecr.Repository;
}

export class ECS extends Construct {
    constructor(scope: Construct, id: string, props: ECSProps) {
        super(scope, id);

        // Create an ECS cluster in the provided VPC
        const cluster = new ecs.Cluster(this, 'ECSCluster', {
            clusterName: `${config.application_name}-Cluster`,
            vpc: props.vpc,
        });

        // Add EC2 capacity to the cluster
        const autoScalingGroup = cluster.addCapacity('EC2Capacity', {
            instanceType: new ec2.InstanceType('t3.micro'),
            minCapacity: 1,
            maxCapacity: 3,
            desiredCapacity: 1,
            vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
        });

        // Get the instance role created by addCapacity
        const instanceRole = autoScalingGroup.role;

        // Attach the AmazonEC2ContainerServiceforEC2Role policy to the instance role
        instanceRole.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2ContainerServiceforEC2Role')
        );

        // Allow the instance role to pull images from ECR
        props.ecrRepository.grantPull(instanceRole);

        // Create a task definition with AWS_VPC network mode
        const taskDefinition = new ecs.Ec2TaskDefinition(this, 'TaskDefinition', {
            family: `${config.application_name}-Task`,
            networkMode: ecs.NetworkMode.AWS_VPC,
        });

        // Add a container to the task definition
        const container = taskDefinition.addContainer('AppContainer', {
            image: ecs.ContainerImage.fromEcrRepository(props.ecrRepository, 'latest'),
            memoryLimitMiB: 512,
            cpu: 256,
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'warung-integrasi-rasa',
                logRetention: cdk.aws_logs.RetentionDays.ONE_MONTH,
            }),
        });

        // Map port 8501 for the Streamlit application
        container.addPortMappings({
            containerPort: 8501,
            hostPort: 8501,
            protocol: ecs.Protocol.TCP,
        });

        // Create a security group for the ECS service
        const serviceSecurityGroup = new ec2.SecurityGroup(this, 'ServiceSecurityGroup', {
            vpc: props.vpc,
            description: 'Security group for ECS service',
            allowAllOutbound: true,
        });

        // Allow inbound traffic on port 8501
        serviceSecurityGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(8501),
            'Allow HTTP traffic on port 8501'
        );

        // Create an Application Load Balancer
        const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
            vpc: props.vpc,
            internetFacing: true,
            securityGroup: new ec2.SecurityGroup(this, 'ALBSecurityGroup', {
                vpc: props.vpc,
                allowAllOutbound: true,
            }),
        });

        // Add listener to ALB
        const listener = alb.addListener('Listener', {
            port: 80,
            open: true,
        });

        // Create an ECS service
        const service = new ecs.Ec2Service(this, 'ECSService', {
            cluster,
            taskDefinition,
            desiredCount: 1,
            vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
            securityGroups: [serviceSecurityGroup],
        });

        // Add the service to the ALB target group with explicit protocol
        listener.addTargets('ECSTarget', {
            port: 8501,
            protocol: elbv2.ApplicationProtocol.HTTP,  // Explicitly specify HTTP
            targets: [service],
            healthCheck: {
                path: '/',
                port: '8501',
                protocol: elbv2.Protocol.HTTP,
                interval: cdk.Duration.seconds(30),
                timeout: cdk.Duration.seconds(5),
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 5,
            },
        });

        // Grant ECS task execution role permissions to pull from ECR
        props.ecrRepository.grantPull(taskDefinition.taskRole);

        // Add tags to resources
        cdk.Tags.of(cluster).add('stack-name', config.stack_name);
        cdk.Tags.of(cluster).add('Application', 'WarungIntegrasiRasaEB');
        cdk.Tags.of(taskDefinition).add('stack-name', config.stack_name);
        cdk.Tags.of(taskDefinition).add('Application', 'WarungIntegrasiRasaEB');
        cdk.Tags.of(service).add('stack-name', config.stack_name);
        cdk.Tags.of(service).add('Application', 'WarungIntegrasiRasaEB');
        cdk.Tags.of(alb).add('stack-name', config.stack_name);
        cdk.Tags.of(alb).add('Application', 'WarungIntegrasiRasaEB');

        // Output the ALB DNS name
        new cdk.CfnOutput(this, 'ALBDnsName', {
            value: alb.loadBalancerDnsName,
            description: 'DNS name of the Application Load Balancer',
        });
    }
}