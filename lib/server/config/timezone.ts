// Helper function to convert UTC to Indonesia time
export const toIndonesiaTime = (utcDate: string) => {
    return new Date(utcDate + "Z").toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export const toIndonesiaDate = (utcDate: string) => {
    return new Date(utcDate + "Z").toLocaleDateString("id-ID", {
        timeZone: "Asia/Jakarta",
    });
};
export const formatFullIndonesiaTimestamp = (dateString: string) => {
    if (!dateString) return "Not set"; // English fallback for missing input
    const date = new Date(dateString + "Z");
    return date.toLocaleString("en-US", {
        timeZone: "Asia/Jakarta",
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false, // Use 24-hour format
    });
};

// export const toIndonesiaMonthYear = (utcDate: string) => {
//     if (!utcDate) return "Date not available"; // English fallback
//     return new Date(utcDate + "Z").toLocaleDateString("en-US", {
//         timeZone: "Asia/Jakarta",
//         year: "numeric",
//         month: "long",
//     });
// };

export const toIndonesiaMonthYear = (yyyyMm: string) => {
    if (!yyyyMm) return "Date not available";

    const [year, month] = yyyyMm.split("-");
    if (!year || !month) return "Invalid date format";

    // Build a valid date: always set day to 1
    const date = new Date(`${year}-${month}-01T00:00:00Z`);

    return date.toLocaleDateString("en-US", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "long",
    });
};
