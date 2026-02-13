# {{AppTitle}} App

## Structure

```
{{app-id}}/
├── index.tsx           # Main component
├── manifest.tsx        # App registration
├── components/         # UI components
├── hooks/             # Custom hooks
├── utils/             # Utility functions
└── types.ts           # TypeScript types
```

## Development

1. Implement your app logic in `index.tsx`
2. Add components to `components/` directory
3. Create custom hooks in `hooks/` directory
4. Register your app in `src/os/registry/config.tsx`

## Lifecycle Hooks (Coming Soon)

```typescript
export const lifecycle = {
  onMount: () => {
    // Called when app window opens
  },
  onUnmount: () => {
    // Called when app window closes
  },
  onFocus: () => {
    // Called when app window gains focus
  },
  onBlur: () => {
    // Called when app window loses focus
  }
}
```

## Best Practices

1. Use CSS variables for theming: `var(--os-bg-window)`, `var(--os-text-primary)`
2. Keep components small and focused
3. Use the event bus for cross-app communication
4. Implement proper error boundaries
5. Follow the existing code style
