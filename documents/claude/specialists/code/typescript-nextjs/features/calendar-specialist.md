# Calendar Component Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 68.1–68.5 |
| **Source Paths** | `src/presentation/ui/modules/cmn007000/` (Schedule module) |
| **File Count** | Calendar page + support components |
| **Naming Convention** | Standard module convention |
| **Imports From** | `react-big-calendar`, `dayjs`, `dayjs/plugin/localeData` |
| **Imported By** | App: calendar route (static page, not in mapApplication) |
| **Cannot Import** | `infrastructure/*` direct (use DI containers) |
| **Dependencies** | react-big-calendar@1.19, dayjs@1, dayjs-plugin-lunar@1 |
| **When To Use** | Calendar scheduling UI with Japanese lunar support |
| **Source Skeleton** | `modules/{code}/{screen}_calendar.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate calendar integration with react-big-calendar including event rendering, drag-and-drop, and custom views |
| **Activation Trigger** | files: `**/calendar/**/*.tsx`; keywords: reactBigCalendar, calendarEvent |

---

## Description

The application uses react-big-calendar (v1.19.4) with dayjs localizer, Japanese locale, and lunar calendar plugin for the Schedule management module. Month view is hardcoded with custom day-of-week color coding and rotating event colors.

---

## Key Concepts

### 68.1 — Calendar Component Configuration

- **File**: `src/presentation/ui/components/core/block/Calendar.tsx` (264 lines)
- **Localizer**: `dayjsLocalizer(dayjs)` with Japanese locale (`import 'dayjs/locale/ja'`)
- **View**: `Views.MONTH` — hardcoded, toolbar hidden
- **Plugins**: `dayjs-plugin-lunar` for lunar date display

### 68.2 — Custom Month Header (Day-of-Week Colors)

```typescript
const myMonthHeader = ({ label }) => {
  const isSunday = label === '日';
  const isSaturday = label === '土';
  const colorClass = isSunday ? 'text-red-500' : isSaturday ? 'text-cyan-500' : 'text-gray-600 dark:text-gray-400';
  return <span className={colorClass}>{label}</span>;
};
```

### 68.3 — Lunar Date Header

```typescript
const myMonthDateHeader = ({ date, label }) => {
  const lunar = dayjs(date).lunar();
  return (
    <div>
      <span>{label}</span>
      <span className="lunar">{lunar.format('M/D')}</span>
    </div>
  );
};
```

### 68.4 — Event Styling with Color Rotation

```typescript
const eventPropGetter = (event, start, end, isSelected) => {
  const colorIndex = sameDay(start, end) ? event.colorIndex % COLORS.length : 0;
  return { style: { backgroundColor: COLORS[colorIndex] } };
};
```

Multiple events on the same day get different colors via rotating palette.

### 68.5 — Integration Location

- Used in: `cmn007000` (Schedule management module)
- Calendar events sourced from Redux schedule state
- All-day event detection via `event.allDay` flag

---

## Anti-Patterns

- Using FullCalendar or other calendar libraries (project uses react-big-calendar)
- Importing moment.js localizer (project uses dayjs)
- Adding toolbar navigation (hardcoded to month view, toolbar hidden)
- Using English day labels (Japanese locale: 日月火水木金土)
- Forgetting lunar calendar plugin import

---

## Related Specialists

- `redux-toolkit-specialist.md` (53.x) — Schedule slice integration
- `i18n-specialist.md` (58.x) — Japanese locale configuration
- `theme-specialist.md` (59.x) — Calendar dark mode styling
