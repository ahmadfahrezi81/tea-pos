"use client";

import { useAllPayrollUserInfos } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { usePayrollCommissionConfigs } from "@/lib/hooks/payroll-commission-configs/usePayrollCommissionConfigs";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { StaffList } from "@/components/shared/StaffList";

/* Only the states worth interrupting for. An active account is the assumption
   every row already carries, and a badge saying so on almost every row would
   stop meaning anything. */
const STATUS_TAGS: Record<string, string> = {
    suspended: "bg-red-100 text-red-600",
    inactive: "bg-gray-100 text-gray-500",
    pending: "bg-amber-100 text-amber-700",
};

export default function StaffPayrollInfoListPage() {
    const { infos } = useAllPayrollUserInfos();
    const { commissionTypes } = usePayrollCommissionConfigs();
    const { url } = useTenantSlug();

    const infoByUserId = Object.fromEntries(infos.map((i) => [i.userId, i]));
    const typeById = Object.fromEntries(commissionTypes.map((t) => [t.id, t]));

    return (
        <StaffList
            onSelect={(userId) => navigation.push(url(`/mobile/pay/staff/${userId}`))}
            titleTag={(user) => {
                const tag = STATUS_TAGS[user.status];
                if (!tag) return null;
                return (
                    <span
                        className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${tag}`}
                    >
                        {user.status}
                    </span>
                );
            }}
            subtitle={(user) => {
                const configId = infoByUserId[user.id]?.commissionConfigId;
                const slug = configId ? typeById[configId]?.slug : null;
                return (
                    <>
                        {user.role}
                        {slug && <span className="ml-1.5 font-mono text-xs text-brand/70">· {slug}</span>}
                    </>
                );
            }}
        />
    );
}
