# Chart Types Contract Specialist
# チャートタイプ契約スペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 230.1–230.10 |
| **Specialist Type** | contract |
| **Purpose** | Chart type catalog, data shape, JP banking requirements |
| **Activation Trigger** | Chart/graph rendering, data visualization |
| **Complements** | 232.x chart-theming, 231.x bi-output |

---

## Rules

### 230.1–230.9 — Chart Types

Same data shapes and rules as web specialists. Flutter implementation:

```dart
// ✅ fl_chart package for charts
LineChart(
  LineChartData(
    lineBarsData: [LineChartBarData(spots: dataPoints, isCurved: true)],
  ),
)

BarChart(BarChartData(barGroups: [...]))
PieChart(PieChartData(sections: [...]))
```

- ✅ Use `fl_chart` or `syncfusion_flutter_charts`
- ✅ Horizontal bars for JP labels (部門名 can be 10+ chars)
- ❌ NEVER vertical bars with rotated JP text

### 230.10 — JP Banking Format Rules

- ✅ 万/億 number formatting
- ✅ Color-blind accessible: pair color with pattern/icon
- ❌ NEVER use red/green as sole differentiator
- ❌ NEVER display raw numbers > 10,000 without 万/億 in JP financial
