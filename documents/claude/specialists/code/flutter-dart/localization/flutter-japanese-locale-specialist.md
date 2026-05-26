# Flutter Japanese Locale Deep Specialist
# Flutter 日本語ロケール詳細スペシャリスト
# Chuyen Gia Dia Phuong Hoa Nhat Ban Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core, Presentation |
| **Directory Pattern** | `lib/core/localization/japanese/`, `lib/features/{feature}/presentation/widgets/` |
| **Variant** | ALL |
| **Naming Convention** | `japanese_calendar.dart`, `japanese_formatter.dart`, `furigana_field.dart`. Classes: `JapaneseCalendar`, `JapaneseFormatter`, `FuriganaField` |
| **Imports From** | Core (base localization, theme), Presentation (form widgets for Japanese input) |
| **Cannot Import** | Domain, Data |
| **Pattern Numbers** | 87.10–87.20 |
| **Source Paths** | `lib/core/localization/japanese/*.dart`, `lib/features/*/presentation/widgets/*furigana*.dart` |
| **File Count** | 3-5 Japanese-specific locale files |
| **Imported By** | Presentation (Japanese-specific form fields, calendar displays) |
| **Dependencies** | intl ^0.19.0 |
| **When To Use** | Japanese client projects — Imperial calendar (Reiwa), furigana input fields, postal code lookup, name order (family→given), honorific levels |
| **Source Skeleton** | `lib/core/localization/japanese/japanese_calendar.dart`, `lib/core/localization/japanese/japanese_formatter.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate Japanese-specific locale handling with Imperial Era calendar, furigana input, postal code→address lookup, name order conventions, and keigo (honorific) levels |
| **Activation Trigger** | files: lib/core/localization/japanese/*.dart; keywords: japanese, reiwa, furigana, postalCode, keigo, imperialEra, japaneseCalendar |

---

## Patterns

### Pattern 87.10: Imperial Era Calendar (和暦)

```dart
/// Japanese Imperial Era calendar conversion
class JapaneseCalendar {
  static const _eras = [
    _Era('令和', 'Reiwa', DateTime(2019, 5, 1)),   // 2019-present
    _Era('平成', 'Heisei', DateTime(1989, 1, 8)),   // 1989-2019
    _Era('昭和', 'Showa', DateTime(1926, 12, 25)),  // 1926-1989
    _Era('大正', 'Taisho', DateTime(1912, 7, 30)),  // 1912-1926
    _Era('明治', 'Meiji', DateTime(1868, 1, 25)),   // 1868-1912
  ];

  /// Convert Gregorian to Japanese Imperial Era
  /// 2026-04-05 → 令和8年4月5日
  static String format(DateTime date) {
    for (final era in _eras) {
      if (date.isAfter(era.start) || date.isAtSameMomentAs(era.start)) {
        final year = date.year - era.start.year + 1;
        return '${era.kanji}${year == 1 ? "元" : "$year"}年${date.month}月${date.day}日';
      }
    }
    return DateFormat('yyyy年M月d日', 'ja').format(date);
  }

  /// Parse Japanese date string back to DateTime
  static DateTime? parse(String japaneseDate) {
    final match = RegExp(r'(令和|平成|昭和|大正|明治)(元|\d+)年(\d+)月(\d+)日').firstMatch(japaneseDate);
    if (match == null) return null;

    final eraName = match.group(1)!;
    final yearStr = match.group(2)!;
    final month = int.parse(match.group(3)!);
    final day = int.parse(match.group(4)!);

    final era = _eras.firstWhere((e) => e.kanji == eraName);
    final year = (yearStr == '元' ? 1 : int.parse(yearStr)) + era.start.year - 1;

    return DateTime(year, month, day);
  }
}

class _Era {
  final String kanji;
  final String romaji;
  final DateTime start;
  const _Era(this.kanji, this.romaji, this.start);
}
```

### Pattern 87.11: Furigana Input Field

```dart
/// Text field with furigana (reading) companion field
/// Japanese names require both Kanji (漢字) and furigana (ふりがな/フリガナ)
class FuriganaField extends StatelessWidget {
  final TextEditingController kanjiController;
  final TextEditingController furiganaController;
  final String label;
  final FuriganaType type; // hiragana or katakana

  const FuriganaField({
    super.key,
    required this.kanjiController,
    required this.furiganaController,
    required this.label,
    this.type = FuriganaType.katakana, // Katakana is standard for official forms
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextFormField(
          controller: kanjiController,
          decoration: InputDecoration(labelText: label),
          validator: (v) => v?.isEmpty == true ? '$labelを入力してください' : null,
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: furiganaController,
          decoration: InputDecoration(
            labelText: type == FuriganaType.katakana ? '$label（カタカナ）' : '$label（ひらがな）',
          ),
          validator: (v) {
            if (v?.isEmpty == true) return 'フリガナを入力してください';
            if (type == FuriganaType.katakana && !_isKatakana(v!)) return 'カタカナで入力してください';
            if (type == FuriganaType.hiragana && !_isHiragana(v!)) return 'ひらがなで入力してください';
            return null;
          },
        ),
      ],
    );
  }

  bool _isKatakana(String s) => RegExp(r'^[\u30A0-\u30FF\u3000-\u303F\s]+$').hasMatch(s);
  bool _isHiragana(String s) => RegExp(r'^[\u3040-\u309F\u3000-\u303F\s]+$').hasMatch(s);
}

enum FuriganaType { hiragana, katakana }
```

### Pattern 87.12: Japanese Name Order

```dart
/// Japanese name convention: Family name (姓) → Given name (名)
/// Opposite of Western: Given → Family
class JapaneseName {
  final String familyName;      // 姓 (sei) — e.g., 田中
  final String givenName;       // 名 (mei) — e.g., 太郎
  final String? familyFurigana; // セイ — e.g., タナカ
  final String? givenFurigana;  // メイ — e.g., タロウ

  JapaneseName({
    required this.familyName,
    required this.givenName,
    this.familyFurigana,
    this.givenFurigana,
  });

  /// Full name in Japanese order (family → given)
  String get fullName => '$familyName $givenName';

  /// Full furigana
  String? get fullFurigana =>
      familyFurigana != null && givenFurigana != null
          ? '$familyFurigana $givenFurigana'
          : null;
}
```

### Pattern 87.13: Postal Code → Address Lookup

```dart
/// Japanese postal code (〒) auto-fill address
/// Format: XXX-XXXX (3 digits, hyphen, 4 digits)
class PostalCodeService {
  final Dio _dio;

  PostalCodeService(this._dio);

  /// Lookup address by postal code using zipcloud API
  Future<JapaneseAddress?> lookup(String postalCode) async {
    final clean = postalCode.replaceAll('-', '').replaceAll('〒', '');
    if (clean.length != 7) return null;

    try {
      final response = await _dio.get(
        'https://zipcloud.ibsnet.co.jp/api/search',
        queryParameters: {'zipcode': clean},
      );

      final results = response.data['results'] as List?;
      if (results == null || results.isEmpty) return null;

      final r = results.first;
      return JapaneseAddress(
        prefecture: r['address1'],    // 都道府県
        city: r['address2'],          // 市区町村
        town: r['address3'],          // 町域
        postalCode: '${clean.substring(0, 3)}-${clean.substring(3)}',
      );
    } catch (_) {
      return null;
    }
  }
}

class JapaneseAddress {
  final String prefecture; // 東京都, 大阪府, etc.
  final String city;       // 渋谷区, etc.
  final String town;       // 神宮前, etc.
  final String postalCode;

  JapaneseAddress({
    required this.prefecture,
    required this.city,
    required this.town,
    required this.postalCode,
  });

  String get fullAddress => '$prefecture$city$town';
}
```

### Pattern 87.14: Number/Currency Formatting (Japan)

```dart
class JapaneseFormatter {
  /// Japanese Yen — no decimal places, ¥ prefix
  static String formatYen(int amount) {
    return '¥${NumberFormat('#,###', 'ja').format(amount)}';
  }
  // ¥1,234,567

  /// 万/億 notation for large numbers
  static String formatLargeNumber(int amount) {
    if (amount >= 100000000) {
      return '${(amount / 100000000).toStringAsFixed(1)}億';
    }
    if (amount >= 10000) {
      return '${(amount / 10000).toStringAsFixed(1)}万';
    }
    return NumberFormat('#,###', 'ja').format(amount);
  }
  // 12,345 → "1.2万"
  // 123,456,789 → "1.2億"
}
```

### Pattern 87.15: Keigo (Honorific Levels)

```dart
/// Keigo levels for UI text in formal Japanese applications
enum KeigoLevel {
  casual,      // タメ口 — internal tools
  polite,      // です・ます — standard customer-facing
  respectful,  // 尊敬語 — addressing superiors/customers
  humble,      // 謙譲語 — referring to own company/actions
}

/// Example message variations by keigo level
class KeigoMessages {
  static String confirmDelete(KeigoLevel level) {
    switch (level) {
      case KeigoLevel.casual: return '削除する？';
      case KeigoLevel.polite: return '削除しますか？';
      case KeigoLevel.respectful: return '削除なさいますか？';
      case KeigoLevel.humble: return '削除させていただいてもよろしいでしょうか？';
    }
  }
}
```

---

## MUST DO

- Support Imperial Era (和暦) display alongside Gregorian dates
- Require furigana fields for all name inputs (official form standard)
- Use family→given name order (opposite of Western)
- Auto-fill address from postal code (standard UX in Japan)
- Use katakana for furigana on official forms

## MUST NOT DO

- Assume Western name order (given→family) for Japanese users
- Display dates without Imperial Era option
- Skip furigana validation (katakana/hiragana enforcement)
- Use decimal places for Yen amounts
- Mix keigo levels in the same screen (consistency required)

---

## References

- [Japanese Imperial Calendar](https://en.wikipedia.org/wiki/Japanese_era_name)
- [Zipcloud Postal Code API](https://zipcloud.ibsnet.co.jp/)
- [intl Package](https://pub.dev/packages/intl)
