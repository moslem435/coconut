export function getRelativeDateGroup(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (isSameDay(date, now)) {
        return 'Today';
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (isSameDay(date, yesterday)) {
        return 'Yesterday';
    }

    if (diffDays <= 7) {
        return 'Previous 7 Days';
    }

    if (diffDays <= 30) {
        return 'Previous 30 Days';
    }

    return 'Older';
}

function isSameDay(d1: Date, d2: Date) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}
