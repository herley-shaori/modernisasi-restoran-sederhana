#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ModernisasiRestoranSederhanaStack } from '../lib/1_static_web-stack';

const app = new cdk.App();
new ModernisasiRestoranSederhanaStack(app, 'ModernisasiRestoranSederhanaStack', {
    // Tie the stack to the AWS Account and Region from the CLI configuration
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});