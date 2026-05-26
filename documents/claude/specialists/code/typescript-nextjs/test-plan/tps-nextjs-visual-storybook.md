# Test Plan Specialist — NextJS Visual Testing: Storybook
# テストプランスペシャリスト — NextJS Visual Testing: Storybook
# Chuyen Gia Test — NextJS Visual Testing: Storybook

**Version**: 1.0.0
**Technology**: Vitest/Jest + @testing-library/react + Playwright
**Purpose**: Visual testing - Storybook component catalog, Chromatic visual diff, interaction testing within stories

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | VIS |
| **Specialist Type** | code |
| **Purpose** | Visual testing - Storybook component catalog, Chromatic visual diff, interaction testing within stories |

---

## Patterns

### Pattern VIS.1: Component Story

export const Default: Story = { args: { label: "Click me", variant: "primary" } }. export const Loading: Story = { args: { loading: true } }. Every visual state = 1 story.

---

### Pattern VIS.2: Chromatic Visual Diff

npx chromatic --project-token=xxx. Auto-screenshot every story. Diff against baseline. Review: approve or reject visual changes in Chromatic UI.

---

### Pattern VIS.3: Interaction Test in Story

play: async ({ canvasElement }) => { const canvas = within(canvasElement). await userEvent.click(canvas.getByRole("button")). await expect(canvas.getByText("Clicked")).toBeVisible(). }. Test behavior inside Storybook.

---

### Pattern VIS.4: Design Token Verification

Verify: component uses design tokens (--color-primary, --spacing-md) not hardcoded values. Storybook + a11y addon checks contrast ratios.

---

## ❌ Negative Example

BAD: No visual regression - CSS change breaks 10 pages silently. GOOD: Chromatic catches every visual change across all component states.

---

## Quality Checklist

- [ ] **Q1**: Testing Library queries used (getByRole > getByTestId)?
- [ ] **Q2**: User interaction via userEvent (not fireEvent)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: axe-core accessibility check on every component?

---

*Test Plan Specialist — NextJS Visual Testing: Storybook | EPS v10.0*
