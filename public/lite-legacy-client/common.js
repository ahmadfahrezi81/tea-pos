// common.js - Shared functions across all pages

// At the top of common.js
if (typeof Promise === "undefined" || typeof fetch === "undefined") {
    document.body.innerHTML =
        '<div style="padding:20px;text-align:center">' +
        "<h2>Browser Too Old</h2>" +
        "<p>Please update Google Chrome to use this app.</p>" +
        "<p>Silakan perbarui Google Chrome untuk menggunakan aplikasi ini.</p>" +
        "</div>";
}

const apiBase = "/api";

// Global state
window.profile = null;
window.stores = [];
window.assignments = {};
window.tenant = null; // Add this

// Format currency
function formatRupiah(amount) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(amount);
}

// Show toast notification
function showToast(message, type) {
    const toast = $("#toast");
    toast
        .text(message)
        .removeClass("success error")
        .addClass(type + " active");
    setTimeout(() => toast.removeClass("active"), 4000);
}

// Format date for input
function formatDateForInput(date) {
    return date.toISOString().split("T")[0];
}

// Initialize authentication
async function initAuth() {
    const profileRes = await fetch(`${apiBase}/profiles`, {
        credentials: "include",
    });

    if (profileRes.status === 401) {
        return null;
    }

    if (!profileRes.ok) {
        throw new Error("Profile fetch failed");
    }

    window.profile = await profileRes.json();
    return window.profile;
}

// Load stores for user
async function loadStores(userId) {
    const storeRes = await fetch(`${apiBase}/stores?userId=${userId}`, {
        credentials: "include",
    });

    if (!storeRes.ok) {
        throw new Error("Failed to load stores");
    }

    const storeData = await storeRes.json();
    window.stores = storeData.stores || [];
    window.assignments = storeData.assignments || {};

    return { stores: window.stores, assignments: window.assignments };
}

// Fetch and display current tenant
async function loadTenantName() {
    try {
        const res = await fetch(`${apiBase}/tenants/current`, {
            credentials: "include",
        });

        if (!res.ok) {
            throw new Error("Failed to fetch tenant");
        }

        const tenant = await res.json();
        window.tenant = tenant;

        // Update UI if element exists
        const tenantElement = $("#tenant-name");
        if (tenantElement.length > 0) {
            tenantElement.text(tenant.name || "Unknown Tenant");
        }

        return tenant;
    } catch (err) {
        console.error("Failed to load tenant name:", err);
        const tenantElement = $("#tenant-name");
        if (tenantElement.length > 0) {
            tenantElement.text("Tenant unavailable");
        }
        return null;
    }
}
