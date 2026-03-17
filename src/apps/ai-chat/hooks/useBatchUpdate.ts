import { useRef, useCallback, useEffect } from 'react';

interface BatchUpdateOptions {
    maxBatchSize?: number;
    maxWaitTime?: number;
    onFlush?: () => void;
}

export function useBatchUpdate<T extends Record<string, any>>(
    updateFn: (updates: T) => void,
    options: BatchUpdateOptions = {}
) {
    const {
        maxBatchSize = 10,
        maxWaitTime = 100,
        onFlush
    } = options;

    const pendingUpdatesRef = useRef<Partial<T>>({});
    const batchCountRef = useRef(0);
    const flushTimeoutRef = useRef<NodeJS.Timeout>();
    const lastFlushRef = useRef<number>(0);

    const flush = useCallback(() => {
        if (flushTimeoutRef.current) {
            clearTimeout(flushTimeoutRef.current);
            flushTimeoutRef.current = undefined;
        }

        const updates = pendingUpdatesRef.current;
        if (Object.keys(updates).length === 0) return;

        pendingUpdatesRef.current = {};
        batchCountRef.current = 0;
        lastFlushRef.current = Date.now();

        updateFn(updates as T);
        onFlush?.();
    }, [updateFn, onFlush]);

    const batchUpdate = useCallback((updates: Partial<T>) => {
        const now = Date.now();
        const timeSinceLastFlush = now - lastFlushRef.current;

        pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
        batchCountRef.current++;

        const shouldFlush = 
            batchCountRef.current >= maxBatchSize ||
            timeSinceLastFlush >= maxWaitTime;

        if (shouldFlush) {
            flush();
        } else {
            if (flushTimeoutRef.current) {
                clearTimeout(flushTimeoutRef.current);
            }
            flushTimeoutRef.current = setTimeout(flush, maxWaitTime);
        }
    }, [maxBatchSize, maxWaitTime, flush]);

    useEffect(() => {
        return () => {
            if (flushTimeoutRef.current) {
                clearTimeout(flushTimeoutRef.current);
            }
            flush();
        };
    }, [flush]);

    return { batchUpdate, flush };
}

export function useThrottle<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): T {
    const lastCallRef = useRef<number>(0);
    const timeoutRef = useRef<NodeJS.Timeout>();

    return useCallback((...args: Parameters<T>) => {
        const now = Date.now();
        const timeSinceLastCall = now - lastCallRef.current;

        if (timeSinceLastCall >= delay) {
            lastCallRef.current = now;
            return fn(...args);
        } else {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                lastCallRef.current = Date.now();
                fn(...args);
            }, delay - timeSinceLastCall);
        }
    }, [fn, delay]) as T;
}

export function useDebounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): T {
    const timeoutRef = useRef<NodeJS.Timeout>();

    return useCallback((...args: Parameters<T>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            fn(...args);
        }, delay);
    }, [fn, delay]) as T;
}

export function useRAFThrottle<T extends (...args: any[]) => any>(
    fn: T
): T {
    const rafIdRef = useRef<number>();
    const lastArgsRef = useRef<Parameters<T>>();

    return useCallback((...args: Parameters<T>) => {
        lastArgsRef.current = args;

        if (rafIdRef.current === undefined) {
            rafIdRef.current = requestAnimationFrame(() => {
                rafIdRef.current = undefined;
                if (lastArgsRef.current) {
                    fn(...lastArgsRef.current);
                }
            });
        }
    }, [fn]) as T;
}

export function useTPSCalculator() {
    const startTimeRef = useRef<number>();
    const tokenCountRef = useRef<number>(0);
    const lastTPSRef = useRef<number>(0);

    const start = useCallback(() => {
        startTimeRef.current = Date.now();
        tokenCountRef.current = 0;
    }, []);

    const addTokens = useCallback((count: number) => {
        tokenCountRef.current += count;
    }, []);

    const getTPS = useCallback(() => {
        const start = startTimeRef.current;
        if (!start) return 0;

        const elapsed = (Date.now() - start) / 1000;
        if (elapsed < 0.1) return lastTPSRef.current;

        const tps = tokenCountRef.current / elapsed;
        lastTPSRef.current = tps;
        return tps;
    }, []);

    const reset = useCallback(() => {
        startTimeRef.current = undefined;
        tokenCountRef.current = 0;
        lastTPSRef.current = 0;
    }, []);

    return { start, addTokens, getTPS, reset };
}