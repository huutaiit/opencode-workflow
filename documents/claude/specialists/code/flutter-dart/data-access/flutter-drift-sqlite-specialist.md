# Flutter Drift (SQLite) Specialist
# Flutter Drift（SQLite）スペシャリスト
# Chuyen Gia Drift SQLite Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Data |
| **Directory Pattern** | `lib/core/database/`, `lib/features/{feature}/data/datasources/` |
| **Variant** | ALL |
| **Naming Convention** | `app_database.dart`, `{name}_local_data_source.dart`, `{name}_table.dart`. Classes: `AppDatabase`, `{Name}LocalDataSource`, `{Name}Table` |
| **Imports From** | Domain (entity types for data mapping) |
| **Cannot Import** | Presentation, Core (except database config) |
| **Pattern Numbers** | 41.1–41.6 |
| **Source Paths** | `lib/core/database/*.dart`, `lib/features/*/data/datasources/*_local_*.dart` |
| **File Count** | 1 database class + 5-15 tables + 5-15 DAOs per enterprise app |
| **Imported By** | Data (repository impls use local datasources) |
| **Dependencies** | drift ^2.16.0, sqlite3_flutter_libs ^0.5.0, drift_dev ^2.16.0 (dev), build_runner (dev) |
| **When To Use** | Local SQLite database for offline-first storage, complex queries, reactive data |
| **Source Skeleton** | `lib/core/database/app_database.dart`, `lib/core/database/app_database.g.dart` (generated) |
| **Specialist Type** | code |
| **Purpose** | Generate Drift database with typed tables, DAOs, migrations, reactive queries, and joins for offline-first enterprise apps |
| **Activation Trigger** | files: lib/core/database/*.dart, lib/features/*/data/datasources/*_local_*.dart; keywords: drift, sqlite, localDatabase, offlineStorage, dao, migration |

---

## Patterns

### Pattern 41.1: Database Setup

```dart
// lib/core/database/app_database.dart
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'dart:io';

part 'app_database.g.dart';

@DriftDatabase(tables: [Users, Orders, OrderItems, Contacts])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  // For testing
  AppDatabase.forTesting(super.e);

  @override
  int get schemaVersion => 3;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (Migrator m) => m.createAll(),
    onUpgrade: stepByStep(
      from1To2: (m, schema) async {
        await m.addColumn(schema.users, schema.users.phone);
      },
      from2To3: (m, schema) async {
        await m.createTable(schema.contacts);
      },
    ),
  );
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File(p.join(dir.path, 'app.db'));
    return NativeDatabase.createInBackground(file);
  });
}
```

### Pattern 41.2: Table Definitions

```dart
// lib/core/database/tables/users_table.dart
class Users extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get remoteId => text().unique()();
  TextColumn get name => text().withLength(min: 1, max: 100)();
  TextColumn get email => text().unique()();
  TextColumn get phone => text().nullable()();
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  IntColumn get syncStatus => intEnum<SyncStatus>()();
}

class Orders extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get remoteId => text().unique()();
  IntColumn get userId => integer().references(Users, #id)();
  RealColumn get totalAmount => real()();
  TextColumn get currency => text().withDefault(const Constant('JPY'))();
  IntColumn get status => intEnum<OrderStatus>()();
  DateTimeColumn get createdAt => dateTime()();
}

class OrderItems extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get orderId => integer().references(Orders, #id, onDelete: KeyAction.cascade)();
  TextColumn get productName => text()();
  IntColumn get quantity => integer()();
  RealColumn get unitPrice => real()();
}
```

### Pattern 41.3: DAOs

```dart
// lib/core/database/daos/user_dao.dart
part of '../app_database.dart';

@DriftAccessor(tables: [Users])
class UserDao extends DatabaseAccessor<AppDatabase> with _$UserDaoMixin {
  UserDao(super.db);

  Future<List<User>> getAllUsers() => select(users).get();

  Stream<List<User>> watchAllUsers() => select(users).watch();

  Future<User> getUserById(int id) =>
      (select(users)..where((u) => u.id.equals(id))).getSingle();

  Future<User?> getUserByRemoteId(String remoteId) =>
      (select(users)..where((u) => u.remoteId.equals(remoteId))).getSingleOrNull();

  Future<int> insertUser(UsersCompanion user) => into(users).insert(user);

  Future<bool> updateUser(UsersCompanion user) => update(users).replace(user);

  Future<int> deleteUser(int id) =>
      (delete(users)..where((u) => u.id.equals(id))).go();

  // Search with filter
  Future<List<User>> searchUsers(String query, {bool? isActive}) {
    final q = select(users)
      ..where((u) => u.name.like('%$query%') | u.email.like('%$query%'));
    if (isActive != null) {
      q.where((u) => u.isActive.equals(isActive));
    }
    return q.get();
  }

  // Pagination
  Future<List<User>> getUsersPage(int page, int pageSize) {
    return (select(users)
          ..orderBy([(u) => OrderingTerm.desc(u.createdAt)])
          ..limit(pageSize, offset: (page - 1) * pageSize))
        .get();
  }
}
```

### Pattern 41.4: Migrations

```dart
@override
MigrationStrategy get migration => MigrationStrategy(
  onCreate: (Migrator m) => m.createAll(),
  onUpgrade: stepByStep(
    from1To2: (m, schema) async {
      // Add new column
      await m.addColumn(schema.users, schema.users.phone);
    },
    from2To3: (m, schema) async {
      // Add new table
      await m.createTable(schema.contacts);
      // Add index
      await m.createIndex(Index('idx_contacts_email',
          'CREATE INDEX idx_contacts_email ON contacts (email)'));
    },
    from3To4: (m, schema) async {
      // Rename column (requires recreate)
      await m.alterTable(TableMigration(schema.users));
    },
  ),
  beforeOpen: (details) async {
    // Enable foreign keys
    await customStatement('PRAGMA foreign_keys = ON');

    if (details.wasCreated) {
      // Seed initial data
      await into(users).insert(UsersCompanion.insert(
        remoteId: 'system',
        name: 'System Admin',
        email: 'admin@system.local',
        syncStatus: SyncStatus.synced,
      ));
    }
  },
);
```

### Pattern 41.5: Reactive Queries

```dart
// Watch single user — rebuilds UI on any change
Stream<User> watchUser(int id) {
  return (select(users)..where((u) => u.id.equals(id))).watchSingle();
}

// Watch filtered list — reactive to inserts/updates/deletes
Stream<List<User>> watchActiveUsers() {
  return (select(users)
        ..where((u) => u.isActive.equals(true))
        ..orderBy([(u) => OrderingTerm.desc(u.createdAt)]))
      .watch();
}

// Combined stream — watch with related data
Stream<List<OrderWithItems>> watchOrdersWithItems(int userId) {
  final query = select(orders).join([
    leftOuterJoin(orderItems, orderItems.orderId.equalsExp(orders.id)),
  ])..where(orders.userId.equals(userId));

  return query.watch().map((rows) {
    // Group by order
    final grouped = <int, OrderWithItems>{};
    for (final row in rows) {
      final order = row.readTable(orders);
      final item = row.readTableOrNull(orderItems);
      grouped.putIfAbsent(order.id, () => OrderWithItems(order, []));
      if (item != null) grouped[order.id]!.items.add(item);
    }
    return grouped.values.toList();
  });
}
```

### Pattern 41.6: Joins + Transactions

```dart
// Transaction — atomic multi-table operation
Future<void> createOrderWithItems(Order order, List<OrderItem> items) async {
  await transaction(() async {
    final orderId = await into(orders).insert(OrdersCompanion.insert(
      remoteId: order.remoteId,
      userId: order.userId,
      totalAmount: order.totalAmount,
      currency: order.currency,
      status: order.status,
      createdAt: order.createdAt,
    ));

    for (final item in items) {
      await into(orderItems).insert(OrderItemsCompanion.insert(
        orderId: orderId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      ));
    }
  });
}

// Join query — order with customer name
Future<List<OrderWithCustomer>> getOrdersWithCustomers() {
  final query = select(orders).join([
    innerJoin(users, users.id.equalsExp(orders.userId)),
  ])..orderBy([OrderingTerm.desc(orders.createdAt)]);

  return query.map((row) {
    return OrderWithCustomer(
      order: row.readTable(orders),
      customerName: row.readTable(users).name,
    );
  }).get();
}
```

---

## MUST DO

- Use `stepByStep` migrations (not manual SQL)
- Enable foreign keys in `beforeOpen`
- Use `watch()` for reactive UI updates
- Use transactions for multi-table operations
- Create `AppDatabase.forTesting(NativeDatabase.memory())` for tests

## MUST NOT DO

- Use raw SQL strings (use Drift query builders)
- Skip migrations (always increment schemaVersion)
- Use `get()` when `watch()` is more appropriate for UI
- Forget cascade delete on foreign keys

---

## References

- [Drift Documentation](https://drift.simonbinder.eu/)
- [drift Package](https://pub.dev/packages/drift)
