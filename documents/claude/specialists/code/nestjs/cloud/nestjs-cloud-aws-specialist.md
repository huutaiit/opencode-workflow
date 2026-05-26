# NestJS Cloud AWS Specialist — Cloud
# NestJS クラウドAWSスペシャリスト — クラウド
# Chuyen Gia Cloud AWS NestJS — Cloud

**Version**: 1.0.0
**Technology**: NestJS 10+ AWS Integration
**Aspect**: Cloud AWS
**Category**: cloud
**Purpose**: Knowledge provider for NestJS AWS integration — S3 upload/presigned, SQS, Secrets Manager, Parameter Store, CloudWatch, Lambda triggers

---

## Metadata

```json
{
  "id": "nestjs-cloud-aws-specialist",
  "technology": "NestJS 10+ AWS Integration",
  "aspect": "Cloud AWS",
  "category": "cloud",
  "subcategory": "nestjs",
  "lines": 280,
  "token_cost": 1700,
  "version": "1.0.0",
  "evidence": [
    "E1: AWS SDK v3 — modular, tree-shakeable AWS client for Node.js",
    "E2: S3 patterns — upload, presigned URLs, streaming",
    "E3: SQS/SNS — message queue integration with NestJS"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 263.1–263.5 |
| **Directory Pattern** | `src/infrastructure/external/aws/` |
| **Dependencies** | @aws-sdk/client-s3, @aws-sdk/client-sqs, @aws-sdk/client-secrets-manager |
| **When To Use** | AWS service integration — S3, SQS, Secrets Manager |
| **Source Skeleton** | src/infrastructure/aws/{service}.service.ts |
| **Specialist Type** | code |
| **Purpose** | AWS integration — S3, SQS, SNS, Lambda, DynamoDB with NestJS |
| **Activation Trigger** | files: **/aws/**; keywords: aws, s3, sqs, sns, lambda, dynamodb |

---

## Patterns

### Pattern 263.1: S3 File Upload

```typescript
@Injectable()
export class S3Service {
  private readonly client = new S3Client({ region: process.env.AWS_REGION });

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
  }

  async getPresignedUploadUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(this.client, new PutObjectCommand({
      Bucket: process.env.S3_BUCKET, Key: key,
    }), { expiresIn });
  }

  async getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({
      Bucket: process.env.S3_BUCKET, Key: key,
    }), { expiresIn });
  }
}
```

### Pattern 263.2: SQS Integration

```typescript
@Injectable()
export class SqsProducer {
  private readonly client = new SQSClient({ region: process.env.AWS_REGION });

  async sendMessage(queueUrl: string, body: Record<string, any>): Promise<void> {
    await this.client.send(new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(body),
      MessageGroupId: body.groupId, // for FIFO queues
    }));
  }
}
```

### Pattern 263.3: Secrets Manager

```typescript
@Injectable()
export class AwsSecretsService {
  private readonly client = new SecretsManagerClient({ region: process.env.AWS_REGION });
  private cache = new Map<string, { value: any; expiry: number }>();

  async getSecret(name: string): Promise<Record<string, any>> {
    const cached = this.cache.get(name);
    if (cached && cached.expiry > Date.now()) return cached.value;

    const response = await this.client.send(new GetSecretValueCommand({ SecretId: name }));
    const value = JSON.parse(response.SecretString!);
    this.cache.set(name, { value, expiry: Date.now() + 300_000 }); // cache 5 min
    return value;
  }
}
```

---

## Best Practices

- Use AWS SDK v3 — modular imports, smaller bundle size
- Presigned URLs for direct upload — avoid proxying large files through NestJS
- Cache secrets — don't call Secrets Manager on every request
- SQS FIFO for ordering guarantee, Standard for throughput

---

## Abnormal Case Patterns

1. **S3 timeout on large file** — Uploading via NestJS proxy. Fix: use presigned URL for direct upload.
2. **Secrets Manager rate limit** — Too many API calls. Fix: cache with TTL.
3. **SQS message lost** — Consumer crashes before ack. Fix: visibility timeout + dead letter queue.
4. **AWS credentials in source** — Hardcoded access keys. Fix: use IAM roles, not access keys.

---

*NestJS Cloud AWS Specialist — Cloud | EPS v3.2*
