import { RDSClient, CreateDBInstanceCommand } from "@aws-sdk/client-rds";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST() {
  try {
    const region = process.env.AWS_REGION || "us-east-1";
    const rdsClient = new RDSClient({ region });

    let dbName = process.env.AWS_RDS_DB_NAME || "n8n";
    // Sanitize DBName: must begin with a letter and contain only alphanumeric characters
    dbName = dbName.replace(/[^a-zA-Z0-9]/g, "");
    if (!/^[a-zA-Z]/.test(dbName)) {
      dbName = "db" + dbName;
    }

    const masterUsername = process.env.AWS_RDS_USERNAME || "postgres";
    const masterPassword = process.env.AWS_RDS_PASSWORD;

    if (!masterPassword) {
      return NextResponse.json(
        { error: "AWS_RDS_PASSWORD environment variable is not set." },
        { status: 400 }
      );
    }

    // Generate a unique identifier for the RDS instance
    const dbInstanceIdentifier = `n8n-db-${crypto.randomBytes(4).toString("hex")}`;

    const command = new CreateDBInstanceCommand({
      DBInstanceIdentifier: dbInstanceIdentifier,
      DBName: dbName,
      Engine: "postgres",
      DBInstanceClass: "db.t3.micro",
      MasterUsername: masterUsername,
      MasterUserPassword: masterPassword,
      AllocatedStorage: 20,
      StorageType: "gp2",
      PubliclyAccessible: true,
    });

    const response = await rdsClient.send(command);
    
    if (!response.DBInstance) {
      throw new Error("Failed to create RDS instance");
    }

    return NextResponse.json({
      message: "RDS instance is being provisioned",
      dbInstanceIdentifier: response.DBInstance.DBInstanceIdentifier,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred while launching RDS instance.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
