"use client";

import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { ChevronRight, Users, Tag, Award, UserCog } from "lucide-react";

function MenuRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
    return (
        <button onClick={onClick} className="w-full flex items-center gap-3 py-4 border-b border-gray-100 last:border-none active:bg-gray-50 text-left">
            <span className="text-gray-600">{icon}</span>
            <span className="flex-1 text-base font-medium text-gray-800">{label}</span>
            <ChevronRight size={18} className="text-gray-400" />
        </button>
    );
}

export default function PayOverviewPage() {
    const { url } = useTenantSlug();

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-1">Operations</p>
                <div className="bg-white rounded-xl px-4">
                    <MenuRow icon={<Users size={20} />} label="Staff Payouts" onClick={() => navigation.push(url("/mobile/pay/payouts"))} />
                    <MenuRow icon={<UserCog size={20} />} label="Staff Payroll Info" onClick={() => navigation.push(url("/mobile/pay/staff"))} />
                </div>
            </div>

            <div className="space-y-1">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-1">Config</p>
                <div className="bg-white rounded-xl px-4">
                    <MenuRow icon={<Award size={20} />} label="Commission Types" onClick={() => navigation.push(url("/mobile/pay/commission-types"))} />
                    <MenuRow icon={<Tag size={20} />} label="Claim Types" onClick={() => navigation.push(url("/mobile/pay/claim-types"))} />
                </div>
            </div>
        </div>
    );
}
