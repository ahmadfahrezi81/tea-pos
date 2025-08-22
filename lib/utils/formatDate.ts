export const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
    } else {
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year:
                date.getFullYear() !== today.getFullYear()
                    ? "numeric"
                    : undefined,
        });
    }
};

export const formatMonth = (monthStr: string): string => {
    const date = new Date(monthStr + "-01");
    return date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });
};

export const getCurrentMonth = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        "0"
    )}`;
};

export const formatDateForInput = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
    )}`;
};
