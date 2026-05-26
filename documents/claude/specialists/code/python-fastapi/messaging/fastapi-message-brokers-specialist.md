# FastAPI Message Brokers Specialist
# FastAPIメッセージブローカースペシャリスト
# Chuyen Gia Message Broker FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Directory Pattern** | `src/{domain}/events/`, `src/messaging/` |
| **Variant** | ALL |
| **Naming Convention** | `events.py`, `broker.py`, `consumer.py`, `publisher.py` |
| **Imports From** | Application (services), Domain (schemas) |
| **Cannot Import** | Presentation (routers) |
| **Dependencies** | `faststream>=0.5` (unified), `aio-pika` (RabbitMQ), `aiokafka` (Kafka), `nats-py` (NATS) |
| **When To Use** | Event-driven async messaging, pub/sub between microservices |
| **Source Skeleton** | `src/core/broker.py`, `src/{domain}/events.py`, `src/{domain}/consumers.py` |
| **Pattern Numbers** | 41.1–41.6 |
| **Source Paths** | `**/events/**/*.py`, `**/messaging/**/*.py`, `**/consumers/**/*.py` |
| **File Count** | 2-4 per event-driven domain |
| **Imported By** | Main app (lifespan), Workers |
| **Specialist Type** | code |
| **Purpose** | FastStream unified messaging, Kafka/RabbitMQ/NATS/Redis Pub/Sub, direct broker clients, broker selection guidance |
| **Activation Trigger** | kafka, rabbitmq, nats, faststream, pub/sub, event, broker, message queue |

---

## Purpose

Define event-driven messaging patterns for FastAPI: FastStream as unified framework (Kafka + RabbitMQ + NATS + Redis), direct broker clients (aio-pika, aiokafka, nats-py), Pydantic message validation, AsyncAPI documentation, and broker selection guidance.

---

## Pattern 41.1: FastStream (Unified Broker Framework)

```python
# pip install "faststream[kafka]"  # or [rabbit], [nats], [redis]
from faststream import FastStream
from faststream.kafka import KafkaBroker, KafkaRouter
from pydantic import BaseModel

# Broker setup
broker = KafkaBroker("localhost:9092")
router = KafkaRouter()


class OrderCreated(BaseModel):
    order_id: int
    user_id: int
    total: float


class OrderProcessed(BaseModel):
    order_id: int
    status: str


# Consumer — subscribe to topic
@router.subscriber("orders.created")
@router.publisher("orders.processed")
async def process_order(event: OrderCreated) -> OrderProcessed:
    """Consume OrderCreated, publish OrderProcessed.

    FastStream auto-validates with Pydantic.
    Return value is published to output topic.
    """
    # Business logic
    result = await order_service.process(event.order_id)
    return OrderProcessed(order_id=event.order_id, status=result.status)


# Publisher only
@router.subscriber("payments.completed")
async def handle_payment(event: dict):
    """Consume without publishing."""
    await notification_service.send(event["user_id"], "Payment confirmed")


app = FastStream(broker)
app.include_router(router)
```

**Mount in FastAPI**:
```python
from fastapi import FastAPI
from faststream.kafka.fastapi import KafkaRouter

kafka_router = KafkaRouter("localhost:9092")


@kafka_router.subscriber("orders.created")
async def process_order(event: OrderCreated) -> None:
    await order_service.process(event.order_id)


fastapi_app = FastAPI(lifespan=kafka_router.lifespan_context)
fastapi_app.include_router(kafka_router)
```

**Key rule**: FastStream `include_router` works like FastAPI's — same mental model. One framework for Kafka, RabbitMQ, NATS, Redis.

---

## Pattern 41.2: FastStream Features

**Pydantic validation** (automatic):
```python
@router.subscriber("users.registered")
async def handle_user(event: UserRegistered):
    # event is already validated Pydantic model
    # Invalid messages → logged + skipped (configurable)
    pass
```

**AsyncAPI documentation** (auto-generated):
```python
# FastStream generates AsyncAPI spec automatically
# View at: http://localhost:8000/asyncapi
app = FastStream(broker, asyncapi_url="/asyncapi")
```

**Dependency injection** (same as FastAPI):
```python
from faststream import Depends


async def get_db_session():
    async with async_session() as session:
        yield session


@router.subscriber("events.process")
async def process(event: dict, db=Depends(get_db_session)):
    # DI works exactly like FastAPI
    pass
```

**In-memory testing**:
```python
import pytest
from faststream.kafka import TestKafkaBroker


@pytest.mark.asyncio
async def test_process_order():
    async with TestKafkaBroker(broker) as br:
        # Publish test event
        await br.publish(
            OrderCreated(order_id=1, user_id=1, total=99.99),
            "orders.created",
        )
        # Assert handler was called
        process_order.mock.assert_called_once()
```

---

## Pattern 41.3: Direct aio-pika (RabbitMQ)

```python
# pip install aio-pika
import aio_pika
from aio_pika import ExchangeType


async def get_rabbitmq_connection():
    return await aio_pika.connect_robust("amqp://guest:guest@localhost/")


# Publisher
async def publish_event(exchange_name: str, routing_key: str, body: dict):
    connection = await get_rabbitmq_connection()
    async with connection:
        channel = await connection.channel()
        exchange = await channel.declare_exchange(
            exchange_name,
            ExchangeType.TOPIC,
            durable=True,
        )
        await exchange.publish(
            aio_pika.Message(
                body=json.dumps(body).encode(),
                content_type="application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            ),
            routing_key=routing_key,
        )


# Consumer
async def start_consumer():
    connection = await get_rabbitmq_connection()
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=10)

    exchange = await channel.declare_exchange(
        "events", ExchangeType.TOPIC, durable=True
    )
    queue = await channel.declare_queue("order-processor", durable=True)
    await queue.bind(exchange, routing_key="orders.*")

    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            async with message.process():
                body = json.loads(message.body)
                await process_message(body)
```

**Key rules**:
- Use `connect_robust` (auto-reconnect on connection loss)
- Set `delivery_mode=PERSISTENT` for durable messages
- Use `prefetch_count` to control consumer throughput

---

## Pattern 41.4: Direct aiokafka

```python
# pip install aiokafka
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer


# Producer
async def get_kafka_producer():
    producer = AIOKafkaProducer(
        bootstrap_servers="localhost:9092",
        value_serializer=lambda v: json.dumps(v).encode(),
    )
    await producer.start()
    return producer


async def publish_to_kafka(topic: str, value: dict, key: str | None = None):
    producer = await get_kafka_producer()
    try:
        await producer.send_and_wait(
            topic,
            value=value,
            key=key.encode() if key else None,
        )
    finally:
        await producer.stop()


# Consumer
async def start_kafka_consumer(topics: list[str], group_id: str):
    consumer = AIOKafkaConsumer(
        *topics,
        bootstrap_servers="localhost:9092",
        group_id=group_id,
        auto_offset_reset="earliest",
        value_deserializer=lambda v: json.loads(v),
    )
    await consumer.start()
    try:
        async for msg in consumer:
            await process_message(msg.topic, msg.value, msg.key)
    finally:
        await consumer.stop()
```

**Key rules**:
- Always set `group_id` for consumer groups (enables parallel consumption)
- Use `send_and_wait` not `send` for delivery guarantee
- Set `auto_offset_reset="earliest"` to not miss messages on first start

---

## Pattern 41.5: Direct nats-py

```python
# pip install nats-py
import nats
from nats.js.api import StreamConfig


async def get_nats_connection():
    return await nats.connect("nats://localhost:4222")


# Pub/Sub (fire-and-forget)
async def publish_nats(subject: str, data: dict):
    nc = await get_nats_connection()
    await nc.publish(subject, json.dumps(data).encode())
    await nc.drain()


# JetStream (persistent, at-least-once delivery)
async def start_jetstream_consumer():
    nc = await get_nats_connection()
    js = nc.jetstream()

    # Create stream if not exists
    await js.add_stream(
        StreamConfig(name="ORDERS", subjects=["orders.>"])
    )

    # Pull subscriber (explicit ack)
    sub = await js.pull_subscribe("orders.created", durable="order-processor")

    while True:
        try:
            msgs = await sub.fetch(batch=10, timeout=5)
            for msg in msgs:
                data = json.loads(msg.data)
                await process_order(data)
                await msg.ack()
        except nats.errors.TimeoutError:
            continue
```

**Key rules**:
- Core NATS = fire-and-forget (fast, no persistence)
- JetStream = persistent streams with ack (like Kafka)
- Use `durable` parameter for consumer group behavior

---

## Pattern 41.6: When to Use Which

| Factor | Redis Pub/Sub | RabbitMQ | Kafka | NATS |
|--------|--------------|----------|-------|------|
| **Model** | Pub/Sub | Queue + Exchange | Log | Pub/Sub + Queue |
| **Persistence** | No | Yes (durable) | Yes (log) | JetStream |
| **Ordering** | No | Per-queue | Per-partition | Per-subject |
| **Throughput** | High | Medium-High | Very High | Very High |
| **Latency** | Very Low | Low | Medium | Very Low |
| **Replay** | No | No | Yes (offset) | JetStream |
| **Best for** | Cache invalidation, simple events | Task routing, RPC | Event sourcing, analytics | Microservices, IoT |
| **Python lib** | redis.asyncio | aio-pika | aiokafka | nats-py |
| **Unified** | FastStream | FastStream | FastStream | FastStream |

**Decision guide**:
- **Already have Redis, simple events**: Redis Pub/Sub
- **Complex routing, dead-letter queues**: RabbitMQ
- **Event log, replay, high throughput**: Kafka
- **Low latency, lightweight, polyglot**: NATS
- **Want one framework for all**: FastStream

---

## MUST DO

- Use FastStream for new projects (unified API, Pydantic validation, AsyncAPI docs)
- Set message persistence/durability for critical events
- Use consumer groups for parallel processing
- Implement dead-letter queues for failed messages
- Set prefetch/batch limits to control memory usage
- Use Pydantic models for message schemas

## MUST NOT DO

- Mix multiple broker clients without clear separation
- Skip message validation (use Pydantic schemas)
- Use fire-and-forget for critical business events
- Process messages without acknowledgment in production
- Ignore consumer lag monitoring (Kafka/NATS)
- Hardcode broker URLs (use environment variables)

---

## References

- [FastStream Documentation](https://faststream.airt.ai/)
- [aio-pika (RabbitMQ)](https://aio-pika.readthedocs.io/)
- [aiokafka](https://aiokafka.readthedocs.io/)
- [nats-py](https://nats-io.github.io/nats.py/)
- [AsyncAPI Specification](https://www.asyncapi.com/)
