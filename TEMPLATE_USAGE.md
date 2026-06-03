# HTML Template Usage Guide

This project uses a shared HTML template to maintain consistency across all app pages. The template (`template.html`) contains the common structure, styles, and utilities used across all Naturéa applications.

## What's in the Template

### Structure
- Shared header with Naturéa logo and branding
- Main content area
- Modal container for dialogs
- Toast notification container

### Built-in Styles
- **Design tokens** (colors, fonts, spacing) defined in `:root` CSS variables
- **Components** (buttons, cards, utilities)
- **Responsive design** (mobile-first approach)

### Built-in Utilities (JavaScript)
- `escapeHtml()` - Prevent XSS attacks
- `toast(msg, type)` - Show toast notifications
- `openModal(title, content, opts)` - Open a modal dialog
- `closeModal()` - Close current modal

## How to Create a New Page

### 1. Template Variables
The template uses these placeholders (replace when creating a new page):

| Variable | Description | Example |
|----------|-------------|---------|
| `{{PAGE_TITLE}}` | Page title (appears in browser tab) | `Audit Chantier` |
| `{{LOGO_TAG}}` | Text under the logo | `Pilotage exécutif` |
| `{{EXTRA_STYLES}}` | Page-specific CSS | `<style>/* custom styles */</style>` |
| `{{EXTRA_SCRIPTS}}` | Page-specific JavaScript | `<script>/* app code */</script>` |

### 2. Basic Template

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My App — Maisons Naturéa</title>
  <!-- Include all shared styles from template.html -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <!-- ... rest of head ... -->
  <style>
    /* Your page-specific styles here */
  </style>
</head>
<body>
  <!-- Header, main, and containers are copied from template -->
  <main id="main">
    <!-- Your content here -->
  </main>
  
  <script>
    // Your page-specific JavaScript here
  </script>
</body>
</html>
```

## Design System

### Colors (CSS Variables)

```css
--bg: #f7f4ec;              /* Page background */
--surface: #ffffff;         /* Card/surface background */
--surface-alt: #f0ebdf;     /* Hover/secondary surfaces */
--ink: #1f2e25;            /* Primary text */
--muted: #4f5f56;          /* Secondary text */
--subtle: #8a948c;         /* Tertiary text */

--accent: #355222;         /* Primary action (Naturéa green) */
--accent-soft: #e2e8da;    /* Accent highlight */
--accent-ink: #243919;     /* Accent dark hover */

--green: #2f8557;          /* Success/validated */
--amber: #c98f37;          /* Warning/attention */
--red: #b8453d;            /* Error/critical */
--wood: #d69362;           /* Accent (Naturéa terra) */
```

### Typography

```css
--serif: 'Archivo Black', 'Archivo', sans-serif;    /* Display/headers */
--sans: 'Archivo', system-ui, -apple-system, sans-serif;  /* Body text */
```

### Common Components

#### Buttons
```html
<button class="btn btn-primary">Primary Action</button>
<button class="btn btn-secondary">Secondary Action</button>
<button class="btn btn-ghost">Ghost Button</button>
<button class="btn btn-danger">Danger Action</button>
```

#### Cards
```html
<div class="card">
  <div class="card-title">Card Title</div>
  <p>Card content here</p>
</div>
```

#### Page Title
```html
<div class="page-title">
  <div>
    <div class="kicker">Label</div>
    <h1>Page Title</h1>
    <div class="subtitle">Subtitle</div>
  </div>
  <div class="page-title-actions">
    <button class="btn btn-primary">Action</button>
  </div>
</div>
```

#### Text Utilities
```html
<span class="text-muted">Muted text</span>
<span class="text-subtle">Subtle text</span>
<span class="text-red">Red text</span>
```

## Shared JavaScript Utilities

### Toast Notifications
```javascript
toast('Operation successful');           // Info toast
toast('Error occurred', 'error');        // Error toast
```

### Modal Dialogs
```javascript
// Simple modal
openModal('Confirm Action', `<p>Are you sure?</p>`);

// Modal with callback
openModal('Confirm', 'Delete this item?', {
  onMount: () => {
    document.getElementById('modal-body').innerHTML += 
      `<button onclick="deleteItem()">Delete</button>`;
  }
});

// Close modal
closeModal();
```

## Best Practices

### 1. Avoid Duplication
- Use template variables for common structure
- Keep app-specific code in the `{{EXTRA_SCRIPTS}}` section
- Share custom styles via CSS variables when possible

### 2. Responsive Design
- Test on mobile (max-width: 640px)
- Use flexbox/grid for layouts
- Don't hardcode pixel widths

### 3. Accessibility
- Use semantic HTML (button, nav, main, etc.)
- Include `title` attributes on interactive elements
- Use `escapeHtml()` when displaying user data

### 4. Performance
- Minimize CSS in `<style>` tags
- Defer heavy JavaScript to the bottom
- Use CSS variables instead of repeating color values

## Customization

### Adding Global Styles
If you need styles used across multiple pages, add them to the template's `<style>` section. For page-specific styles, use the `{{EXTRA_STYLES}}` placeholder.

### Adding Shared Utilities
To add a new shared utility function, place it in the `<script>` section near `escapeHtml()`, before `{{EXTRA_SCRIPTS}}`.

### Theming
All colors use CSS variables. To create a dark theme variant, override the `:root` variables in `{{EXTRA_STYLES}}`:

```css
:root {
  --bg: #1f2e25;
  --surface: #2d3d34;
  --ink: #f7f4ec;
  /* ... other overrides ... */
}
```

## File Structure

```
/naturea
├── template.html              # Base template (shared structure)
├── TEMPLATE_USAGE.md          # This file
├── codir-app.html             # App using template
├── audit-app.html             # App using template
├── ossature-app.html          # App using template
└── ... (other apps)
```

## Checklist for New Pages

- [ ] Replace `{{PAGE_TITLE}}` with your page title
- [ ] Replace `{{LOGO_TAG}}` with your page subtitle
- [ ] Add page-specific styles in `{{EXTRA_STYLES}}`
- [ ] Add page-specific JavaScript in `{{EXTRA_SCRIPTS}}`
- [ ] Test responsive design (mobile view)
- [ ] Test accessibility (keyboard navigation, screen readers)
- [ ] Use `escapeHtml()` for any user-generated content
- [ ] Use CSS variables for colors instead of hardcoding hex values

## Support

For questions about the template structure or design system, refer to the inline comments in `template.html` or check existing app implementations like `codir-app.html`.
