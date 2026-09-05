# Anime.js Design System Guidance

Structured, tokenized, content-first UI rules for the Anime.js documentation site (https://animejs.com/), targeting developers and technical teams.

## 1. Context and goals

Deliver a dark, high-contrast, implementation-first documentation surface where every visual decision resolves to a semantic token and every interactive element has explicit, testable state and accessibility rules.

## 2. Design tokens and foundations

Typography
- `font.family.primary=DIN`; `font.family.stack=DIN, Helvetica Neue, Helvetica, Arial, sans-serif`
- `font.size.base=16px`, `font.weight.base=400`, `font.lineHeight.base=normal`
- Scale: `xs=9.6px`, `sm=11.9px`, `md=12px`, `lg=14px`, `xl=16px`, `2xl=20px`, `3xl=40px`, `4xl=52px`

Color
- Text: `color.text.primary=#b4b1af`, `color.text.secondary=#f6f4f2`, `color.text.tertiary=#353432`, `color.text.inverse=#d5d3d1`
- Surface: `color.surface.base=#000000`, `color.surface.muted=#2a2928`, `color.surface.raised=#302e2d`, `color.surface.strong=#252423`

Spacing: `1=3.5px`, `2=4px`, `3=8px`, `4=10px`, `5=12px`, `6=16px`, `7=18.98px`, `8=19.5px`

Radius: `xs=2px`, `sm=4px`, `md=12px`. Motion: `instant=100ms`, `fast=125ms`.

Rules
- Components must consume semantic tokens; raw hex values must not appear in component code.
- `color.text.tertiary` must be used for hairlines and disabled affordances only, never for body text on `surface.base`.
- New spacing or type values must not be introduced; extend the scale centrally instead.

## 3. Component-level rules

Shared state contract — every component must define: default, hover, focus-visible, active, disabled, loading, error.

### Links (density: 126)
- Anatomy: label, optional trailing icon, underline affordance.
- Default `text.primary`; hover `text.secondary` with underline; focus-visible 2px `text.secondary` outline at 2px offset, `radius.sm`; active shifts opacity only; disabled `text.tertiary` with `aria-disabled="true"`; loading links must render as buttons instead; error links must state the failure in text, not color alone.
- Keyboard: reachable via Tab, activated by Enter. Pointer: cursor pointer, transition `motion.duration.instant`. Touch: hit area must be at least 44x44px including padding.
- Long content wraps; URLs must use `overflow-wrap: anywhere`.

### Buttons (density: 25)
- Variants: primary (`surface`-inverse fill, `text.inverse` label), secondary (`surface.raised` fill), ghost (transparent).
- Padding `space.4` vertical / `space.6` horizontal, radius `md`, label `font.size.lg`.
- Hover raises surface one step; focus-visible outline must remain visible over every variant; active uses `motion.duration.fast`; disabled drops to `text.tertiary` and sets `disabled`; loading shows a spinner, keeps width, sets `aria-busy="true"`, and must keep an accessible name; error state must be announced through adjacent live-region text.
- Icon-only buttons must supply `aria-label`.

### Lists (density: 17)
- Semantic `<ul>`/`<ol>` only, item gap `space.3`, marker `text.tertiary`.
- Empty state must render an explicit message plus a next action, never a blank block.
- Overflowing items wrap; they must not truncate without a title or expand control.

### Inputs (density: 3)
- Anatomy: label (always visible), control, hint, error text.
- Control: `surface.strong` fill, 1px `text.tertiary` border, radius `sm`, padding `space.4`, min height 44px.
- Hover lightens the border; focus-visible shows a 2px outline; disabled reduces to `text.tertiary`; loading disables and shows progress; error uses a border change plus icon plus text with `aria-invalid="true"` and `aria-describedby`.
- Long values must scroll within the field; placeholder must not replace the label.

### Cards (density: 3)
- `surface.raised` background, 1px `text.tertiary` border, radius `md`, padding `space.6`, title `font.size.2xl`, body `font.size.lg`.
- Whole-card links must expose a single focusable anchor; nested interactive elements must stay reachable.
- Long bodies clamp with an explicit "Read more" control; empty cards must show placeholder guidance.

### Navigation (density: 2)
- Sticky top bar plus in-page section nav; current item must set `aria-current="page"`.
- Below 768px it collapses to a disclosure button with `aria-expanded`, Escape closes, focus returns to the trigger.

Responsive: single column under 480px, two columns on tablet, three on desktop; spacing tokens must not be overridden per breakpoint beyond the defined scale.

## 4. Accessibility acceptance criteria (WCAG 2.2 AA)

- Pass/fail: body text on `surface.base` measures at least 4.5:1 (`text.primary` on black = ~7.3:1).
- Pass/fail: every interactive element shows a visible focus indicator of at least 2px with 2px offset; `outline: none` without a replacement is a fail.
- Pass/fail: all functionality is operable by keyboard alone with no traps; disclosure menus close with Escape.
- Pass/fail: every control has a programmatic name (label, `aria-label`, or `aria-labelledby`).
- Pass/fail: state changes (loading, error) are announced through `aria-live`, `aria-busy`, or `aria-invalid`.
- Pass/fail: touch targets are at least 44x44px.
- Pass/fail: `prefers-reduced-motion: reduce` suppresses non-essential animation.

## 5. Content and tone standards

Concise, confident, implementation-focused.
- Do: "Install anime.js", "Copy example", "Retry scan".
- Don't: "Click here", "Learn more", "Submit".
- Error text must state cause and remedy: "Scan failed — check the repository URL and try again."

## 6. Anti-patterns and prohibited implementations

- Hidden or removed focus rings.
- Color-only signalling of error or success.
- One-off hex values, ad-hoc spacing, or type sizes outside the scale.
- Placeholder-as-label inputs.
- Truncation with no way to view full content.
- Animations exceeding `motion.duration.fast` for state feedback.

## 7. QA checklist

- [ ] All colors and spacing resolve to tokens.
- [ ] Every component documents all seven states.
- [ ] Keyboard pass across each page, including Escape and focus return.
- [ ] Contrast audit passes AA for text and non-text indicators.
- [ ] Touch targets at least 44x44px.
- [ ] Empty, long-content, and error states verified.
- [ ] Reduced-motion path verified.
- [ ] No ambiguous link or button labels remain.
