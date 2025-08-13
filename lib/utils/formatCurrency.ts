export function formatRupiah(amount: number | string) {
    const value = typeof amount === "number" ? amount : Number(amount) || 0;

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })
        .format(value)
        .replace(/^Rp\s*/, "Rp ");
}
