import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

vi.mock("@aws-sdk/client-ec2", () => {
  return {
    EC2Client: class {
      send(command: any) {
        if (command.constructor.name === "DescribeImagesCommand") {
          return Promise.resolve({
            Images: [{ ImageId: "ami-dynamic12345", CreationDate: "2024-01-01T00:00:00.000Z" }],
          });
        }
        if (command.constructor.name === "RunInstancesCommand") {
          return Promise.resolve({
            Instances: [{ InstanceId: "i-0123456789abcdef0" }],
          });
        }
        return Promise.resolve({});
      }
    },
    DescribeImagesCommand: class {
      constructor(public input: any) {}
    },
    RunInstancesCommand: class {
      constructor(public input: any) {}
    },
  };
});

import { POST } from "./route";

describe("POST /api/deploy-poc route handler", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("dynamically resolves AMI ID when AWS_AMI_ID is not provided", async () => {
    delete process.env.AWS_AMI_ID;

    const res = await POST();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.instanceId).toBe("i-0123456789abcdef0");
  });
});



