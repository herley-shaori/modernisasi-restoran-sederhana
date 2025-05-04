import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface NetworkProps extends cdk.StackProps {
    maxAzs?: number;
    cidr?: string;
}

export class Network extends Construct {
    public readonly vpc: ec2.Vpc;

    constructor(scope: Construct, id: string, props: NetworkProps = {}) {
        super(scope, id);

        // Create VPC with /16 CIDR
        this.vpc = new ec2.Vpc(this, 'VPC', {
            cidr: props.cidr || '10.0.0.0/16',
            maxAzs: props.maxAzs || 3,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'Public',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: 'Private',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
            ],
            // Enable DNS support and hostnames
            enableDnsHostnames: true,
            enableDnsSupport: true,
        });

        // Add tags to VPC
        cdk.Tags.of(this.vpc).add('Name', 'WebsiteVPC');
    }
}