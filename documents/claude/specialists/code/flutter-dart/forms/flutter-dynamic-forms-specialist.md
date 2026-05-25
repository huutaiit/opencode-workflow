# Flutter Dynamic / Metadata-Driven Forms Specialist
# Flutterダイナミックフォームスペシャリスト
# Chuyen Gia Form Dong Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation, Data |
| **Directory Pattern** | `lib/features/{feature}/presentation/widgets/`, `lib/features/{feature}/data/models/` |
| **Variant** | ALL |
| **Naming Convention** | `dynamic_form_renderer.dart`, `form_field_config.dart`. Classes: `DynamicFormRenderer`, `FormFieldConfig` |
| **Imports From** | Domain (entities for field mapping), Data (API response with form schema) |
| **Cannot Import** | N/A (cross-layer pattern — form schema from Data, rendering in Presentation — justified by server-driven UI being an end-to-end concern) |
| **Pattern Numbers** | 57.1–57.5 |
| **Source Paths** | `lib/features/*/presentation/widgets/dynamic_form*.dart`, `lib/features/*/data/models/form_*_config*.dart` |
| **File Count** | 1 renderer + 1 config model + 3-5 field type widgets per enterprise app |
| **Imported By** | Presentation (pages use DynamicFormRenderer for configurable forms) |
| **Dependencies** | None (Flutter SDK widgets — field types built from TextFormField, DropdownButtonFormField, etc.) |
| **When To Use** | Server-driven forms — ERP configurable fields, CRM custom fields, forms that change without app update |
| **Source Skeleton** | `lib/features/{f}/presentation/widgets/dynamic_form_renderer.dart`, `lib/features/{f}/data/models/form_field_config.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate metadata-driven form rendering engine that builds forms from JSON schema — enabling server-configurable forms without app code changes |
| **Activation Trigger** | files: lib/features/*/presentation/widgets/dynamic_form*.dart; keywords: dynamicForm, jsonSchema, serverDrivenUI, metadataDriven, formConfig |

---

## Patterns

### Pattern 57.1: JSON Schema → Form Rendering

```dart
// lib/features/crm/data/models/form_field_config.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'form_field_config.freezed.dart';
part 'form_field_config.g.dart';

@freezed
class FormFieldConfig with _$FormFieldConfig {
  const factory FormFieldConfig({
    required String id,
    required String label,
    required FieldType type,
    @Default(false) bool required,
    String? defaultValue,
    String? placeholder,
    String? validationRegex,
    String? validationMessage,
    int? minLength,
    int? maxLength,
    List<OptionItem>? options, // for dropdown, radio, checkbox
    String? dependsOn, // field ID this depends on
    String? showWhen, // value of dependsOn that makes this visible
    int? order,
  }) = _FormFieldConfig;

  factory FormFieldConfig.fromJson(Map<String, dynamic> json) =>
      _$FormFieldConfigFromJson(json);
}

enum FieldType {
  text, email, phone, number, date, dateTime,
  dropdown, radio, checkbox, toggle,
  textarea, file, signature,
}

@freezed
class OptionItem with _$OptionItem {
  const factory OptionItem({
    required String value,
    required String label,
  }) = _OptionItem;

  factory OptionItem.fromJson(Map<String, dynamic> json) =>
      _$OptionItemFromJson(json);
}
```

### Pattern 57.2: Metadata-Driven Field Generation

```dart
// lib/features/crm/presentation/widgets/dynamic_form_renderer.dart
class DynamicFormRenderer extends StatelessWidget {
  final List<FormFieldConfig> fields;
  final Map<String, dynamic> values;
  final GlobalKey<FormState> formKey;
  final void Function(String fieldId, dynamic value) onFieldChanged;

  const DynamicFormRenderer({
    super.key,
    required this.fields,
    required this.values,
    required this.formKey,
    required this.onFieldChanged,
  });

  @override
  Widget build(BuildContext context) {
    final visibleFields = fields
        .where((f) => _isFieldVisible(f))
        .toList()
      ..sort((a, b) => (a.order ?? 0).compareTo(b.order ?? 0));

    return Form(
      key: formKey,
      child: ListView.separated(
        itemCount: visibleFields.length,
        separatorBuilder: (_, __) => const SizedBox(height: 16),
        itemBuilder: (context, index) => _buildField(visibleFields[index]),
      ),
    );
  }

  Widget _buildField(FormFieldConfig config) => switch (config.type) {
    FieldType.text || FieldType.email || FieldType.phone || FieldType.number =>
      _buildTextFormField(config),
    FieldType.textarea => _buildTextAreaField(config),
    FieldType.date || FieldType.dateTime => _buildDateField(config),
    FieldType.dropdown => _buildDropdownField(config),
    FieldType.radio => _buildRadioField(config),
    FieldType.checkbox || FieldType.toggle => _buildToggleField(config),
    FieldType.file => _buildFileField(config),
    FieldType.signature => _buildSignatureField(config),
  };

  Widget _buildTextFormField(FormFieldConfig config) {
    return TextFormField(
      initialValue: values[config.id]?.toString() ?? config.defaultValue,
      decoration: InputDecoration(
        labelText: '${config.label}${config.required ? ' *' : ''}',
        hintText: config.placeholder,
      ),
      keyboardType: switch (config.type) {
        FieldType.email => TextInputType.emailAddress,
        FieldType.phone => TextInputType.phone,
        FieldType.number => TextInputType.number,
        _ => TextInputType.text,
      },
      maxLength: config.maxLength,
      validator: (value) => _validate(config, value),
      onChanged: (v) => onFieldChanged(config.id, v),
    );
  }

  Widget _buildDropdownField(FormFieldConfig config) {
    return DropdownButtonFormField<String>(
      value: values[config.id] as String? ?? config.defaultValue,
      decoration: InputDecoration(
        labelText: '${config.label}${config.required ? ' *' : ''}',
      ),
      items: config.options?.map((opt) =>
        DropdownMenuItem(value: opt.value, child: Text(opt.label)),
      ).toList(),
      validator: (v) => config.required && (v == null || v.isEmpty) ? '${config.label} is required' : null,
      onChanged: (v) => onFieldChanged(config.id, v),
    );
  }

  Widget _buildDateField(FormFieldConfig config) {
    return DatePickerFormField(
      label: '${config.label}${config.required ? ' *' : ''}',
      initialValue: values[config.id] != null ? DateTime.parse(values[config.id]) : null,
      validator: (v) => config.required && v == null ? '${config.label} is required' : null,
      onSaved: (v) => onFieldChanged(config.id, v?.toIso8601String()),
    );
  }

  // ... other field builders

  bool _isFieldVisible(FormFieldConfig config) {
    if (config.dependsOn == null) return true;
    final dependValue = values[config.dependsOn];
    return dependValue?.toString() == config.showWhen;
  }

  String? _validate(FormFieldConfig config, String? value) {
    if (config.required && (value == null || value.isEmpty)) {
      return '${config.label} is required';
    }
    if (config.minLength != null && (value?.length ?? 0) < config.minLength!) {
      return 'Minimum ${config.minLength} characters';
    }
    if (config.validationRegex != null && value != null && value.isNotEmpty) {
      if (!RegExp(config.validationRegex!).hasMatch(value)) {
        return config.validationMessage ?? 'Invalid format';
      }
    }
    return null;
  }
}
```

### Pattern 57.3: Dynamic Validation Rules

```dart
// Server-sent validation — applied at runtime
{
  "fields": [
    {
      "id": "employee_id",
      "label": "Employee ID",
      "type": "text",
      "required": true,
      "validationRegex": "^EMP-\\d{6}$",
      "validationMessage": "Format: EMP-XXXXXX"
    },
    {
      "id": "salary",
      "label": "Monthly Salary",
      "type": "number",
      "required": true,
      "minValue": 0,
      "maxValue": 999999999
    }
  ]
}
```

### Pattern 57.4: Field Dependencies

```dart
// Show insurance fields only when payment method = "insurance"
{
  "fields": [
    {
      "id": "payment_method",
      "label": "Payment Method",
      "type": "dropdown",
      "required": true,
      "options": [
        {"value": "insurance", "label": "Insurance"},
        {"value": "cash", "label": "Cash"},
        {"value": "credit_card", "label": "Credit Card"}
      ]
    },
    {
      "id": "insurance_provider",
      "label": "Insurance Provider",
      "type": "text",
      "required": true,
      "dependsOn": "payment_method",
      "showWhen": "insurance"
    },
    {
      "id": "policy_number",
      "label": "Policy Number",
      "type": "text",
      "required": true,
      "dependsOn": "payment_method",
      "showWhen": "insurance"
    }
  ]
}
```

### Pattern 57.5: Server-Driven UI Forms

```dart
// Fetch form config from API
class DynamicFormPage extends StatelessWidget {
  final String formId; // e.g., "patient_intake", "employee_onboarding"

  const DynamicFormPage({super.key, required this.formId});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<DynamicFormCubit>()..loadFormConfig(formId),
      child: BlocBuilder<DynamicFormCubit, DynamicFormState>(
        builder: (context, state) => switch (state) {
          DynamicFormLoading() => const Center(child: CircularProgressIndicator()),
          DynamicFormLoaded(:final fields, :final values) => Scaffold(
            appBar: AppBar(title: Text(formId)),
            body: DynamicFormRenderer(
              fields: fields,
              values: values,
              formKey: GlobalKey<FormState>(),
              onFieldChanged: (id, value) =>
                  context.read<DynamicFormCubit>().updateField(id, value),
            ),
            floatingActionButton: FloatingActionButton.extended(
              onPressed: () => context.read<DynamicFormCubit>().submit(),
              label: const Text('Submit'),
              icon: const Icon(Icons.check),
            ),
          ),
          DynamicFormError(:final message) => Center(child: Text(message)),
          _ => const SizedBox.shrink(),
        },
      ),
    );
  }
}
```

---

## MUST DO

- Parse form schema from JSON (not hardcode fields)
- Support field dependencies (show/hide based on other field values)
- Apply server-sent validation rules at client side
- Use Freezed for FormFieldConfig model
- Support all common field types (text, dropdown, date, file, toggle)

## MUST NOT DO

- Hardcode form fields when server-driven is required
- Skip validation for dynamically generated fields
- Ignore field order from server schema
- Render hidden/dependent fields when condition not met

---

## References

- [Server-Driven UI](https://docs.flutter.dev/ui/widgets/basics)
- [JSON Forms](https://jsonforms.io/)
