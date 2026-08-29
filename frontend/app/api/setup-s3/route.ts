import { NextResponse } from 'next/server';
import { 
  S3Client, 
  CreateBucketCommand, 
  PutPublicAccessBlockCommand 
} from '@aws-sdk/client-s3';
import { randomBytes } from 'crypto';

export async function POST() {
  try {
    const region = process.env.AWS_REGION || 'us-east-1';
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
        sessionToken: process.env.AWS_SESSION_TOKEN as string, // often needed in learner labs
      },
    });

    const prefix = process.env.S3_BUCKET_PREFIX || 'n8n-backups-';
    // Generate a short random hex string to ensure global uniqueness
    const randomSuffix = randomBytes(4).toString('hex');
    const bucketName = `${prefix}${randomSuffix}`.toLowerCase();

    console.log(`Creating S3 bucket: ${bucketName} in region: ${region}`);

    // 1. Create the Bucket
    const createCommand = new CreateBucketCommand({
      Bucket: bucketName,
      // LocationConstraint is not needed for us-east-1, but required for others if specified.
      // For simplicity in AWS Learner Labs (usually us-east-1), we omit CreateBucketConfiguration unless needed.
    });

    await s3Client.send(createCommand);

    // 2. Block all public access (Strictly Private)
    const blockPublicAccessCommand = new PutPublicAccessBlockCommand({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true,
      },
    });

    await s3Client.send(blockPublicAccessCommand);

    return NextResponse.json({ 
      success: true, 
      message: 'S3 bucket created successfully.',
      bucketName: bucketName 
    });

  } catch (error: any) {
    console.error('Error creating S3 bucket:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create S3 bucket' },
      { status: 500 }
    );
  }
}
