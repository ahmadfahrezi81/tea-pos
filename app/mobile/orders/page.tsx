// app/mobile/orders/page.tsx
// "use client";
// import { useProfile, useStores } from "@/lib/hooks/useData";
// import { hasSellerRole, hasManagerRole } from "@/lib/utils/roleUtils";
// import MobileOrders from "@/components/mobile/MobileOrders";
// import { redirect } from "next/navigation";

// export default function OrdersPage() {
//     const { data: profile } = useProfile();
//     const { data: storesData } = useStores(profile?.id ?? "");
//     const assignments = storesData?.assignments ?? {};
//     const user = profile ? { id: profile.id } : null;

//     if (!user) {
//         redirect("/mobile/profile");
//     }

//     if (
//         !hasSellerRole(user.id, assignments) ||
//         !hasManagerRole(user.id, assignments)
//     ) {
//         redirect("/mobile/profile");
//     }

//     return <MobileOrders profile={profile} />;
// }

import MobileOrders from "@/components/mobile/MobileOrders";

export default function OrdersPage() {
    return <MobileOrders />;
}
