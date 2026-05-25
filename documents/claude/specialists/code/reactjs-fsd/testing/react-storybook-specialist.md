# React Storybook Specialist
# React Storybookスペシャリスト
# Chuyen Gia Storybook React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared, Features |
| **Directory Pattern** | `src/**/*.stories.tsx` |
| **Variant** | enterprise |
| **Pattern Numbers** | 64.1–64.8 |
| **Source Paths** | `**/*.stories.tsx`, `.storybook/` |
| **File Count** | 20–60 story files |
| **Naming Convention** | `{Component}.stories.tsx` |
| **Imports From** | The component being storied, shared test utils |
| **Cannot Import** | N/A (cross-cutting rule-set — not a code module) |
| **Imported By** | N/A (cross-cutting rule-set — not a code module) |
| **Dependencies** | `storybook:8.x`, `@storybook/react-vite:8.x`, `@storybook/addon-essentials:8.x` |
| **When To Use** | Component documentation, visual development, interaction tests, Chromatic |
| **Source Skeleton** | `src/shared/ui/{Component}/{Component}.stories.tsx`, `.storybook/main.ts`, `.storybook/preview.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate Storybook patterns — CSF3 stories, args, decorators, AntD theme, interaction tests, Chromatic |
| **Activation Trigger** | files: **/*.stories.tsx, .storybook/**; keywords: storybook, csf, story, chromatic, interactionTest |

---

## Patterns

### Pattern 64.1: CSF3 Story Format (CRITICAL)

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta = { component: Button, title: 'Shared/Button', tags: ['autodocs'],
  argTypes: { variant: { control: 'select', options: ['primary', 'secondary'] } },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { children: 'Click me', type: 'primary' } };
export const Loading: Story = { args: { children: 'Loading', loading: true } };
export const Disabled: Story = { args: { children: 'Disabled', disabled: true } };
```

### Pattern 64.2: AntD Theme Decorator (CRITICAL)

```typescript
// .storybook/preview.tsx
import { ConfigProvider, App as AntdApp } from 'antd';
import { themeConfig } from '../src/shared/config/theme.config';

const preview: Preview = {
  decorators: [(Story) => (
    <ConfigProvider theme={themeConfig}><AntdApp><Story /></AntdApp></ConfigProvider>
  )],
  parameters: { layout: 'centered' },
};
export default preview;
```

### Pattern 64.3: Interaction Tests (HIGH)

```typescript
import { within, userEvent, expect } from '@storybook/test';

export const FilledForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Email'), 'test@example.com');
    await userEvent.click(canvas.getByRole('button', { name: /submit/i }));
    await expect(canvas.getByText(/success/i)).toBeInTheDocument();
  },
};
```

### Pattern 64.4: Provider Decorators (HIGH)

```typescript
// Story with router + query client
export const WithRouter: Story = {
  decorators: [(Story) => (
    <MemoryRouter><QueryClientProvider client={new QueryClient()}><Story /></QueryClientProvider></MemoryRouter>
  )],
};
```

### Pattern 64.5-64.8: Chromatic visual testing, docs mode, story organization per FSD, anti-patterns.

---

*React Storybook Specialist | EPS v3.2 | Metadata v2.1*
