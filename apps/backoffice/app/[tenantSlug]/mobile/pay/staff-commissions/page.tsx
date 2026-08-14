"use client";

import { useAllPayrollUserInfos } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { usePayrollCommissionConfigs } from "@/lib/hooks/payroll-commission-configs/usePayrollCommissionConfigs";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { StaffList } from "@/components/shared/StaffList";

export default function StaffCommissionsListPage() {
    const { infos } = useAllPayrollUserInfos();
    const { commissionTypes } = usePayrollCommissionConfigs();
    const { url } = useTenantSlug();

    const infoByUserId = Object.fromEntries(infos.map((i) => [i.userId, i]));
    const typeById = Object.fromEntries(commissionTypes.map((t) => [t.id, t]));

    return (
        <StaffList
            onSelect={(userId) => navigation.push(url(`/mobile/pay/staff-commissions/${userId}`))}
            subtitle={(user) => {
                const configId = infoByUserId[user.id]?.commissionConfigId;
                const type = configId ? typeById[configId] : null;
                // The assigned type is the whole point of this screen, so it is
                // the subtitle rather than a suffix on the role.
                return type ? type.name : <span className="text-gray-300">No commission assigned</span>;
            }}
        />
    );
}
