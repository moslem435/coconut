export const SYSTEM_CONSTANTS = {
    // Grid System
    GRID_SIZE: 90,
    GRID_PADDING: 24,

    // Window Snapping & Dragging
    SNAP_THRESHOLD: 10,
    RESTORE_DRAG_THRESHOLD: 20,

    // Window Limits
    MIN_WINDOW_WIDTH: 300,
    MIN_WINDOW_HEIGHT: 200,

    // Taskbar
    TASKBAR_HEIGHT: 40,

    // Animation Durations (ms)
    WINDOW_TRANSITION_DURATION: 300,

    // Z-Index Layers
    Z_INDEX: {
        DESKTOP: 0,
        WINDOW_BASE: 10,
        TASKBAR: 10000,
        CONTEXT_MENU: 20000,
        NOTIFICATIONS: 9999,
        PEEK_WINDOW: 5000,
        SNAP_PREVIEW: 6000,
    }
} as const
