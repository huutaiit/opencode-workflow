# i18n JP/EN Specialist
# i18n JP/EN スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain (internationalization — Japanese primary, English secondary) |
| **Directory Pattern** | `i18next/i18n.ts`, `i18next/jp/translation.ts`, `i18next/en/translation.ts` |
| **Variant** | construction-3d |
| **Pattern Numbers** | 7.09–7.10 |
| **Source Paths** | `**/i18next/**` |
| **File Count** | 3+ files (config + JP translation + EN translation) |
| **Naming Convention** | `i18n.ts` (config), `translation.ts` per language directory |
| **Imports From** | None (foundational — other components import t() function) |
| **Cannot Import** | State (Redux), Rendering (viewer components), API (services) |
| **Imported By** | ALL (every component uses useTranslation hook for UI text) |
| **Dependencies** | `i18next:21.x`, `react-i18next:11.x`, `i18next-browser-languagedetector:6.x` |
| **When To Use** | Adding internationalized text with Japanese as default language, English as fallback, and browser-based language detection |
| **Source Skeleton** | `i18next/i18n.ts`, `i18next/jp/translation.ts`, `i18next/en/translation.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate i18next configuration with JP default language, EN fallback, browser detection, and dot-notation translation key structure |
| **Activation Trigger** | files: **/i18next/**; keywords: i18n, translation, useTranslation, japanese, internationalization |

---

## Pattern 7.09: i18next Configuration

```pseudo
CONFIGURATION: |
  import i18n from 'i18next'
  import { initReactI18next } from 'react-i18next'
  import LanguageDetector from 'i18next-browser-languagedetector'
  import jpTranslation from './jp/translation'
  import enTranslation from './en/translation'

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        jp: { translation: jpTranslation },
        en: { translation: enTranslation }
      },
      fallbackLng: 'jp',  # Japanese as default
      keySeparator: '.',
      interpolation: { escapeValue: false }
    })

  LANGUAGES: {
    jp: "Japanese (DEFAULT — primary market)",
    en: "English (secondary)"
  }

  DETECTION: "Browser language → localStorage → fallback to jp"
}
```

---

## Pattern 7.10: Translation Key Structure

```pseudo
TRANSLATION_STRUCTURE: |
  {
    loginForm: { userName, password, loginButton, ... },
    validation: { required, minLength, maxLength, ... },
    common: { save, delete, edit, insert, cancel, ok, ... },
    messages: { saveSuccess, deleteSuccess, error, ... },
    actions: { start, finish, cancel, revert, ... },
    states: { beforePumping, duringPumping, finishPumping, ... }
  }

USAGE: |
  import { useTranslation } from 'react-i18next'
  const { t } = useTranslation()
  <span>{t('common.save')}</span>

CRITICAL_RULES: [
  "All UI text MUST use t() function — no hardcoded strings",
  "Japanese is fallback — missing EN keys show JP",
  "Dot notation for nested keys: t('loginForm.userName')",
  "Most construction-specific text is hardcoded JP (not yet in i18n)"
]
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_HARDCODED_TEXT: "All visible text should use t() — even if only JP translation exists",
  NO_EN_DEFAULT: "Japanese is ALWAYS the fallback language — never English"
}
```
