#!/opt/homebrew/opt/node/bin/node
import * as cdk from 'aws-cdk-lib';
import { InfrastructureStack } from '../lib/infrastructure-stack';
import * as fs from 'fs';
import * as path from 'path';

// Read the configuration file
const configPath = path.resolve(__dirname, '../infrastructure_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = new cdk.App();
new InfrastructureStack(app, config.stack_name, {});