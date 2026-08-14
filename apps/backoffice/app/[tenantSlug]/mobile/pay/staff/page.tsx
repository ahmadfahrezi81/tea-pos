"use client";

import { useAllPayrollUserInfos } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { usePayrollCommissionConfigs } from "@/lib/hooks/payroll-commission-configs/usePayrollCommissionConfigs";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { StaffList } from "@/components/shared/StaffList";

export default function StaffPayrollInfoListPage() {
    const { infos } = useAllPayrollUserInfos();
    const { commissionTypes } = usePayrollCommissionConfigs();
    const { url } = useTenantSlug();

    const infoByUserId = Object.fromEntries(infos.map((i) => [i.userId, i]));
    const typeById = Object.fromEntries(commissionTypes.map((t) => [t.id, t]));

    return (
        <StaffList
            onSelect={(userId) => navigation.push(url(`/mobile/pay/staff/${userId}`))}
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
