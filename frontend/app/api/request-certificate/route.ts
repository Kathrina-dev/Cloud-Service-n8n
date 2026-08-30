import { NextResponse } from 'next/server';
import { 
  ACMClient, 
  RequestCertificateCommand,
  DescribeCertificateCommand
} from '@aws-sdk/client-acm';

// Helper function to pause execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { domainName } = body;

    if (!domainName) {
      return NextResponse.json(
        { success: false, error: 'Domain name is required' },
        { status: 400 }
      );
    }

    const region = process.env.AWS_REGION || 'us-east-1';
    const acmClient = new ACMClient({ region });

    console.log(`Requesting ACM certificate for domain: ${domainName} in region: ${region}`);

    // 1. Request the certificate
    const requestCommand = new RequestCertificateCommand({
      DomainName: domainName,
      ValidationMethod: 'DNS',
      SubjectAlternativeNames: [domainName], // Can add more if needed later
    });

    const requestResponse = await acmClient.send(requestCommand);
    const certificateArn = requestResponse.CertificateArn;

    if (!certificateArn) {
      throw new Error('Failed to retrieve Certificate ARN after request.');
    }

    console.log(`Certificate requested. ARN: ${certificateArn}. Waiting for DNS records...`);

    // 2. Poll for DNS validation records
    // ACM takes a few seconds to generate the CNAME records. We poll up to 10 times.
    let dnsRecord = null;
    let attempts = 0;
    const maxAttempts = 10;

    while (!dnsRecord && attempts < maxAttempts) {
      attempts++;
      await delay(2000); // Wait 2 seconds between checks

      const describeCommand = new DescribeCertificateCommand({
        CertificateArn: certificateArn,
      });

      const describeResponse = await acmClient.send(describeCommand);
      const validationOptions = describeResponse.Certificate?.DomainValidationOptions;

      if (validationOptions && validationOptions.length > 0) {
        const option = validationOptions[0]; // We only requested one domain
        if (option.ResourceRecord) {
          dnsRecord = option.ResourceRecord;
          console.log(`DNS records generated after ${attempts} attempts.`);
        }
      }
    }

    if (!dnsRecord) {
      return NextResponse.json({
        success: true,
        message: 'Certificate requested, but DNS records are not ready yet. Please check the AWS Console.',
        certificateArn: certificateArn,
      });
    }

    // 3. Return the CNAME details to the frontend
    return NextResponse.json({ 
      success: true, 
      message: 'Certificate requested successfully. Please add the following DNS record to validate.',
      certificateArn: certificateArn,
      dnsRecord: {
        name: dnsRecord.Name,
        type: dnsRecord.Type,
        value: dnsRecord.Value
      }
    });

  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error requesting ACM certificate:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to request ACM certificate' },
      { status: 500 }
    );
  }
}
