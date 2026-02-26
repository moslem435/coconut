
export function getRelativeDateGroup(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (isSameDay(date, now)) {
        return 'ai.date.today';
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (isSameDay(date, yesterday)) {
        return 'ai.date.yesterday';
    }

    if (diffDays <= 7) {
        return 'ai.date.previous_7_days';
    }

    if (diffDays <= 30) {
        return 'ai.date.previous_30_days';
    }

    return 'ai.date.older';
}

function isSameDay(d1: Date, d2: Date) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}
