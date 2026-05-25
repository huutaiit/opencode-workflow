# Flutter Data Table & List Specialist
# Flutterデータテーブル＆リストスペシャリスト
# Chuyen Gia Data Table Va List Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `lib/features/{feature}/presentation/pages/`, `lib/features/{feature}/presentation/widgets/` |
| **Variant** | ALL |
| **Naming Convention** | `{name}_list_page.dart`, `{name}_data_table.dart`. Classes: `{Name}ListPage`, `{Name}DataTable` |
| **Imports From** | Domain (entities for list display), Presentation (BLoC for list state) |
| **Cannot Import** | Data (datasources, models) |
| **Pattern Numbers** | 62.1–62.6 |
| **Source Paths** | `lib/features/*/presentation/pages/*_list_*.dart`, `lib/features/*/presentation/widgets/*_table_*.dart` |
| **File Count** | 5-15 list/table screens per enterprise app |
| **Imported By** | Presentation (navigation routes to list pages, master-detail layout) |
| **Dependencies** | None (Flutter SDK DataTable, ListView.builder) |
| **When To Use** | Displaying enterprise data lists — CRM contacts, ERP inventory, Healthcare patient records |
| **Source Skeleton** | `lib/features/{f}/presentation/pages/{name}_list_page.dart`, `lib/features/{f}/presentation/widgets/{name}_data_table.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate enterprise data table and list views with sorting, filtering, master-detail layout, search bar, and empty/loading/error states |
| **Activation Trigger** | files: lib/features/*/presentation/pages/*_list_*.dart; keywords: dataTable, listView, masterDetail, sortable, filterable, searchBar |

---

## Patterns

### Pattern 62.1: DataTable + PaginatedDataTable

```dart
class ContactDataTable extends StatelessWidget {
  final List<Contact> contacts;
  final int sortColumnIndex;
  final bool sortAscending;
  final ValueChanged<int> onSort;
  final ValueChanged<Contact> onRowTap;

  const ContactDataTable({
    super.key,
    required this.contacts,
    required this.sortColumnIndex,
    required this.sortAscending,
    required this.onSort,
    required this.onRowTap,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        sortColumnIndex: sortColumnIndex,
        sortAscending: sortAscending,
        columns: [
          DataColumn(label: const Text('Name'), onSort: (i, asc) => onSort(i)),
          DataColumn(label: const Text('Email'), onSort: (i, asc) => onSort(i)),
          DataColumn(label: const Text('Company'), onSort: (i, asc) => onSort(i)),
          DataColumn(label: const Text('Status'), onSort: (i, asc) => onSort(i)),
          DataColumn(label: const Text('Last Contact'), onSort: (i, asc) => onSort(i)),
          const DataColumn(label: Text('Actions')),
        ],
        rows: contacts.map((contact) => DataRow(
          onSelectChanged: (_) => onRowTap(contact),
          cells: [
            DataCell(Text(contact.fullName)),
            DataCell(Text(contact.email)),
            DataCell(Text(contact.company ?? '—')),
            DataCell(Chip(
              label: Text(contact.status.label),
              backgroundColor: contact.status.color.withOpacity(0.1),
              labelStyle: TextStyle(color: contact.status.color),
            )),
            DataCell(Text(DateFormat('yyyy-MM-dd').format(contact.lastContactedAt))),
            DataCell(Row(children: [
              IconButton(icon: const Icon(Icons.edit, size: 20), onPressed: () { /* edit */ }),
              IconButton(icon: const Icon(Icons.delete, size: 20), onPressed: () { /* delete */ }),
            ])),
          ],
        )).toList(),
      ),
    );
  }
}

// PaginatedDataTable for server-side pagination
class ContactPaginatedTable extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return PaginatedDataTable(
      header: const Text('Contacts'),
      rowsPerPage: 20,
      availableRowsPerPage: const [10, 20, 50],
      onRowsPerPageChanged: (value) { /* update page size */ },
      sortColumnIndex: 0,
      sortAscending: true,
      columns: [/* same as above */],
      source: ContactDataSource(contacts),
    );
  }
}
```

### Pattern 62.2: ListView.builder Optimization

```dart
ListView.builder(
  itemCount: contacts.length,
  // itemExtent for fixed-height items — massive performance boost
  itemExtent: 72.0,
  // Keys for stable identity
  itemBuilder: (context, index) {
    final contact = contacts[index];
    return ContactListTile(
      key: ValueKey(contact.id),
      contact: contact,
      onTap: () => context.pushNamed(RouteNames.contactDetail, pathParameters: {'id': contact.id}),
    );
  },
)
```

### Pattern 62.3: Sortable/Filterable Columns

```dart
class ContactListCubit extends Cubit<ContactListState> {
  void sortByColumn(int columnIndex, bool ascending) {
    final sorted = List<Contact>.from(state.contacts);
    sorted.sort((a, b) {
      final result = switch (columnIndex) {
        0 => a.fullName.compareTo(b.fullName),
        1 => a.email.compareTo(b.email),
        2 => (a.company ?? '').compareTo(b.company ?? ''),
        3 => a.status.index.compareTo(b.status.index),
        4 => a.lastContactedAt.compareTo(b.lastContactedAt),
        _ => 0,
      };
      return ascending ? result : -result;
    });
    emit(state.copyWith(
      contacts: sorted,
      sortColumnIndex: columnIndex,
      sortAscending: ascending,
    ));
  }

  void applyFilters({ContactStatus? status, String? company}) {
    final filtered = state.allContacts.where((c) {
      if (status != null && c.status != status) return false;
      if (company != null && c.company != company) return false;
      return true;
    }).toList();
    emit(state.copyWith(contacts: filtered, activeFilters: {'status': status, 'company': company}));
  }
}

// Filter chips UI
Wrap(
  spacing: 8,
  children: [
    for (final status in ContactStatus.values)
      FilterChip(
        label: Text(status.label),
        selected: activeFilters['status'] == status,
        onSelected: (selected) => cubit.applyFilters(status: selected ? status : null),
      ),
  ],
)
```

### Pattern 62.4: Master-Detail Layout

```dart
class ContactMasterDetail extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final isWideScreen = MediaQuery.of(context).size.width >= 900;

    if (isWideScreen) {
      // Tablet/Desktop: side-by-side
      return Row(
        children: [
          SizedBox(
            width: 400,
            child: ContactListPanel(
              onContactSelected: (contact) {
                context.read<ContactDetailCubit>().loadContact(contact.id);
              },
            ),
          ),
          const VerticalDivider(width: 1),
          Expanded(
            child: BlocBuilder<ContactDetailCubit, ContactDetailState>(
              builder: (context, state) => switch (state) {
                ContactDetailInitial() => const Center(child: Text('Select a contact')),
                ContactDetailLoaded(:final contact) => ContactDetailView(contact: contact),
                _ => const CircularProgressIndicator(),
              },
            ),
          ),
        ],
      );
    }

    // Mobile: push navigation
    return ContactListPanel(
      onContactSelected: (contact) {
        context.pushNamed(RouteNames.contactDetail, pathParameters: {'id': contact.id});
      },
    );
  }
}
```

### Pattern 62.5: Search + Filter Bar

```dart
class SearchFilterBar extends StatelessWidget {
  final TextEditingController searchController;
  final VoidCallback onSearch;
  final Map<String, dynamic> activeFilters;
  final VoidCallback onClearFilters;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Search bar
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: searchController,
            decoration: InputDecoration(
              hintText: 'Search by name, email, company...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: searchController.text.isNotEmpty
                  ? IconButton(icon: const Icon(Icons.clear), onPressed: () {
                      searchController.clear();
                      onSearch();
                    })
                  : null,
            ),
            onChanged: (_) => onSearch(),
          ),
        ),
        // Active filter chips
        if (activeFilters.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                ...activeFilters.entries.map((e) =>
                  Chip(label: Text('${e.key}: ${e.value}'), onDeleted: () { /* remove */ }),
                ),
                TextButton(onPressed: onClearFilters, child: const Text('Clear all')),
              ],
            ),
          ),
      ],
    );
  }
}
```

### Pattern 62.6: Empty/Loading/Error States

```dart
// Unified state handler for list views
Widget buildListContent(ContactListState state) => switch (state) {
  ContactListInitial() => const SizedBox.shrink(),

  ContactListLoading() => const Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      CircularProgressIndicator(),
      SizedBox(height: 16),
      Text('Loading contacts...'),
    ]),
  ),

  ContactListLoaded(contacts: []) => Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.contacts_outlined, size: 64, color: Colors.grey[400]),
      const SizedBox(height: 16),
      Text('No contacts found', style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 8),
      FilledButton.icon(
        onPressed: () => context.pushNamed(RouteNames.createContact),
        icon: const Icon(Icons.add),
        label: const Text('Add Contact'),
      ),
    ]),
  ),

  ContactListLoaded(:final contacts) => RefreshIndicator(
    onRefresh: () async => context.read<ContactListBloc>().add(const RefreshContacts()),
    child: ListView.builder(
      itemCount: contacts.length,
      itemBuilder: (context, index) => ContactCard(contact: contacts[index]),
    ),
  ),

  ContactListError(:final failure) => Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.error_outline, size: 64, color: Theme.of(context).colorScheme.error),
      const SizedBox(height: 16),
      Text(failure.message),
      const SizedBox(height: 8),
      OutlinedButton(
        onPressed: () => context.read<ContactListBloc>().add(const LoadContacts()),
        child: const Text('Retry'),
      ),
    ]),
  ),
};
```

---

## MUST DO

- Use ListView.builder (not ListView) for large lists
- Set itemExtent for fixed-height items (performance)
- Support sorting on column headers
- Implement master-detail responsive layout (tablet vs mobile)
- Handle all states: initial, loading, loaded(empty), loaded(data), error

## MUST NOT DO

- Use ListView for >20 items (use ListView.builder)
- Hardcode table column widths (use flexible/expanded)
- Skip empty state (show "no data" message + action button)
- Skip error state retry button

---

## References

- [DataTable](https://api.flutter.dev/flutter/material/DataTable-class.html)
- [PaginatedDataTable](https://api.flutter.dev/flutter/material/PaginatedDataTable-class.html)
