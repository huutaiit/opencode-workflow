# Flutter Complex Forms Specialist
# Flutter複雑フォームスペシャリスト
# Chuyen Gia Form Phuc Tap Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `lib/features/{feature}/presentation/pages/`, `lib/features/{feature}/presentation/widgets/` |
| **Variant** | ALL |
| **Naming Convention** | `{name}_form.dart`, `{name}_form_field.dart`. Classes: `{Name}Form`, `{Name}FormField` |
| **Imports From** | Domain (entities for form initial values), Presentation (BLoC for form state) |
| **Cannot Import** | Data (datasources, models, repo impls) |
| **Pattern Numbers** | 55.1–55.6 |
| **Source Paths** | `lib/features/*/presentation/pages/*_form*.dart`, `lib/features/*/presentation/widgets/*_form_field*.dart` |
| **File Count** | 5-20 form screens per enterprise app |
| **Imported By** | Presentation (pages embed forms) |
| **Dependencies** | None (Flutter SDK Form, TextFormField, GlobalKey<FormState>) |
| **When To Use** | Building CRUD forms with validation, cross-field rules, async validation, auto-save |
| **Source Skeleton** | `lib/features/{f}/presentation/pages/{name}_form_page.dart`, `lib/features/{f}/presentation/widgets/{name}_form_field.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate enterprise form pages with GlobalKey<FormState>, custom FormField widgets, cross-field validation, BLoC integration, and auto-save |
| **Activation Trigger** | files: lib/features/*/presentation/**/*form*.dart; keywords: form, formField, validation, formState, crossFieldValidation, autoSave |

---

## Patterns

### Pattern 55.1: Form Architecture

```dart
class ContactFormPage extends StatefulWidget {
  final Contact? initialContact; // null = create, non-null = edit
  const ContactFormPage({super.key, this.initialContact});

  @override
  State<ContactFormPage> createState() => _ContactFormPageState();
}

class _ContactFormPageState extends State<ContactFormPage> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _emailController;
  late final TextEditingController _phoneController;
  String? _selectedCompany;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.initialContact?.name ?? '');
    _emailController = TextEditingController(text: widget.initialContact?.email ?? '');
    _phoneController = TextEditingController(text: widget.initialContact?.phone ?? '');
    _selectedCompany = widget.initialContact?.company;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.initialContact == null ? 'New Contact' : 'Edit Contact')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Full Name *'),
              validator: (v) => v == null || v.isEmpty ? 'Name is required' : null,
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _emailController,
              decoration: const InputDecoration(labelText: 'Email *'),
              keyboardType: TextInputType.emailAddress,
              validator: Validators.email,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _phoneController,
              decoration: const InputDecoration(labelText: 'Phone'),
              keyboardType: TextInputType.phone,
              validator: Validators.phoneOptional,
            ),
            const SizedBox(height: 16),
            CompanyDropdownField(
              value: _selectedCompany,
              onChanged: (v) => setState(() => _selectedCompany = v),
            ),
            const SizedBox(height: 32),
            FilledButton(
              onPressed: _onSubmit,
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  void _onSubmit() {
    if (_formKey.currentState!.validate()) {
      _formKey.currentState!.save();
      context.read<ContactFormCubit>().submit(
        name: _nameController.text,
        email: _emailController.text,
        phone: _phoneController.text.isNotEmpty ? _phoneController.text : null,
        company: _selectedCompany,
      );
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }
}
```

### Pattern 55.2: Custom FormField Widgets

```dart
// Reusable date picker form field
class DatePickerFormField extends FormField<DateTime> {
  DatePickerFormField({
    super.key,
    required String label,
    DateTime? initialValue,
    DateTime? firstDate,
    DateTime? lastDate,
    super.validator,
    super.onSaved,
  }) : super(
    initialValue: initialValue,
    builder: (FormFieldState<DateTime> state) {
      return InkWell(
        onTap: () async {
          final picked = await showDatePicker(
            context: state.context,
            initialDate: state.value ?? DateTime.now(),
            firstDate: firstDate ?? DateTime(2000),
            lastDate: lastDate ?? DateTime(2100),
          );
          if (picked != null) state.didChange(picked);
        },
        child: InputDecorator(
          decoration: InputDecoration(
            labelText: label,
            errorText: state.errorText,
            suffixIcon: const Icon(Icons.calendar_today),
          ),
          child: Text(
            state.value != null
                ? DateFormat('yyyy-MM-dd').format(state.value!)
                : 'Select date',
          ),
        ),
      );
    },
  );
}

// File picker form field
class FilePickerFormField extends FormField<File?> {
  FilePickerFormField({
    super.key,
    required String label,
    List<String> allowedExtensions = const ['pdf', 'jpg', 'png'],
    super.validator,
    super.onSaved,
  }) : super(
    initialValue: null,
    builder: (FormFieldState<File?> state) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          OutlinedButton.icon(
            onPressed: () async {
              final result = await FilePicker.platform.pickFiles(
                type: FileType.custom,
                allowedExtensions: allowedExtensions,
              );
              if (result != null) {
                state.didChange(File(result.files.single.path!));
              }
            },
            icon: const Icon(Icons.attach_file),
            label: Text(state.value != null
                ? state.value!.path.split('/').last
                : 'Attach $label'),
          ),
          if (state.hasError)
            Text(state.errorText!, style: TextStyle(color: Theme.of(state.context).colorScheme.error, fontSize: 12)),
        ],
      );
    },
  );
}
```

### Pattern 55.3: Cross-Field Validation

```dart
// Validate across multiple fields
bool _validateForm() {
  final isValid = _formKey.currentState!.validate();

  // Cross-field: end date must be after start date
  if (_startDate != null && _endDate != null && _endDate!.isBefore(_startDate!)) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('End date must be after start date')),
    );
    return false;
  }

  // Cross-field: if status is "active", email is required
  if (_selectedStatus == 'active' && _emailController.text.isEmpty) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Email is required for active contacts')),
    );
    return false;
  }

  return isValid;
}
```

### Pattern 55.4: Form State with BLoC

```dart
// FormCubit — manages form submission state
@freezed
sealed class ContactFormState with _$ContactFormState {
  const factory ContactFormState.editing() = ContactFormEditing;
  const factory ContactFormState.submitting() = ContactFormSubmitting;
  const factory ContactFormState.success({required Contact contact}) = ContactFormSuccess;
  const factory ContactFormState.error({required Failure failure}) = ContactFormError;
}

class ContactFormCubit extends Cubit<ContactFormState> {
  final CreateContact _createContact;
  final UpdateContact _updateContact;

  ContactFormCubit(this._createContact, this._updateContact)
      : super(const ContactFormState.editing());

  Future<void> submit({
    String? id, // null = create, non-null = update
    required String name,
    required String email,
    String? phone,
    String? company,
  }) async {
    emit(const ContactFormState.submitting());

    final result = id == null
        ? await _createContact(CreateContactParams(name: name, email: email, phone: phone, company: company))
        : await _updateContact(UpdateContactParams(id: id, name: name, email: email, phone: phone, company: company));

    result.fold(
      (failure) => emit(ContactFormState.error(failure: failure)),
      (contact) => emit(ContactFormState.success(contact: contact)),
    );
  }
}

// In page — listen for state changes
BlocListener<ContactFormCubit, ContactFormState>(
  listener: (context, state) => switch (state) {
    ContactFormSuccess(:final contact) => context.pop(contact),
    ContactFormError(:final failure) => ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(failure.message)),
    ),
    _ => null,
  },
  child: /* form */,
),
```

### Pattern 55.5: Debounced Async Validation

```dart
// Email uniqueness check — debounced
TextFormField(
  controller: _emailController,
  decoration: InputDecoration(
    labelText: 'Email *',
    suffixIcon: _isCheckingEmail ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : null,
  ),
  validator: Validators.email,
  onChanged: (value) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 500), () async {
      if (Validators.email(value) == null) {
        setState(() => _isCheckingEmail = true);
        final isUnique = await context.read<ContactFormCubit>().checkEmailUnique(value);
        setState(() {
          _isCheckingEmail = false;
          _emailError = isUnique ? null : 'Email already exists';
        });
      }
    });
  },
),
```

### Pattern 55.6: Form Auto-Save

```dart
// Auto-save draft every 30 seconds
class _OrderFormPageState extends State<OrderFormPage> {
  Timer? _autoSaveTimer;

  @override
  void initState() {
    super.initState();
    _autoSaveTimer = Timer.periodic(const Duration(seconds: 30), (_) => _saveDraft());
    _loadDraft(); // Restore previous draft
  }

  Future<void> _saveDraft() async {
    final draft = {
      'name': _nameController.text,
      'email': _emailController.text,
      'phone': _phoneController.text,
      'company': _selectedCompany,
      'savedAt': DateTime.now().toIso8601String(),
    };
    await SharedPreferences.getInstance().then(
      (prefs) => prefs.setString('contact_draft', jsonEncode(draft)),
    );
  }

  Future<void> _loadDraft() async {
    final prefs = await SharedPreferences.getInstance();
    final draftJson = prefs.getString('contact_draft');
    if (draftJson != null && widget.initialContact == null) {
      final draft = jsonDecode(draftJson) as Map<String, dynamic>;
      _nameController.text = draft['name'] ?? '';
      _emailController.text = draft['email'] ?? '';
      _phoneController.text = draft['phone'] ?? '';
      _selectedCompany = draft['company'];
    }
  }

  Future<void> _clearDraft() async {
    await SharedPreferences.getInstance().then(
      (prefs) => prefs.remove('contact_draft'),
    );
  }

  void _onSubmitSuccess() {
    _clearDraft();
    _autoSaveTimer?.cancel();
  }

  @override
  void dispose() {
    _autoSaveTimer?.cancel();
    super.dispose();
  }
}
```

---

## MUST DO

- Use GlobalKey<FormState> for form validation
- Create reusable FormField widgets for custom inputs (date, file, dropdown)
- Use Cubit for form submission state (editing/submitting/success/error)
- Implement cross-field validation after individual field validation
- Auto-save drafts for long forms (enterprise data entry)

## MUST NOT DO

- Put form submission logic in widget (use Cubit/BLoC)
- Forget to dispose TextEditingControllers
- Skip keyboard type (TextInputType.email, .phone, .number)
- Use setState for complex form state (use Cubit)

---

## References

- [Flutter Forms](https://docs.flutter.dev/cookbook/forms)
- [Form Validation](https://docs.flutter.dev/cookbook/forms/validation)
