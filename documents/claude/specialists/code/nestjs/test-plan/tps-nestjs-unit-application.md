# Test Plan Specialist — NestJS Unit Testing: Application Layer
# テストプランスペシャリスト — NestJS アプリケーション層ユニットテスト
# Chuyen Gia Test — Unit Test Application Layer NestJS

**Version**: 1.0.0
**Stack**: TypeScript/NestJS | **Type**: Unit Testing — Application Layer
**Purpose**: Application layer unit testing — UseCase execute() testing with mocked ports, mapper accuracy, DTO validation, event emission, transaction boundary testing

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application (test) |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-NESTJS-UNIT-APP |
| **Directory Pattern** | `src/application/**/*.spec.ts` |
| **Naming Convention** | `{action}-{entity}.use-case.spec.ts`, `{entity}.mapper.spec.ts` |
| **Imports From** | Domain (entities, ports — mocked), Application (SUT) |
| **Imported By** | N/A (test files) |
| **Cannot Import** | Infrastructure (use mocked ports), Presentation (application doesn't know controllers) |
| **Dependencies** | jest, @nestjs/testing (for DI container setup) |
| **When To Use** | DD/Plan generates use cases, mappers, DTOs, application services |
| **Source Skeleton** | `src/application/{feature}/{action}-{entity}.use-case.spec.ts` |
| **Specialist Type** | code |
| **Purpose** | Application layer unit testing — UseCase execute() testing with mocked ports, mapper accuracy, DTO validation, event emission |
| **Activation Trigger** | files: **/application/**/*.spec.ts; keywords: useCaseTest, mapperTest, applicationTest |

---

## Key Principle

Application layer tests use `@nestjs/testing` to build DI container, but ALL ports are **mocked** (no real DB, no real HTTP). Test the orchestration logic, not infrastructure.

---

## Patterns

### Pattern UT-A.1: UseCase Testing with Mocked Ports

```typescript
// application/order/create-order.use-case.spec.ts
describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;
  let orderRepo: jest.Mocked<OrderRepositoryPort>;
  let inventoryPort: jest.Mocked<InventoryPort>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    orderRepo = { findById: jest.fn(), save: jest.fn(), delete: jest.fn() };
    inventoryPort = { reserve: jest.fn(), release: jest.fn() };
    eventEmitter = { emit: jest.fn() } as any;

    const module = await Test.createTestingModule({
      providers: [
        CreateOrderUseCase,
        { provide: ORDER_REPOSITORY, useValue: orderRepo },
        { provide: INVENTORY_PORT, useValue: inventoryPort },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    useCase = module.get(CreateOrderUseCase);
  });

  it('should create order, reserve inventory, persist, and emit event', async () => {
    orderRepo.save.mockResolvedValue(mockSavedOrder);
    inventoryPort.reserve.mockResolvedValue(undefined);

    const result = await useCase.execute(createOrderDto);

    // Verify orchestration ORDER: reserve → save → emit
    expect(inventoryPort.reserve).toHaveBeenCalledBefore(orderRepo.save);
    expect(orderRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING' }));
    expect(eventEmitter.emit).toHaveBeenCalledWith('order.created', expect.any(OrderCreatedEvent));
    expect(result.id).toBe(mockSavedOrder.id);
  });

  it('should NOT save order if inventory reservation fails', async () => {
    inventoryPort.reserve.mockRejectedValue(new InsufficientStockException());

    await expect(useCase.execute(createOrderDto)).rejects.toThrow(InsufficientStockException);
    expect(orderRepo.save).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('should propagate repository errors without catching', async () => {
    inventoryPort.reserve.mockResolvedValue(undefined);
    orderRepo.save.mockRejectedValue(new Error('DB connection lost'));

    await expect(useCase.execute(createOrderDto)).rejects.toThrow('DB connection lost');
  });
});
```

---

### Pattern UT-A.2: Mapper Testing

```typescript
// application/order/order.mapper.spec.ts
describe('OrderMapper', () => {
  describe('toDomain()', () => {
    it('should convert ORM entity to domain entity', () => {
      const orm: OrderOrmEntity = {
        id: 'uuid-1', customerId: 'c1', status: 'PENDING',
        items: [{ id: 'i1', productId: 'p1', quantity: 2, unitPrice: 50 }],
        createdAt: new Date('2026-01-01'),
      };

      const domain = OrderMapper.toDomain(orm);

      expect(domain).toBeInstanceOf(Order);
      expect(domain.id).toBe('uuid-1');
      expect(domain.items).toHaveLength(1);
      expect(domain.total).toBe(100);
    });

    it('should handle null items gracefully', () => {
      const orm = { ...validOrm, items: null };
      const domain = OrderMapper.toDomain(orm);
      expect(domain.items).toEqual([]);
    });
  });

  describe('toOrm()', () => {
    it('should convert domain entity to ORM entity', () => {
      const domain = Order.create('c1', [OrderItem.create('p1', 2, Money.create(50, 'USD'))]);
      const orm = OrderMapper.toOrm(domain);

      expect(orm.customerId).toBe('c1');
      expect(orm.items).toHaveLength(1);
      expect(orm.items[0].unitPrice).toBe(50);
    });
  });

  describe('toResponse()', () => {
    it('should convert domain entity to response DTO', () => {
      const domain = Order.create('c1', [validItem]);
      const dto = OrderMapper.toResponse(domain);

      expect(dto.id).toBe(domain.id);
      expect(dto.status).toBe('PENDING');
      expect(dto.totalAmount).toBe(domain.total);
      // DTO should NOT expose internal domain properties
      expect(dto).not.toHaveProperty('_items');
      expect(dto).not.toHaveProperty('domainEvents');
    });
  });
});
```

---

### Pattern UT-A.3: Event Emission Testing

```typescript
describe('DisburseLoanUseCase', () => {
  it('should emit loan.disbursed event with correct payload', async () => {
    loanRepo.findById.mockResolvedValue(approvedLoan);
    paymentPort.transfer.mockResolvedValue({ transactionId: 'tx-1' });
    loanRepo.save.mockImplementation(loan => Promise.resolve(loan));

    await useCase.execute({ loanId: 'loan-1' });

    expect(eventEmitter.emit).toHaveBeenCalledWith('loan.disbursed', expect.objectContaining({
      loanId: 'loan-1',
      amount: approvedLoan.approvedAmount,
      transactionId: 'tx-1',
    }));
  });

  it('should NOT emit event if payment fails', async () => {
    loanRepo.findById.mockResolvedValue(approvedLoan);
    paymentPort.transfer.mockRejectedValue(new PaymentFailedException());

    await expect(useCase.execute({ loanId: 'loan-1' })).rejects.toThrow();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
```

---

### Pattern UT-A.4: DTO Validation Testing

```typescript
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

describe('CreateOrderDto', () => {
  it('should pass validation with valid data', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      customerId: 'uuid-format-id',
      items: [{ productId: 'p1', quantity: 2 }],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail on missing customerId', async () => {
    const dto = plainToInstance(CreateOrderDto, { items: [{ productId: 'p1', quantity: 1 }] });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'customerId')).toBe(true);
  });

  it('should fail on empty items array', async () => {
    const dto = plainToInstance(CreateOrderDto, { customerId: 'c1', items: [] });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'items')).toBe(true);
  });

  it('should fail on negative quantity', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      customerId: 'c1', items: [{ productId: 'p1', quantity: -1 }],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Use real DB in UseCase test | Tests infrastructure, not logic | Mock ports via `{ provide: TOKEN, useValue: mock }` |
| 2 | Assert mock call count without purpose | Fragile, tests implementation | Assert behavior: "event emitted", "entity saved with status" |
| 3 | Test mapper with mock entity | Mapper tests data accuracy — needs real data | Use real domain + ORM entities |
| 4 | Skip error path testing | UseCase handles exceptions — must test | Test every `catch` and `throw` path |

---

## Coverage Target

| Component | Target | Rationale |
|-----------|--------|-----------|
| UseCase execute() | 95% | Every success + error path |
| Mappers (all directions) | 100% | Data accuracy is critical — one wrong field = production bug |
| DTO validation | 90% | Valid + each invalid field |
| Event emission | 80% | Verify correct event + payload |

---

*Test Plan Specialist — NestJS Unit Testing: Application Layer | EPS v10.0*
