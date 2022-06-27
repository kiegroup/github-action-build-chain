/**
 * Converts a date object into a string of the format yyyymmddHHMMss
 * @param date A Date object
 * @returns {string} String of the format yyyymmddHHMMss
 */
function formatDate(date: Date): string {
    return `${date.getFullYear()}${date.getMonth()}${date.getDate()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
}

function hrtimeToMs(startHrTime: [number, number], endHrTime: [number, number] = process.hrtime(startHrTime)): number {
    return endHrTime[0] * 1000 + endHrTime[1] / 1000000;
}
  
export { formatDate, hrtimeToMs };