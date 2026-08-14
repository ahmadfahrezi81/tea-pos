"use client";

import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { HandCoins, IdCard, Coins, Percent, ReceiptText } from "lucide-react";
import { SettingsRow, SettingsGroup } from "@tea-pos/ui/custom/SettingsRow";

export default function PayOverviewPage() {
    const { url } = useTenantSlug();

    return (
        <div className="space-y-4">
            <SettingsGroup title="Operations">
                <SettingsRow
                    icon={<HandCoins size={22} strokeWidth={2} className="text-gray-900" />}
                    label="Staff Payouts"
                    onClick={() => navigation.push(url("/mobile/pay/payouts"))}
                />
                <SettingsRow
                    icon={<IdCard size={22} strokeWidth={2} className="text-gray-900" />}
                    label="Staff Payroll Info"
                    onClick={() => navigation.push(url("/mobile/pay/staff"))}
                />
            </SettingsGroup>

            <SettingsGroup title="Configuration">
                <SettingsRow
                    icon={<Coins size={22} strokeWidth={2} className="text-gray-900" />}
                    label="Commission Types"
                    onClick={() => navigation.push(url("/mobile/pay/commission-types"))}
                />
                <SettingsRow
                    icon={<Percent size={22} strokeWidth={2} className="text-gray-900" />}
                    label="Staff Commissions"
                    onClick={() => navigation.push(url("/mobile/pay/staff-commissions"))}
                />
                <SettingsRow
                    icon={<ReceiptText size={22} strokeWidth={2} className="text-gray-900" />}
                    label="Claim Types"
                    onClick={() => navigation.push(url("/mobile/pay/claim-types"))}
                />
            </SettingsGroup>
        </div>
    );
}
