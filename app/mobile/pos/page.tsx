// app/mobile/pos/page.tsx
// "use client";
// import { useProfile, useStores } from "@/lib/hooks/useData";
// import { hasSellerRole } from "@/lib/utils/roleUtils";
// import MobilePOS from "@/components/mobile/MobilePOS";
// import { redirect } from "next/navigation";

// export default function POSPage() {
//     const { data: profile } = useProfile();
//     const { data: storesData } = useStores(profile?.id ?? "");
//     const assignments = storesData?.assignments ?? {};
//     const user = profile ? { id: profile.id } : null;

//     if (!user) {
//         redirect("/mobile/profile");
//     }

//     if (!hasSellerRole(user.id, assignments)) {
//         redirect("/mobile/profile");
//     }

//     return <MobilePOS profile={profile} />;
// }

import MobilePOS from "@/components/mobile/MobilePOS";

export default function POSPage() {
    return <MobilePOS />;
}
