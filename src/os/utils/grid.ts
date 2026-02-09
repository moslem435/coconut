
// Grid settings
export const GRID_SIZE = 90
export const GRID_PADDING = 24

// Store icon positions
export interface IconPosition {
    x: number
    y: number
}

// Helper: snap position to grid
export const snapToGridPos = (x: number, y: number, gridSize: number, padding: number) => {
    const col = Math.round((x - padding) / gridSize)
    const row = Math.round((y - padding) / gridSize)
    return {
        x: Math.max(padding, col * gridSize + padding),
        y: Math.max(padding, row * gridSize + padding)
    }
}

// Helper: check if position is occupied by another icon
export const isPositionOccupied = (
    x: number,
    y: number,
    excludeId: string,
    positions: Record<string, IconPosition>,
    gridSize: number
) => {
    return Object.entries(positions).some(([id, pos]) =>
        id !== excludeId &&
        Math.abs(pos.x - x) < gridSize * 0.8 &&
        Math.abs(pos.y - y) < gridSize * 0.8
    )
}

// Helper: find nearest free grid position using spiral search
export const findFreePosition = (
    x: number,
    y: number,
    excludeId: string,
    positions: Record<string, IconPosition>,
    gridSize: number,
    padding: number
): IconPosition => {
    const snapped = snapToGridPos(x, y, gridSize, padding)

    // First try the exact snapped position
    if (!isPositionOccupied(snapped.x, snapped.y, excludeId, positions, gridSize)) {
        return snapped
    }

    // Search in expanding spiral pattern
    for (let radius = 1; radius <= 15; radius++) {
        // Check all positions at this radius
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                // Only check perimeter positions
                if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue

                const testX = snapped.x + dx * gridSize
                const testY = snapped.y + dy * gridSize

                // Check bounds
                if (testX < padding || testY < padding) continue

                if (!isPositionOccupied(testX, testY, excludeId, positions, gridSize)) {
                    return { x: testX, y: testY }
                }
            }
        }
    }

    // Fallback: return original snapped position
    return snapped
}
