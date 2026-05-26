# Flutter Multi-Step Forms Specialist
# Flutterマルチステップフォームスペシャリスト
# Chuyen Gia Form Nhieu Buoc Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `lib/features/{feature}/presentation/pages/`, `lib/features/{feature}/presentation/widgets/` |
| **Variant** | ALL |
| **Naming Convention** | `{name}_wizard_page.dart`, `{name}_step_{n}.dart`. Classes: `{Name}WizardPage`, `{Name}Step{N}` |
| **Imports From** | Domain (entities for data aggregation), Presentation (BLoC for wizard state) |
| **Cannot Import** | Data (datasources, models) |
| **Pattern Numbers** | 56.1–56.5 |
| **Source Paths** | `lib/features/*/presentation/pages/*_wizard*.dart`, `lib/features/*/presentation/widgets/*_step_*.dart` |
| **File Count** | 2-5 wizard flows per enterprise app |
| **Imported By** | Presentation (navigation routes to wizard pages) |
| **Dependencies** | None (Flutter SDK Stepper, PageView) |
| **When To Use** | Multi-step data entry — patient intake, employee onboarding, complex order creation |
| **Source Skeleton** | `lib/features/{f}/presentation/pages/{name}_wizard_page.dart`, `lib/features/{f}/presentation/widgets/{name}_step_1.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate multi-step wizard forms with step validation, progress persistence, conditional steps, and cross-step data aggregation |
| **Activation Trigger** | files: lib/features/*/presentation/pages/*_wizard*.dart; keywords: wizard, stepper, multiStep, stepValidation, formWizard |

---

## Patterns

### Pattern 56.1: Stepper/Wizard Pattern

```dart
class PatientIntakeWizard extends StatefulWidget {
  const PatientIntakeWizard({super.key});
  @override
  State<PatientIntakeWizard> createState() => _PatientIntakeWizardState();
}

class _PatientIntakeWizardState extends State<PatientIntakeWizard> {
  final _pageController = PageController();
  int _currentStep = 0;
  final _totalSteps = 4;

  // Form keys per step
  final _stepKeys = List.generate(4, (_) => GlobalKey<FormState>());

  // Collected data across steps
  final _formData = <String, dynamic>{};

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Patient Intake (${_currentStep + 1}/$_totalSteps)'),
      ),
      body: Column(
        children: [
          // Progress indicator
          LinearProgressIndicator(value: (_currentStep + 1) / _totalSteps),
          // Step content
          Expanded(
            child: PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                _PersonalInfoStep(formKey: _stepKeys[0], data: _formData),
                _MedicalHistoryStep(formKey: _stepKeys[1], data: _formData),
                _InsuranceStep(formKey: _stepKeys[2], data: _formData),
                _ReviewStep(data: _formData),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: _buildNavButtons(),
    );
  }

  Widget _buildNavButtons() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          if (_currentStep > 0)
            OutlinedButton(
              onPressed: _goBack,
              child: const Text('Back'),
            ),
          const Spacer(),
          if (_currentStep < _totalSteps - 1)
            FilledButton(onPressed: _goNext, child: const Text('Next')),
          if (_currentStep == _totalSteps - 1)
            FilledButton(onPressed: _submit, child: const Text('Submit')),
        ],
      ),
    );
  }

  void _goNext() {
    if (_stepKeys[_currentStep].currentState?.validate() ?? false) {
      _stepKeys[_currentStep].currentState?.save();
      setState(() => _currentStep++);
      _pageController.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
      _saveDraft(); // Persist progress
    }
  }

  void _goBack() {
    setState(() => _currentStep--);
    _pageController.previousPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
  }

  void _submit() {
    context.read<PatientIntakeCubit>().submit(_formData);
  }
}
```

### Pattern 56.2: Step Validation + Navigation

```dart
// Each step is a Form with its own validation
class _PersonalInfoStep extends StatelessWidget {
  final GlobalKey<FormState> formKey;
  final Map<String, dynamic> data;

  const _PersonalInfoStep({required this.formKey, required this.data});

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      child: ListView(padding: const EdgeInsets.all(16), children: [
        TextFormField(
          initialValue: data['firstName'] as String?,
          decoration: const InputDecoration(labelText: 'First Name *'),
          validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
          onSaved: (v) => data['firstName'] = v,
        ),
        TextFormField(
          initialValue: data['lastName'] as String?,
          decoration: const InputDecoration(labelText: 'Last Name *'),
          validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
          onSaved: (v) => data['lastName'] = v,
        ),
        DatePickerFormField(
          label: 'Date of Birth *',
          initialValue: data['dateOfBirth'] as DateTime?,
          validator: (v) => v == null ? 'Required' : null,
          onSaved: (v) => data['dateOfBirth'] = v,
        ),
      ]),
    );
  }
}
```

### Pattern 56.3: Progress Persistence

```dart
// Save wizard progress to SharedPreferences
Future<void> _saveDraft() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('patient_intake_draft', jsonEncode({
    'currentStep': _currentStep,
    'data': _serializeFormData(_formData),
    'savedAt': DateTime.now().toIso8601String(),
  }));
}

// Restore on page open
Future<void> _loadDraft() async {
  final prefs = await SharedPreferences.getInstance();
  final draft = prefs.getString('patient_intake_draft');
  if (draft != null) {
    final parsed = jsonDecode(draft) as Map<String, dynamic>;
    setState(() {
      _currentStep = parsed['currentStep'] as int;
      _formData.addAll(parsed['data'] as Map<String, dynamic>);
    });
    _pageController.jumpToPage(_currentStep);
  }
}
```

### Pattern 56.4: Conditional Steps

```dart
// Skip insurance step if patient pays out-of-pocket
List<Widget> _buildSteps() {
  return [
    _PersonalInfoStep(formKey: _stepKeys[0], data: _formData),
    _MedicalHistoryStep(formKey: _stepKeys[1], data: _formData),
    if (_formData['paymentMethod'] != 'out_of_pocket')
      _InsuranceStep(formKey: _stepKeys[2], data: _formData),
    _ReviewStep(data: _formData),
  ];
}

int get _totalSteps => _buildSteps().length;
```

### Pattern 56.5: Form Data Aggregation

```dart
// Final review step — aggregate all data
class _ReviewStep extends StatelessWidget {
  final Map<String, dynamic> data;
  const _ReviewStep({required this.data});

  @override
  Widget build(BuildContext context) {
    return ListView(padding: const EdgeInsets.all(16), children: [
      _ReviewSection('Personal Information', [
        _ReviewRow('Name', '${data['firstName']} ${data['lastName']}'),
        _ReviewRow('DOB', DateFormat('yyyy-MM-dd').format(data['dateOfBirth'])),
      ]),
      _ReviewSection('Medical History', [
        _ReviewRow('Allergies', data['allergies'] ?? 'None'),
        _ReviewRow('Medications', data['medications'] ?? 'None'),
      ]),
      if (data.containsKey('insuranceProvider'))
        _ReviewSection('Insurance', [
          _ReviewRow('Provider', data['insuranceProvider']),
          _ReviewRow('Policy #', data['policyNumber']),
        ]),
    ]);
  }
}

// Convert form data to domain entity for submission
PatientIntake _toEntity() {
  return PatientIntake(
    firstName: _formData['firstName'],
    lastName: _formData['lastName'],
    dateOfBirth: _formData['dateOfBirth'],
    allergies: _formData['allergies'],
    insuranceProvider: _formData['insuranceProvider'],
    policyNumber: _formData['policyNumber'],
  );
}
```

---

## MUST DO

- Validate each step before allowing next
- Save progress to local storage (survive app kill)
- Show progress indicator (step N of M)
- Support back navigation without losing data
- Aggregate data across steps into single DTO for submission

## MUST NOT DO

- Allow skipping validation on any step
- Lose form data on back navigation
- Submit without showing review step for complex forms

---

## References

- [Flutter Stepper](https://api.flutter.dev/flutter/material/Stepper-class.html)
- [PageView for wizards](https://api.flutter.dev/flutter/widgets/PageView-class.html)
