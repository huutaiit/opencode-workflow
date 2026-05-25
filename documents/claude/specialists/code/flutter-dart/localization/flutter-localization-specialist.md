# Flutter Localization Specialist
# Flutter ローカライゼーションスペシャリスト
# Chuyen Gia Da Ngon Ngu Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core |
| **Directory Pattern** | `lib/l10n/`, `lib/core/localization/` |
| **Variant** | ALL |
| **Naming Convention** | `app_{locale}.arb` (ARB files), `localization_service.dart`. Class: `LocalizationService` |
| **Imports From** | Core (theme for locale-aware formatting) |
| **Cannot Import** | Domain, Data, Presentation, Features |
| **Pattern Numbers** | 87.1–87.9 |
| **Source Paths** | `lib/l10n/*.arb`, `lib/core/localization/*.dart` |
| **File Count** | 3-5 ARB files (1 per locale) + 1-2 localization service files |
| **Imported By** | ALL presentation widgets (AppLocalizations.of(context) used in every page) |
| **Dependencies** | flutter_localizations (SDK), intl ^0.19.0 |
| **When To Use** | Multi-language app setup — Vietnamese, English, Japanese localization with date/number/currency formatting |
| **Source Skeleton** | `lib/l10n/app_en.arb`, `lib/l10n/app_vi.arb`, `lib/l10n/app_ja.arb`, `lib/core/localization/localization_service.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate flutter_localizations setup with ARB files, plurals/gender/select ICU syntax, locale-aware date/number formatting, timezone handling, and dynamic locale switching |
| **Activation Trigger** | files: lib/l10n/*.arb, lib/core/localization/*.dart; keywords: localization, l10n, arb, intl, locale, translation, timezone |

---

## Patterns

### Pattern 87.1: flutter_localizations Setup

```yaml
# l10n.yaml (project root)
arb-dir: lib/l10n
template-arb-file: app_en.arb
output-localization-file: app_localizations.dart
output-class: AppLocalizations
nullable-getter: false
```

```dart
// main.dart — MaterialApp configuration
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

MaterialApp(
  localizationsDelegates: const [
    AppLocalizations.delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ],
  supportedLocales: const [
    Locale('en'),      // English
    Locale('vi'),      // Vietnamese
    Locale('ja'),      // Japanese
  ],
  locale: currentLocale, // From state management
  // Fallback
  localeResolutionCallback: (locale, supportedLocales) {
    for (final supported in supportedLocales) {
      if (supported.languageCode == locale?.languageCode) {
        return supported;
      }
    }
    return supportedLocales.first; // Default to English
  },
);

// Usage in widgets
Text(AppLocalizations.of(context).welcomeMessage)
```

```yaml
# pubspec.yaml
dependencies:
  flutter_localizations:
    sdk: flutter
  intl: ^0.19.0

flutter:
  generate: true  # Enable code generation for l10n
```

### Pattern 87.2: ARB File Structure

```json
// lib/l10n/app_en.arb
{
  "@@locale": "en",
  "welcomeMessage": "Welcome back, {userName}!",
  "@welcomeMessage": {
    "description": "Greeting shown on home screen",
    "placeholders": {
      "userName": {
        "type": "String",
        "example": "John"
      }
    }
  },
  "orderCount": "{count} orders",
  "@orderCount": {
    "description": "Number of orders",
    "placeholders": {
      "count": { "type": "int" }
    }
  },
  "lastUpdated": "Last updated: {date}",
  "@lastUpdated": {
    "placeholders": {
      "date": { "type": "DateTime", "format": "yMMMd" }
    }
  }
}
```

```json
// lib/l10n/app_vi.arb
{
  "@@locale": "vi",
  "welcomeMessage": "Chào mừng trở lại, {userName}!",
  "orderCount": "{count} đơn hàng",
  "lastUpdated": "Cập nhật lần cuối: {date}"
}
```

```json
// lib/l10n/app_ja.arb
{
  "@@locale": "ja",
  "welcomeMessage": "おかえりなさい、{userName}さん！",
  "orderCount": "{count}件の注文",
  "lastUpdated": "最終更新：{date}"
}
```

### Pattern 87.3: Plurals + Gender + Select

```json
// Plural — ICU MessageFormat syntax
{
  "itemCount": "{count, plural, =0{No items} =1{1 item} other{{count} items}}",
  "@itemCount": {
    "placeholders": { "count": { "type": "int" } }
  },

  "itemCountVi": "{count, plural, =0{Không có mục nào} other{{count} mục}}",

  "itemCountJa": "{count, plural, =0{アイテムなし} other{{count}個のアイテム}}",

  "genderGreeting": "{gender, select, male{Mr. {name}} female{Ms. {name}} other{{name}}}",
  "@genderGreeting": {
    "placeholders": {
      "gender": { "type": "String" },
      "name": { "type": "String" }
    }
  },

  "notificationType": "{type, select, order{Order update} payment{Payment received} message{New message} other{Notification}}",
  "@notificationType": {
    "placeholders": {
      "type": { "type": "String" }
    }
  }
}
```

### Pattern 87.4: Date/Number/Currency Formatting

```dart
import 'package:intl/intl.dart';

class LocaleFormatterService {
  final String locale;

  LocaleFormatterService(this.locale);

  /// Date formatting — locale-aware
  String formatDate(DateTime date, {String? pattern}) {
    return DateFormat(pattern ?? 'yMMMd', locale).format(date);
  }

  // en: "Apr 5, 2026"
  // vi: "5 thg 4, 2026"
  // ja: "2026年4月5日"

  /// Number formatting — locale-aware decimal/grouping
  String formatNumber(num value, {int decimalDigits = 0}) {
    return NumberFormat.decimalPattern(locale)
        .format(value);
  }

  // en: "1,234,567"
  // vi: "1.234.567"
  // ja: "1,234,567"

  /// Currency formatting
  String formatCurrency(num value, {String? symbol}) {
    switch (locale) {
      case 'vi':
        return NumberFormat.currency(locale: locale, symbol: symbol ?? '₫', decimalDigits: 0)
            .format(value);
        // "1.234.567 ₫"
      case 'ja':
        return NumberFormat.currency(locale: locale, symbol: symbol ?? '¥', decimalDigits: 0)
            .format(value);
        // "¥1,234,567"
      default:
        return NumberFormat.currency(locale: locale, symbol: symbol ?? '\$')
            .format(value);
        // "$1,234,567.00"
    }
  }

  /// Relative time — "2 hours ago", "3 days ago"
  String formatRelativeTime(DateTime dateTime) {
    final diff = DateTime.now().difference(dateTime);

    if (diff.inMinutes < 1) return _relativeJustNow;
    if (diff.inMinutes < 60) return _relativeMinutes(diff.inMinutes);
    if (diff.inHours < 24) return _relativeHours(diff.inHours);
    if (diff.inDays < 30) return _relativeDays(diff.inDays);
    return formatDate(dateTime);
  }

  String get _relativeJustNow {
    switch (locale) {
      case 'vi': return 'Vừa xong';
      case 'ja': return 'たった今';
      default: return 'Just now';
    }
  }

  String _relativeMinutes(int minutes) {
    switch (locale) {
      case 'vi': return '$minutes phút trước';
      case 'ja': return '$minutes分前';
      default: return '$minutes minutes ago';
    }
  }

  String _relativeHours(int hours) {
    switch (locale) {
      case 'vi': return '$hours giờ trước';
      case 'ja': return '$hours時間前';
      default: return '$hours hours ago';
    }
  }

  String _relativeDays(int days) {
    switch (locale) {
      case 'vi': return '$days ngày trước';
      case 'ja': return '$days日前';
      default: return '$days days ago';
    }
  }
}
```

### Pattern 87.5: RTL Support

```dart
/// RTL (Right-to-Left) layout support for Arabic, Hebrew
/// Most Flutter widgets handle RTL automatically when using:
/// - EdgeInsetsDirectional instead of EdgeInsets
/// - AlignmentDirectional instead of Alignment
/// - TextDirection-aware properties

class RtlAwareWidget extends StatelessWidget {
  final Widget child;

  const RtlAwareWidget({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: Localizations.localeOf(context).languageCode == 'ar'
          ? TextDirection.rtl
          : TextDirection.ltr,
      child: child,
    );
  }
}

// Use directional padding (auto-flips for RTL)
Padding(
  padding: const EdgeInsetsDirectional.only(start: 16, end: 8),
  child: child,
)

// Use directional alignment
Align(
  alignment: AlignmentDirectional.centerStart, // Left in LTR, Right in RTL
  child: child,
)
```

### Pattern 87.6: Dynamic Locale Switching

```dart
/// Locale state management with persistence
class LocaleBloc extends Cubit<Locale> {
  final SharedPreferences _prefs;
  static const _localeKey = 'app_locale';

  LocaleBloc(this._prefs) : super(_loadSavedLocale(_prefs));

  static Locale _loadSavedLocale(SharedPreferences prefs) {
    final saved = prefs.getString(_localeKey);
    return saved != null ? Locale(saved) : const Locale('en');
  }

  /// Change locale at runtime
  Future<void> changeLocale(Locale locale) async {
    await _prefs.setString(_localeKey, locale.languageCode);
    emit(locale);
  }

  /// Get current locale code
  String get languageCode => state.languageCode;
}

// In MaterialApp (wrap with BlocBuilder)
BlocBuilder<LocaleBloc, Locale>(
  builder: (context, locale) {
    return MaterialApp(
      locale: locale,
      // ... localizationsDelegates, supportedLocales
    );
  },
)
```

### Pattern 87.7: Vietnamese + Japanese Typography

```dart
/// Font configuration for CJK and Vietnamese diacritical marks
///
/// Vietnamese characters with diacriticals:
///   ă, â, đ, ê, ô, ơ, ư (+ combining tone marks: à, ả, ã, á, ạ)
///
/// Japanese character sets:
///   Hiragana (ひらがな), Katakana (カタカナ), Kanji (漢字)

ThemeData buildLocalizedTheme(String locale) {
  return ThemeData(
    textTheme: TextTheme(
      bodyLarge: TextStyle(
        fontFamily: _getFontFamily(locale),
        height: _getLineHeight(locale),
      ),
    ),
    // Vietnamese needs slightly more line height for diacriticals
    // Japanese needs more for complex Kanji rendering
  );
}

String _getFontFamily(String locale) {
  switch (locale) {
    case 'ja':
      return 'NotoSansJP'; // Google Noto Sans JP — covers all CJK
    case 'vi':
      return 'Roboto'; // Default Roboto handles Vietnamese well
    default:
      return 'Roboto';
  }
}

double _getLineHeight(String locale) {
  switch (locale) {
    case 'ja': return 1.6; // CJK needs more vertical space
    case 'vi': return 1.5; // Diacriticals need extra height
    default: return 1.4;
  }
}
```

### Pattern 87.8: Timezone Handling

```dart
/// Store in UTC, display in local timezone
class TimezoneService {
  /// Convert local DateTime to UTC for storage
  static DateTime toUtc(DateTime local) => local.toUtc();

  /// Convert UTC DateTime to local for display
  static DateTime toLocal(DateTime utc) => utc.toLocal();

  /// Format with explicit timezone indicator
  static String formatWithTimezone(DateTime utc, String locale) {
    final local = utc.toLocal();
    final offset = local.timeZoneOffset;
    final sign = offset.isNegative ? '-' : '+';
    final hours = offset.inHours.abs().toString().padLeft(2, '0');
    final minutes = (offset.inMinutes.abs() % 60).toString().padLeft(2, '0');

    final formatted = DateFormat('yyyy-MM-dd HH:mm', locale).format(local);
    return '$formatted (UTC$sign$hours:$minutes)';
  }

  // JST example:
  // UTC: 2026-04-05T00:00:00Z
  // JST: 2026-04-05 09:00 (UTC+09:00)
  // ICT: 2026-04-05 07:00 (UTC+07:00)
}
```

### Pattern 87.9: Business Hours + Working Days

```dart
/// Locale-aware working days and holiday calendars
class BusinessCalendarService {
  final String locale;

  BusinessCalendarService(this.locale);

  /// Working days per locale
  List<int> get workingDays {
    switch (locale) {
      case 'vi':
        return [DateTime.monday, DateTime.tuesday, DateTime.wednesday,
                DateTime.thursday, DateTime.friday, DateTime.saturday];
        // Vietnam: Mon-Sat (some companies Mon-Fri)
      case 'ja':
        return [DateTime.monday, DateTime.tuesday, DateTime.wednesday,
                DateTime.thursday, DateTime.friday];
        // Japan: Mon-Fri
      default:
        return [DateTime.monday, DateTime.tuesday, DateTime.wednesday,
                DateTime.thursday, DateTime.friday];
    }
  }

  bool isWorkingDay(DateTime date) {
    return workingDays.contains(date.weekday);
  }

  /// Next working day (skipping weekends and holidays)
  DateTime nextWorkingDay(DateTime from) {
    var next = from.add(const Duration(days: 1));
    while (!isWorkingDay(next)) {
      next = next.add(const Duration(days: 1));
    }
    return next;
  }
}
```

---

## MUST DO

- Use `flutter generate: true` in pubspec.yaml for code generation
- Include `@description` and `@placeholders` in template ARB file
- Store dates in UTC, display in local timezone
- Persist locale preference across app restarts
- Test diacritical marks rendering (Vietnamese ă,ê,ơ,ư)

## MUST NOT DO

- Hardcode strings in widgets (always use AppLocalizations)
- Assume English plural rules for all languages (Vietnamese/Japanese have no plural)
- Use `DateTime.now()` without timezone awareness
- Forget `flutter_localizations` SDK dependency (Material/Cupertino widgets need it)
- Mix locale-specific logic in presentation layer (use Core service)

---

## References

- [flutter_localizations](https://docs.flutter.dev/ui/accessibility-and-internationalization/internationalization)
- [intl Package](https://pub.dev/packages/intl)
- [ICU MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/)
- [ARB File Format](https://github.com/google/app-resource-bundle)
