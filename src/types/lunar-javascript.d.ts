declare module 'lunar-javascript' {
    export class Solar {
        static fromYmd(year: number, month: number, day: number): Solar;
        getLunar(): Lunar;
        getFestivals(): string[];
        getXingZuo(): string;
    }

    export class Lunar {
        getDayInChinese(): string;
        getFestivals(): string[];
        getJieQi(): string;
        getDay(): number;
        getMonthInChinese(): string;
        getYearInGanZhi(): string;
        getMonthInGanZhi(): string;
        getDayInGanZhi(): string;
        getYearShengXiao(): string;
    }

    export class HolidayUtil {
        static getHoliday(year: number, month: number, day: number): Holiday | null;
    }

    export class Holiday {
        isWork(): boolean;
        getName(): string;
    }
}
