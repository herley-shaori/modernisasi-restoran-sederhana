import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as fs from 'fs';
import * as path from 'path';

// Read the configuration file
const configPath = path.join(__dirname, '../infrastructure_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export interface NetworkProps extends cdk.StackProps {
    maxAzs?: number;
}

export class Network extends Construct {
    public readonly vpc: ec2.Vpc;

    constructor(scope: Construct, id: string, props: NetworkProps = {}) {
        super(scope, id);

        // Map subnet types from config to CDK SubnetType
        const subnetConfiguration = config.network.subnets.map((subnet: any) => ({
            cidrMask: subnet.cidrMask,
            name: subnet.name,
            subnetType: subnet.type === 'PUBLIC' ? ec2.SubnetType.PUBLIC : ec2.SubnetType.PRIVATE_ISOLATED,
        }));

        // Create VPC with CIDR from config
        this.vpc = new ec2.Vpc(this, 'VPC', {
            cidr: config.network.vpcCidr || '10.0.0.0/16',
            maxAzs: props.maxAzs || 3,
            subnetConfiguration,
            // Enable DNS support and hostnames
            enableDnsHostnames: true,
            enableDnsSupport: true,
        });

        // Add tags to VPC
        cdk.Tags.of(this.vpc).add('Name', 'WebsiteVPC');
    }
}