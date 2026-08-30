import { NextResponse } from 'next/server';
import { 
  SecretsManagerClient, 
  CreateSecretCommand,
  PutSecretValueCommand
} from '@aws-sdk/client-secrets-manager';

export async function POST() {
  try {
    const region = process.env.AWS_REGION || 'us-east-1';
    const secretsClient = new SecretsManagerClient({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
        sessionToken: process.env.AWS_SESSION_TOKEN as string,
      },
    });

    const secretName = process.env.AWS_SECRET_NAME || 'n8n/prod/db-credentials';

    // Construct the secret payload from local .env variables
    const secretPayload = {
      dbname: process.env.AWS_RDS_DB_NAME || 'n8n',
      username: process.env.AWS_RDS_USERNAME || 'postgres',
      password: process.env.AWS_RDS_PASSWORD || '',
      host: process.env.AWS_RDS_HOST || '',
    };

    const secretString = JSON.stringify(secretPayload);
    let isCreated = false;

    try {
      // Attempt to create the secret first
      const createCommand = new CreateSecretCommand({
        Name: secretName,
        Description: 'Database credentials for n8n EC2 deployment',
        SecretString: secretString,
      });

      await secretsClient.send(createCommand);
      isCreated = true;
      console.log(`Successfully created new secret: ${secretName}`);
    } catch (err: unknown) {
      const error = err as Error;
      // If the secret already exists, we catch the ResourceExistsException and update it instead
      if (error.name === 'ResourceExistsException') {
        console.log(`Secret ${secretName} already exists. Updating its value...`);
        
        const updateCommand = new PutSecretValueCommand({
          SecretId: secretName,
          SecretString: secretString,
        });

        await secretsClient.send(updateCommand);
      } else {
        // If it's another error (e.g., permissions), re-throw it
        throw error;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Secret ${isCreated ? 'created' : 'updated'} successfully.`,
      secretName: secretName 
    });

  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error managing AWS Secret:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to manage AWS Secret' },
      { status: 500 }
    );
  }
}
