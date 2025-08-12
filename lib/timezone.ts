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
