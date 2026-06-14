export type Bank = { id: string; name: string };

export const INDONESIAN_BANKS: Bank[] = [
    // State-owned
    { id: "bjb", name: "Bank BJB (Jabar Banten)" },
    { id: "bca", name: "Bank Central Asia (BCA)" },
    { id: "mandiri", name: "Bank Mandiri" },
    { id: "bri", name: "Bank Rakyat Indonesia (BRI)" },
    { id: "bni", name: "Bank Negara Indonesia (BNI)" },

    // E-wallets
    { id: "gopay", name: "GoPay" },
    { id: "dana", name: "DANA" },
    { id: "ovo", name: "OVO" },
    { id: "shopeepay", name: "ShopeePay" },
    { id: "linkaja", name: "LinkAja" },

    // Digital
    { id: "btpn-jenius", name: "Jenius (Bank BTPN)" },
    { id: "jago", name: "Bank Jago" },
    { id: "seabank", name: "SeaBank" },
    { id: "blu-bca", name: "blu" },
    { id: "bnc-neobank", name: "Bank Neo Commerce (Neobank)" },
    { id: "allo-bank", name: "Allo Bank" },
    { id: "superbank", name: "Superbank" },
    { id: "bank-raya", name: "Bank Raya" },

    // Islamic
    { id: "bsi", name: "Bank Syariah Indonesia (BSI)" },
    { id: "muamalat", name: "Bank Muamalat" },
    { id: "bca-syariah", name: "Bank BCA Syariah" },

    // Others
    { id: "cimb-niaga", name: "CIMB Niaga" },
    { id: "permata", name: "Bank Permata" },
    { id: "danamon", name: "Bank Danamon" },
    { id: "ocbc", name: "Bank OCBC Indonesia" },
    { id: "maybank", name: "Bank Maybank Indonesia" },
    { id: "panin", name: "Bank Panin" },
    { id: "sinarmas", name: "Bank Sinarmas" },
    { id: "btn", name: "Bank Tabungan Negara (BTN)" },
];
