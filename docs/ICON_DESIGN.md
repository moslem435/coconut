# Portfolio OS Icon Design System

## Overview

The Portfolio OS icon system is designed to be **programmatic, scalable, and theme-aware**. Instead of using static image assets (PNG/JPG), we utilize **Lucide React** SVG components wrapped in a custom `AppIcon` renderer. This allows for dynamic styling, theming, and interaction states without the overhead of asset management.

## Icon Themes

The system currently supports two distinct visual themes, controlled by the user in System Settings:

### 1. Modern (Filled) - *Default*
- **Visual Style**: iOS/macOS-inspired squircle containers.
- **Structure**: Colored background container + White/Contrast icon centered.
- **Usage**: Provides a consistent, touch-friendly target with strong branding colors.
- **Implementation**:
  ```tsx
  // Renders a colored squircle div with centered icon
  <div style={{ backgroundColor: theme.backgroundColor }}>
    <Icon color={theme.iconColor} />
  </div>
  ```

### 2. Classic (Line)
- **Visual Style**: Minimalist, wireframe aesthetic.
- **Structure**: No background container. Icon uses the brand color (or specific line color) directly.
- **Usage**: Offers a cleaner, "desktop" look that blends with the wallpaper.
- **Implementation**:
  ```tsx
  // Renders just the icon with brand color
  <Icon color={theme.lineColor || theme.backgroundColor} />
  ```

## App Manifest Configuration

Each application defines its icon configuration in `src/apps/<app-id>/manifest.tsx`.

### Type Definition
```typescript
interface AppManifest {
    // ...
    icon: LucideIcon
    theme: {
        /** Background color for Filled mode (e.g., '#3b82f6') */
        backgroundColor: string
        /** Icon foreground color for Filled mode (usually '#ffffff') */
        iconColor: string
        /** 
         * Optional override for Line mode color. 
         * If omitted, defaults to backgroundColor.
         * Use this if the brand color is too light/dark for the wallpaper context.
         */
        lineColor?: string
    }
}
```

### Example Configuration

**Portfolio Hub (Dark Theme)**
```tsx
theme: {
    backgroundColor: '#171717', // Black background
    iconColor: '#ffffff',       // White icon
    lineColor: '#ffffff'        // White lines in Line mode (visible on dark/colored wallpapers)
}
```

**Settings (Slate Theme)**
```tsx
theme: {
    backgroundColor: '#475569', // Slate-600
    iconColor: '#ffffff',
    lineColor: '#94a3b8'        // Slate-400 (Lighter for better visibility on dark wallpapers)
}
```

## Best Practices

1.  **Icon Selection**: Use `lucide-react` icons. Choose icons with clear silhouettes that work well at both small (16px) and large (48px+) sizes.
2.  **Color Palette**:
    - Use Tailwind CSS palette colors (e.g., `blue-500`, `emerald-600`) for consistency.
    - For `lineColor`, prefer slightly lighter/brighter shades than `backgroundColor` if the system generally runs on dark backgrounds/wallpapers, to ensure visibility.
3.  **Stroke Width**:
    - The `AppIcon` component automatically adjusts stroke width based on size.
    - Large icons (>48px) use thinner strokes (1.5px) for elegance.
    - Small icons use standard strokes (2px) for legibility.

## Adding a New App Icon

1.  Import the desired icon from `lucide-react`.
2.  Define the `theme` object in the app's `manifest.tsx`.
3.  Test both **Filled** and **Line** modes in Settings -> Appearance to ensure legibility.

## Future Roadmap

- [ ] **Adaptive Colors**: Logic to automatically adjust `lineColor` based on the brightness of the current wallpaper.
- [ ] **Icon Shapes**: Support for Circle or Square shapes in addition to Squircle.
- [ ] **Custom SVGs**: Support for custom SVG paths for brands not in Lucide.
