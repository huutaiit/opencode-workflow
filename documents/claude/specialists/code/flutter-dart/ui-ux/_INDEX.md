# UI-UX Specialist Stack — Flutter (Material Design 3)

- **Stack**: flutter-dart
- **Total**: 36 specialists
- **Range**: 200.x–258.x
- **Variant**: default (Material Design 3)
- **Loading**: core/ always, others keyword-triggered

---

## core/ — Design Foundations (ALWAYS loaded)

| # | Pattern | Specialist | File | Type |
|---|---------|-----------|------|------|
| 1 | 200.x | color-system | 200-color-system.md | rule-set |
| 2 | 201.x | spacing-scale | 201-spacing-scale.md | rule-set |
| 3 | 202.x | typography-scale | 202-typography-scale.md | rule-set |
| 4 | 203.x | elevation-shadow | 203-elevation-shadow.md | rule-set |
| 5 | 204.x | border-radius | 204-border-radius.md | rule-set |
| 6 | 205.x | icon-system | 205-icon-system.md | rule-set |
| 7 | 206.x | component-states | 206-component-states.md | rule-set |
| 8 | 207.x | z-index-layering | 207-z-index-layering.md | rule-set |

## effects/ — Visual Effects (keyword-triggered)

| # | Pattern | Specialist | File | Type |
|---|---------|-----------|------|------|
| 9 | 210.x | glass-effects | 210-glass-effects.md | rule-set |
| 10 | 211.x | gradient-effects | 211-gradient-effects.md | rule-set |
| 11 | 212.x | animation-transition | 212-animation-transition.md | rule-set |
| 12 | 213.x | scrollbar-styling | 213-scrollbar-styling.md | rule-set |

## patterns/ — UI Patterns (keyword-triggered)

| # | Pattern | Specialist | File | Type |
|---|---------|-----------|------|------|
| 13 | 220.x | status-color | 220-status-color.md | rule-set |
| 14 | 221.x | hover-interaction | 221-hover-interaction.md | rule-set |
| 15 | 222.x | responsive-layout | 222-responsive-layout.md | rule-set |
| 16 | 223.x | dark-mode | 223-dark-mode.md | rule-set |
| 17 | 224.x | focus-accessibility | 224-focus-accessibility.md | rule-set |
| 18 | 225.x | empty-error-loading | 225-empty-error-loading.md | rule-set |
| 19 | 226.x | visual-hierarchy | 226-visual-hierarchy.md | rule-set |
| 20 | 227.x | image-media | 227-image-media.md | rule-set |
| 21 | 228.x | navigation-ux | 228-navigation-ux.md | rule-set |

## data-visualization/ — BI Contracts (keyword-triggered)

| # | Pattern | Specialist | File | Type |
|---|---------|-----------|------|------|
| 22 | 230.x | chart-types-contract | 230-chart-types-contract.md | contract |
| 23 | 231.x | bi-output-contract | 231-bi-output-contract.md | contract |
| 24 | 232.x | chart-theming | 232-chart-theming.md | rule-set |

## compliance/ — Gov/Banking (keyword-triggered)

| # | Pattern | Specialist | File | Type |
|---|---------|-----------|------|------|
| 25 | 240.x | government-form-layout | 240-government-form-layout.md | rule-set |
| 26 | 241.x | jis-x-8341-accessibility | 241-jis-x-8341-accessibility.md | rule-set |
| 27 | 242.x | banking-behavioral-compliance | 242-banking-behavioral-compliance.md | rule-set |

## localization/ — JP + VN (keyword-triggered)

| # | Pattern | Specialist | File | Type |
|---|---------|-----------|------|------|
| 28 | 250.x | locale-input-handling | 250-locale-input-handling.md | rule-set |
| 29 | 251.x | locale-name-address | 251-locale-name-address.md | code |
| 30 | 252.x | locale-date-calendar | 252-locale-date-calendar.md | code |
| 31 | 253.x | locale-number-currency | 253-locale-number-currency.md | rule-set |
| 32 | 254.x | locale-financial-compliance | 254-locale-financial-compliance.md | code |
| 33 | 255.x | locale-pii-regulatory | 255-locale-pii-regulatory.md | code |
| 34 | 256.x | locale-layout-typography | 256-locale-layout-typography.md | rule-set |
| 35 | 257.x | locale-encoding-export | 257-locale-encoding-export.md | rule-set |
| 36 | 258.x | locale-enterprise-ux | 258-locale-enterprise-ux.md | code |

---

## Activation Triggers

| Folder | Keywords |
|--------|---------|
| core/ | (always loaded — no keywords needed) |
| effects/ | glass, gradient, animation, scrollbar, effect, visual, backdrop |
| patterns/ | responsive, dark mode, accessibility, navigation, empty, hover, status, loading, skeleton |
| data-visualization/ | chart, dashboard, BI, report, visualization, graph, 帳票 |
| compliance/ | banking, 帳票, government, FISC, JIS, compliance, regulatory, 行政 |
| localization/ | JP, VN, locale, IME, furigana, 全角, localization, currency, yen, dong |

## Relationship Map

| ui-ux Specialist | Related Stack Specialist | Authority |
|-----------------|------------------------|-----------|
| 200 color-system | material3-design-system | stack specialist wins on conflict |
| 202 typography-scale | material3-design-system | stack specialist wins on conflict |
| 224 focus-accessibility | accessibility-specialist | stack specialist wins on conflict |
| 228 navigation-ux | navigation-specialist | stack specialist wins on conflict |
