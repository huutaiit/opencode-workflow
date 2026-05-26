# NestJS Scheduling & Queues Specialist — Scheduling
# NestJSスケジューリング＆キュースペシャリスト — スケジューリング
# Chuyen Gia Lap Lich va Hang Doi NestJS — Lap Lich

**Version**: 1.0.0
**Technology**: NestJS 10+ @nestjs/schedule + @nestjs/bull
**Aspect**: Scheduling & Queues
**Category**: scheduling
**Purpose**: Knowledge provider for NestJS scheduled tasks and job queues — cron jobs, intervals, Bull/BullMQ queues, job processors, retry/backoff, dead letter queues

---

## Metadata

```json
{
  "id": "nestjs-scheduling-queues-specialist",
  "technology": "NestJS 10+ Scheduling & Bull Queues",
  "aspect": "Scheduling & Queues",
  "category": "scheduling",
  "subcategory": "nestjs",
  "lines": 350,
  "token_cost": 2100,
  "version": "1.0.0",
  "evidence": [
    "E1: @nestjs/schedule — Cron, Interval, Timeout decorators",
    "E2: @nestjs/bull / @nestjs/bullmq — Redis-backed job queues",
    "E3: Job retry patterns — exponential backoff, dead letter queues"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure, Application |
| **Variant** | ALL |
| **Pattern Numbers** | 256.1–256.8 |
| **Directory Pattern** | `src/infrastructure/scheduling/` |
| **Dependencies** | @nestjs/schedule, @nestjs/bull, bull |
| **When To Use** | Cron jobs for periodic tasks and Redis-backed job queues for async processing |
| **Source Skeleton** | src/infrastructure/scheduling/{job}.scheduler.ts, src/infrastructure/queues/{queue}.processor.ts |
| **Specialist Type** | code |
| **Purpose** | Job scheduling and queues — Bull/BullMQ, cron jobs, delayed jobs, job processors |
| **Activation Trigger** | files: **/scheduling/**, **/queues/**; keywords: bull, bullMQ, cron, queue, processor, job |

---

## Role

You are a **NestJS Scheduling & Queues Specialist**. You supply patterns for scheduled task execution and job queue processing — @nestjs/schedule for cron jobs and intervals, @nestjs/bull for Redis-backed queues, job processors, retry strategies, and dead letter handling.

---

## Patterns

### Pattern 256.1: Cron Jobs with @nestjs/schedule

```typescript
@Module({ imports: [ScheduleModule.forRoot()] })
export class AppModule {}

@Injectable()
export class ReportScheduler {
  private readonly logger = new Logger(ReportScheduler.name);

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async generateDailyReport() {
    this.logger.log('Generating daily report...');
    await this.reportService.generateDaily();
  }

  @Cron('0 */15 * * * *') // every 15 minutes
  async checkExpiredLoans() {
    await this.loanService.processExpired();
  }

  @Interval(30_000) // every 30 seconds
  async healthPing() {
    await this.monitoringService.ping();
  }
}
```

**Key Points**:
- `ScheduleModule.forRoot()` enables all decorators globally
- Use `CronExpression` enum for common schedules — less error-prone than raw cron strings
- Cron runs in the SAME process — heavy jobs should enqueue to Bull queue instead

---

### Pattern 256.2: Bull Queue Setup

```typescript
@Module({
  imports: [
    BullModule.forRoot({ redis: { host: 'redis', port: 6379 } }),
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'reports' },
      { name: 'notifications' },
    ),
  ],
})
export class QueueModule {}
```

---

### Pattern 256.3: Producer — Adding Jobs

```typescript
@Injectable()
export class EmailService {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async sendWelcomeEmail(userId: string) {
    await this.emailQueue.add('welcome', { userId }, {
      delay: 5000,            // send after 5s delay
      attempts: 3,            // retry 3 times on failure
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true, // clean up completed jobs
      removeOnFail: 50,       // keep last 50 failed for debugging
    });
  }

  async sendBulkNotification(userIds: string[]) {
    const jobs = userIds.map(id => ({
      name: 'notification',
      data: { userId: id },
      opts: { attempts: 2 },
    }));
    await this.emailQueue.addBulk(jobs);
  }
}
```

---

### Pattern 256.4: Consumer — Processing Jobs

```typescript
@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  @Process('welcome')
  async handleWelcome(job: Job<{ userId: string }>) {
    this.logger.log(`Processing welcome email for user ${job.data.userId}`);
    const user = await this.userService.findById(job.data.userId);
    await this.mailer.send({
      to: user.email,
      subject: 'Welcome!',
      template: 'welcome',
      context: { name: user.name },
    });
  }

  @Process('notification')
  async handleNotification(job: Job<{ userId: string }>) {
    await this.notificationService.push(job.data.userId);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} (${job.name}) failed: ${error.message}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} (${job.name}) completed`);
  }
}
```

---

### Pattern 256.5: Retry & Dead Letter

```typescript
// Job options with retry
{
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000, // 2s, 4s, 8s, 16s, 32s
  },
}

// Dead letter queue — move failed jobs after max retries
@OnQueueFailed()
async onFailed(job: Job, error: Error) {
  if (job.attemptsMade >= job.opts.attempts) {
    // Max retries exhausted — move to dead letter
    await this.deadLetterQueue.add('failed-email', {
      originalJob: job.name,
      data: job.data,
      error: error.message,
      failedAt: new Date(),
    });
    this.logger.error(`Job ${job.id} moved to dead letter queue`);
  }
}
```

---

### Pattern 256.6: Queue Monitoring

```typescript
// Bull Board for queue monitoring UI
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';

@Module({
  imports: [
    BullBoardModule.forRoot({ route: '/admin/queues' }),
    BullBoardModule.forFeature({ name: 'email', adapter: BullAdapter }),
    BullBoardModule.forFeature({ name: 'reports', adapter: BullAdapter }),
  ],
})
export class MonitoringModule {}
```

---

## Best Practices

### Cron vs Queue
| Use Case | Cron | Queue |
|----------|------|-------|
| Periodic cleanup | Yes | No |
| Send email on event | No | Yes |
| Generate daily report | Trigger via cron, process via queue | Best of both |
| Background file processing | No | Yes |

### Queue Design
- One queue per concern (email, reports, notifications)
- `removeOnComplete: true` — prevent Redis memory bloat
- Set `concurrency` on processor to limit parallel job execution
- Idempotent processors — job may run more than once on retry

---

## Abnormal Case Patterns

1. **Cron runs on all instances** — Multiple pods each run the cron. Fix: use distributed lock (Redis) or designate one worker pod.
2. **Queue memory leak** — Completed jobs not removed. Fix: `removeOnComplete: true`.
3. **Job stuck in active** — Processor crashed mid-job. Fix: set `lockDuration` and `stalledInterval`.
4. **Redis connection lost** — Queue stops processing. Fix: configure Redis reconnect strategy.
5. **Job data too large** — 10MB payload in job. Fix: store data in DB, pass only ID in job.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3)?
- [ ] **Q2**: Pattern IDs unique (256.1-256.6)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS Scheduling & Queues Specialist — Scheduling | EPS v3.2*
