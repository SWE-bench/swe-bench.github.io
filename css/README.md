# SWE-bench CSS Architecture

This CSS architecture follows a simplified component-based approach with a focus on maintainability and reusability.

## Structure

```
css/
|
|– core.css                 # Core styles (variables, fonts, typography, base)
|– layout.css               # Layout components (grid, containers, spacing)
|– components.css           # UI components (buttons, forms, tables, cards)
|– pages.css                # Page-specific styles
|– utilities.css            # Utility classes
|– vendors/                 # Third-party CSS
|   |– normalize.css        # Normalize.css (reset)
|
|– dmsans/                  # DM Sans font files
|
`– main.css                 # Primary CSS file that imports all modules
```

## Usage

All styles are imported through the main.css file. Individual CSS files are modular and focus on a specific category of styles.

## Design Tokens

Global design tokens are defined in the core.css file, including:

- Colors
- Typography
- Spacing
- Border radius
- Shadows
- Z-index
- Animations/transitions

## Naming Conventions

- Component-based naming convention is used for component classes
- Utility classes follow a consistent pattern:
  - `.d-` for display utilities
  - `.m-` and `.p-` for margin and padding
  - `.text-` for text utilities
  - `.bg-` for background colors
  - `.border-` for border utilities
  - `.position-` for positioning utilities

## Responsive Design

The layout is mobile-first with breakpoints:

- Small: up to 576px
- Medium: 577px to 768px
- Large: 769px to 992px
- X-Large: 993px and up

## Advantages of This Architecture

1. **Simplified structure**: Reduces the number of files while maintaining separation of concerns
2. **Easier maintenance**: Related styles are grouped together
3. **Reduced file size**: Less duplication and overhead
4. **Better organization**: Clear categorization of styles
5. **Faster development**: Utility classes enable rapid prototyping 