# Test Plan Specialist — NextJS Unit Testing: Components
# テストプランスペシャリスト — NextJS Unit Testing: Components
# Chuyen Gia Test — NextJS Unit Testing: Components

**Version**: 1.0.0
**Technology**: Vitest/Jest + @testing-library/react + Playwright
**Purpose**: Component testing - render, user interaction, conditional rendering, Server/Client components isolation, Ant Design/UI library mocking

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | UT-C |
| **Specialist Type** | code |
| **Purpose** | Component testing - render, user interaction, conditional rendering, Server/Client components isolation, Ant Design/UI library mocking |

---

## Patterns

### Pattern UT-C.1: Component Render Testing

render(<Component />) with @testing-library/react. screen.getByRole(), getByText(), getByLabelText(). Verify: DOM output matches expected content. Client components only (Server components tested via integration).

---

### Pattern UT-C.2: User Interaction

userEvent.click(), userEvent.type(), userEvent.selectOptions(). Verify: state changes reflected in DOM, callbacks fired, form submission works.

---

### Pattern UT-C.3: Conditional Rendering

Test loading/error/empty/data states. render(<Component isLoading={true} />) -> screen.getByRole("progressbar"). render(<Component data={[]} />) -> screen.getByText("No results").

---

### Pattern UT-C.4: Props & Callbacks

const onSubmit = vi.fn(). render(<Form onSubmit={onSubmit} />). await userEvent.click(screen.getByRole("button")). expect(onSubmit).toHaveBeenCalledWith(expectedData).

---

### Pattern UT-C.5: Accessibility (axe-core)

const { container } = render(<Component />). const results = await axe(container). expect(results).toHaveNoViolations(). Test keyboard navigation: userEvent.tab(), userEvent.keyboard("{Enter}").

---

## ❌ Negative Example

BAD: enzyme.shallow(<Component />) - tests virtual DOM, not real behavior. BAD: expect(wrapper.state("count")).toBe(1) - tests implementation. GOOD: screen.getByText("1 item") - tests what user sees.

---

## Quality Checklist

- [ ] **Q1**: Testing Library queries used (getByRole > getByTestId)?
- [ ] **Q2**: User interaction via userEvent (not fireEvent)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: axe-core accessibility check on every component?

---

*Test Plan Specialist — NextJS Unit Testing: Components | EPS v10.0*
