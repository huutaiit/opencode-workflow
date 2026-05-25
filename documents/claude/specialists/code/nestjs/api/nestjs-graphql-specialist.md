# NestJS GraphQL Specialist — API
# NestJS GraphQLスペシャリスト — API
# Chuyen Gia GraphQL NestJS — API

**Version**: 1.0.0
**Technology**: NestJS 10+ GraphQL (@nestjs/graphql)
**Aspect**: GraphQL API
**Category**: api
**Purpose**: Knowledge provider for NestJS GraphQL — code-first, schema-first, resolvers, DataLoader, subscriptions

---

## Metadata

```json
{
  "id": "nestjs-graphql-specialist",
  "technology": "NestJS 10+ GraphQL",
  "aspect": "GraphQL API",
  "category": "api",
  "subcategory": "nestjs",
  "lines": 480,
  "token_cost": 2800,
  "version": "1.0.0",
  "evidence": [
    "E1: NestJS GraphQL docs — @nestjs/graphql, Apollo, Mercurius",
    "E1: GraphQL best practices — DataLoader, complexity, subscriptions",
    "E5: p2plend potential — GraphQL for BFF aggregation layer"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 273.1–273.8 |
| **Directory Pattern** | `src/presentation/resolvers/` |
| **Naming Convention** | `{entity}.resolver.ts`, `{entity}.type.ts`, `{entity}.input.ts` |
| **Imports From** | Application (use cases, DTOs) |
| **Imported By** | None (GraphQL entry point) |
| **Cannot Import** | Domain directly, Infrastructure directly |
| **Dependencies** | @nestjs/graphql, @apollo/server, graphql |
| **When To Use** | GraphQL API with resolvers instead of REST controllers |
| **Source Skeleton** | src/presentation/resolvers/{entity}.resolver.ts, src/application/dto/{entity}.input.ts |
| **Specialist Type** | code |
| **Purpose** | NestJS GraphQL — resolvers, schema-first/code-first, subscriptions, DataLoader |
| **Activation Trigger** | files: **/*.resolver.ts; keywords: resolver, query, mutation, subscription, graphql |

---

## Role

You are a **NestJS GraphQL Specialist**. You supply patterns for building GraphQL APIs with NestJS using code-first or schema-first approach, including resolvers, type definitions, DataLoader for N+1 prevention, subscriptions, and complexity limiting.

**Used by**: Any code agent building GraphQL APIs in NestJS
**Not used by**: REST-only services, non-NestJS stacks

---

## Patterns

### Pattern 273.1: Code-First Setup

**Category**: GraphQL Fundamentals
**Description**: Auto-generate schema from TypeScript decorators.

```typescript
// app.module.ts
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
  sortSchema: true,
  playground: process.env.NODE_ENV !== 'production',
  context: ({ req }) => ({ req }),
})
```

```typescript
// types/order.type.ts
@ObjectType()
export class OrderType {
  @Field(() => ID)
  id: string;

  @Field()
  status: string;

  @Field(() => Float)
  totalAmount: number;

  @Field(() => [OrderItemType])
  items: OrderItemType[];

  @Field()
  createdAt: Date;
}
```

**Key Points**:
- autoSchemaFile generates .gql from decorators — commit to git for schema tracking
- Code-first preferred for NestJS — full TypeScript type safety
- Disable playground in production

---

### Pattern 246.2: Resolvers

**Category**: GraphQL Fundamentals
**Description**: Query, Mutation, Subscription handlers.

```typescript
@Resolver(() => OrderType)
export class OrderResolver {
  constructor(
    private readonly findOrderUseCase: FindOrderUseCase,
    private readonly createOrderUseCase: CreateOrderUseCase,
  ) {}

  @Query(() => OrderType, { nullable: true })
  async order(@Args('id', { type: () => ID }) id: string): Promise<OrderType> {
    return this.findOrderUseCase.execute(id);
  }

  @Query(() => [OrderType])
  async orders(
    @Args('filter', { nullable: true }) filter?: OrderFilterInput,
  ): Promise<OrderType[]> {
    return this.findOrdersUseCase.execute(filter);
  }

  @Mutation(() => OrderType)
  async createOrder(@Args('input') input: CreateOrderInput): Promise<OrderType> {
    return this.createOrderUseCase.execute(input);
  }
}
```

**Key Points**:
- Resolvers are thin — delegate to use cases (same as REST controllers)
- Use `nullable: true` for optional results
- @Args with type function for complex types

---

### Pattern 246.3: Input Types

**Category**: GraphQL Fundamentals
**Description**: @InputType for mutation arguments with validation.

```typescript
@InputType()
export class CreateOrderInput {
  @Field(() => [CreateOrderItemInput])
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemInput)
  items: CreateOrderItemInput[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}

@InputType()
export class CreateOrderItemInput {
  @Field(() => ID)
  @IsUUID()
  productId: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  quantity: number;
}
```

**Key Points**:
- Combine @Field decorators with class-validator decorators
- @InputType for mutations, @ArgsType for inline query args
- Validation works same as REST DTOs when ValidationPipe is applied

---

### Pattern 246.4: Field Resolvers

**Category**: Advanced GraphQL
**Description**: Resolve nested fields on demand.

```typescript
@Resolver(() => OrderType)
export class OrderResolver {
  @ResolveField(() => UserType)
  async customer(
    @Parent() order: OrderType,
    @Context() ctx: GraphQLContext,
  ): Promise<UserType> {
    return ctx.userLoader.load(order.customerId);
  }

  @ResolveField(() => Float)
  async totalWithTax(@Parent() order: OrderType): Promise<number> {
    return order.totalAmount * 1.1; // 10% tax
  }
}
```

**Key Points**:
- @ResolveField only runs when client requests that field
- Use DataLoader in field resolvers to prevent N+1
- Computed fields (totalWithTax) don't need DataLoader

---

### Pattern 246.5: DataLoader for N+1 Prevention

**Category**: Advanced GraphQL
**Description**: Batch and cache database lookups per request.

```typescript
// loaders/user.loader.ts
@Injectable({ scope: Scope.REQUEST })
export class UserLoader {
  constructor(private userService: UserService) {}

  readonly loader = new DataLoader<string, User>(async (ids: string[]) => {
    const users = await this.userService.findByIds([...ids]);
    const userMap = new Map(users.map(u => [u.id, u]));
    return ids.map(id => userMap.get(id) ?? null);
  });

  load(id: string) { return this.loader.load(id); }
}

// Usage in resolver
@ResolveField(() => UserType)
async customer(@Parent() order: Order): Promise<User> {
  return this.userLoader.load(order.customerId);
}
```

**Key Points**:
- DataLoader MUST be REQUEST-scoped — one loader per request
- Batch function receives deduplicated keys — return values in same order as keys
- Critical for field resolvers that load related entities

---

### Pattern 246.6: Subscriptions

**Category**: Advanced GraphQL
**Description**: Real-time updates via WebSocket subscriptions.

```typescript
@Resolver()
export class OrderResolver {
  constructor(@Inject('PUB_SUB') private pubSub: PubSub) {}

  @Subscription(() => OrderType, {
    filter: (payload, variables) =>
      payload.orderUpdated.customerId === variables.customerId,
  })
  orderUpdated(@Args('customerId') customerId: string) {
    return this.pubSub.asyncIterableIterator('orderUpdated');
  }

  @Mutation(() => OrderType)
  async updateOrderStatus(@Args('input') input: UpdateStatusInput) {
    const order = await this.updateOrderUseCase.execute(input);
    await this.pubSub.publish('orderUpdated', { orderUpdated: order });
    return order;
  }
}
```

**Key Points**:
- Use Redis PubSub for multi-instance deployments (not in-memory)
- filter function prevents sending updates to wrong subscribers
- Subscriptions use WebSocket transport (ws:// or wss://)

---

### Pattern 246.7: Query Complexity

**Category**: Advanced GraphQL
**Description**: Prevent expensive queries via complexity analysis.

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: true,
  plugins: [
    ApolloServerPluginLandingPageLocalDefault(),
  ],
  // Complexity limiting
  validationRules: [
    createComplexityRule({
      maximumComplexity: 100,
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({ defaultComplexity: 1 }),
      ],
    }),
  ],
})
```

```typescript
@Field(() => [OrderItemType], { complexity: 5 })
items: OrderItemType[];
```

**Key Points**:
- Set max complexity to prevent deep nested queries (DoS protection)
- Assign higher complexity to list fields and nested resolvers
- Log rejected queries for monitoring

---

### Pattern 273.8: Guards and Auth in GraphQL

**Category**: Advanced GraphQL
**Description**: Apply NestJS guards to GraphQL resolvers.

```typescript
@Resolver()
@UseGuards(GqlAuthGuard)
export class OrderResolver {
  @Query(() => OrderType)
  @Roles('admin', 'user')
  async order(@Args('id') id: string, @CurrentUser() user: User) {
    return this.findOrderUseCase.execute(id, user.id);
  }
}

// GQL-specific auth guard (adapts ExecutionContext)
@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}
```

**Key Points**:
- GraphQL needs custom guard that extracts request from GqlExecutionContext
- @CurrentUser decorator works same as REST when GqlAuthGuard sets req.user
- Apply @UseGuards at resolver class level for all queries/mutations

---

## Best Practices

### Schema Design
- Use ID scalar for entity identifiers — not String
- Paginate list queries — never return unbounded arrays
- Separate Input types from Object types — even if fields overlap
- Use enums for status fields — auto-generates GraphQL enum

### Performance
- DataLoader for ALL field resolvers that access external data
- Set query complexity limits — prevent DoS via deep nesting
- Disable introspection in production

### Organization
- One resolver per entity/aggregate — like REST controllers
- Colocate type + input + resolver in same folder
- Share DataLoaders via request-scoped module

---

## Testing Patterns

```typescript
describe('OrderResolver', () => {
  it('should return order by id', async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrderResolver,
        { provide: FindOrderUseCase, useValue: { execute: jest.fn().mockResolvedValue(mockOrder) } },
      ],
    }).compile();

    const resolver = module.get(OrderResolver);
    const result = await resolver.order('123');
    expect(result.id).toBe('123');
  });
});

// E2E test with supertest
it('should query orders via GraphQL', () => {
  return request(app.getHttpServer())
    .post('/graphql')
    .send({ query: '{ orders { id status } }' })
    .expect(200)
    .expect(res => expect(res.body.data.orders).toBeArray());
});
```

---

## Abnormal Case Patterns

1. **N+1 query problem** — Field resolver fires per item without DataLoader. Fix: use DataLoader with batch loading.

2. **Subscription memory leak** — PubSub in-memory on multi-instance. Fix: use Redis PubSub adapter.

3. **Schema not generated** — autoSchemaFile path wrong or TypeScript emitDecoratorMetadata off. Fix: check tsconfig and path.

4. **Guard doesn't work in GraphQL** — Standard HTTP guard can't read GQL context. Fix: custom GqlAuthGuard with getRequest().

5. **Circular type reference** — OrderType → UserType → OrderType. Fix: use `() => OrderType` lazy reference in @Field.

6. **Query too complex** — Client sends deeply nested query. Fix: complexity analysis plugin with max limit.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (273.1-273.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS GraphQL Specialist — API | EPS v3.2*
