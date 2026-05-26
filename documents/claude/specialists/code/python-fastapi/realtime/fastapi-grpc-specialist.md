# FastAPI gRPC Specialist
# FastAPI gRPCスペシャリスト
# Chuyen Gia gRPC FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Directory Pattern** | `src/grpc/`, `protos/`, `src/{domain}/grpc_service.py` |
| **Variant** | ALL |
| **Naming Convention** | `grpc_service.py`, `*_pb2.py`, `*_pb2_grpc.py` |
| **Imports From** | Application (services), Domain (models) |
| **Cannot Import** | Presentation (routers) |
| **Dependencies** | `grpcio`, `grpcio-tools`, `grpclib` (async alternative) |
| **When To Use** | gRPC services, proto definitions, hybrid REST+gRPC |
| **Source Skeleton** | `protos/{service}.proto`, `src/{domain}/grpc_service.py` |
| **Pattern Numbers** | 37.1–37.5 |
| **Source Paths** | `**/grpc/**/*.py`, `**/protos/**/*.proto` |
| **File Count** | 1 per gRPC service + proto files |
| **Imported By** | Main app (hybrid mount) |
| **Specialist Type** | code |
| **Purpose** | Proto definition and code generation, async gRPC servicer, FastAPI as gRPC client, fastapi-grpc-bridge, hybrid REST+gRPC architecture |
| **Activation Trigger** | grpc, protobuf, proto, grpc.aio, microservice communication |

---

## Purpose

Define gRPC patterns for FastAPI: Protocol Buffer definitions and stub generation, async gRPC servers with `grpc.aio`, FastAPI as gRPC client for microservice calls, `fastapi-grpc-bridge` for auto-generated proto from Pydantic, and hybrid REST+gRPC architecture.

---

## Pattern 37.1: Proto Definition + Stub Generation

```protobuf
// protos/user_service.proto
syntax = "proto3";

package user;

service UserService {
    rpc GetUser (GetUserRequest) returns (UserResponse);
    rpc ListUsers (ListUsersRequest) returns (stream UserResponse);  // Server streaming
    rpc CreateUser (CreateUserRequest) returns (UserResponse);
}

message GetUserRequest {
    string user_id = 1;
}

message CreateUserRequest {
    string email = 1;
    string full_name = 2;
}

message UserResponse {
    string id = 1;
    string email = 2;
    string full_name = 3;
    bool is_active = 4;
}

message ListUsersRequest {
    int32 page = 1;
    int32 page_size = 2;
}
```

**Generate Python stubs**:
```bash
# Install tools
pip install grpcio grpcio-tools

# Generate stubs (run from project root)
python -m grpc_tools.protoc \
    -I protos/ \
    --python_out=src/grpc/generated/ \
    --grpc_python_out=src/grpc/generated/ \
    --pyi_out=src/grpc/generated/ \
    protos/user_service.proto
```

**Output files**:
- `user_service_pb2.py` — Message classes
- `user_service_pb2_grpc.py` — Service stubs + servicer base
- `user_service_pb2.pyi` — Type stubs for IDE support

**Key rule**: Always generate `.pyi` files (`--pyi_out`) for type checking. Add generated files to `.gitignore` or commit them (team convention).

---

## Pattern 37.2: Async gRPC Servicer

```python
import grpc
from grpc import aio

from src.grpc.generated import user_service_pb2 as pb2
from src.grpc.generated import user_service_pb2_grpc as pb2_grpc
from src.users.service import UserService


class UserServicer(pb2_grpc.UserServiceServicer):
    """Async gRPC servicer — thin handler delegating to service layer."""

    def __init__(self, user_service: UserService):
        self.service = user_service

    async def GetUser(self, request, context):
        user = await self.service.get_by_id(request.user_id)
        if not user:
            await context.abort(
                grpc.StatusCode.NOT_FOUND,
                f"User {request.user_id} not found",
            )
        return pb2.UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
        )

    async def ListUsers(self, request, context):
        """Server streaming — yield one response per user."""
        users = await self.service.list_paginated(
            page=request.page,
            page_size=request.page_size,
        )
        for user in users:
            yield pb2.UserResponse(
                id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                is_active=user.is_active,
            )

    async def CreateUser(self, request, context):
        user = await self.service.create(
            email=request.email,
            full_name=request.full_name,
        )
        return pb2.UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
        )


async def start_grpc_server(port: int = 50051):
    """Start async gRPC server."""
    server = aio.server()
    user_service = UserService()
    pb2_grpc.add_UserServiceServicer_to_server(
        UserServicer(user_service), server
    )
    server.add_insecure_port(f"[::]:{port}")
    await server.start()
    await server.wait_for_termination()
```

**Key rules**:
- Use `grpc.aio` (not sync `grpc`) — async servicers share event loop with FastAPI
- Keep servicers thin — delegate to service layer (same pattern as routers)
- Use `context.abort()` for errors (maps to gRPC status codes)

---

## Pattern 37.3: FastAPI as gRPC Client

```python
import grpc
from grpc import aio

from src.grpc.generated import user_service_pb2 as pb2
from src.grpc.generated import user_service_pb2_grpc as pb2_grpc


class UserGrpcClient:
    """Async gRPC client for calling UserService."""

    def __init__(self, target: str = "localhost:50051"):
        self.channel = aio.insecure_channel(target)
        self.stub = pb2_grpc.UserServiceStub(self.channel)

    async def get_user(self, user_id: str) -> dict:
        try:
            response = await self.stub.GetUser(
                pb2.GetUserRequest(user_id=user_id),
                timeout=5.0,  # Always set timeout
            )
            return {
                "id": response.id,
                "email": response.email,
                "full_name": response.full_name,
            }
        except aio.AioRpcError as e:
            if e.code() == grpc.StatusCode.NOT_FOUND:
                return None
            raise

    async def close(self):
        await self.channel.close()


# FastAPI dependency
async def get_user_grpc_client():
    client = UserGrpcClient(settings.USER_SERVICE_GRPC_URL)
    try:
        yield client
    finally:
        await client.close()


# In router
@router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    client: UserGrpcClient = Depends(get_user_grpc_client),
):
    user = await client.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404)
    return user
```

**Key rules**:
- Always set `timeout` on gRPC calls
- Reuse channels (not per-request) — channels manage connection pooling
- Handle `AioRpcError` and map to HTTP status codes

---

## Pattern 37.4: fastapi-grpc-bridge (Auto Proto from Pydantic)

```python
# pip install fastapi-grpc-bridge
from fastapi import FastAPI
from fastapi_grpc_bridge import GrpcBridge
from pydantic import BaseModel


class UserCreate(BaseModel):
    email: str
    full_name: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str


app = FastAPI()
bridge = GrpcBridge(app)


@bridge.rpc("/users/create")
async def create_user(request: UserCreate) -> UserResponse:
    """Auto-generates .proto from Pydantic models.

    - Pydantic BaseModel → Proto message
    - Function signature → RPC method
    - ~80% less boilerplate than manual proto
    """
    user = await user_service.create(request)
    return UserResponse(id=str(user.id), email=user.email, full_name=user.full_name)
```

**When to use bridge vs manual proto**:

| Factor | fastapi-grpc-bridge | Manual proto |
|--------|-------------------|--------------|
| **Speed** | Fast prototyping | Production |
| **Control** | Less (auto-generated) | Full |
| **Compatibility** | Python-to-Python | Any language |
| **Features** | Basic unary/stream | All gRPC features |

---

## Pattern 37.5: Hybrid Architecture (REST + gRPC)

```python
import asyncio

from fastapi import FastAPI
from contextlib import asynccontextmanager

from src.grpc.server import start_grpc_server


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start gRPC server alongside FastAPI
    grpc_task = asyncio.create_task(start_grpc_server(port=50051))
    yield
    grpc_task.cancel()


app = FastAPI(lifespan=lifespan)
# REST routes on :8000, gRPC on :50051
```

**Docker Compose (separate services — recommended)**:
```yaml
services:
  api:
    build: .
    command: uvicorn src.main:app --host 0.0.0.0 --port 8000
    ports: ["8000:8000"]

  grpc-server:
    build: .
    command: python -m src.grpc.server
    ports: ["50051:50051"]
```

**Architecture**:
```
External Clients → REST API (:8000) → FastAPI → Service Layer
Internal Services → gRPC (:50051) → Servicer → Service Layer (same)
```

**Key rule**: REST for external/public API, gRPC for internal microservice communication. Share service layer.

---

## MUST DO

- Use `grpc.aio` for async gRPC (not sync `grpc`)
- Generate `.pyi` type stubs alongside proto stubs
- Set timeouts on all gRPC client calls
- Keep gRPC servicers thin (delegate to service layer)
- Use `context.abort()` for gRPC error handling
- Share service layer between REST and gRPC handlers

## MUST NOT DO

- Use sync `grpc` in async FastAPI (blocks event loop)
- Create new channels per request (use channel pooling)
- Skip timeout on gRPC calls (can hang indefinitely)
- Put business logic in gRPC servicers
- Expose gRPC port publicly without TLS
- Mix proto definitions across unrelated services

---

## References

- [gRPC Python AsyncIO](https://grpc.github.io/grpc/python/grpc_asyncio.html)
- [Protocol Buffers Language Guide](https://protobuf.dev/programming-guides/proto3/)
- [fastapi-grpc-bridge](https://github.com/crunchydeer/fastapi-grpc-bridge)
