"use client";

import { useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import {
    MapPin,
    Store,
    Rocket,
    Cloud,
    Banknote,
    ReceiptText,
    ScrollText,
} from "lucide-react";
import { SettingsRow, SettingsGroup } from "@tea-pos/ui/custom/SettingsRow";
import { useFastOrderMode } from "@/lib/context/FastOrderModeContext";
import { useFlags } from "@/lib/context/FlagsContext";
import { navigation } from "@tea-pos/utils/navigation";
import { WeatherDrawer } from "../../home/pos/_components/WeatherDrawer";
import WorkDays from "./WorkDays";
import { useT } from "@/lib/hooks/useT";

// ============================================================================
// FAST ORDER TOGGLE — div, not button, to avoid nested <button> error
// ============================================================================

function FastOrderToggle({ enabled }: { enabled: boolean }) {
    return (
        <div
            className={`relative w-13 h-8 rounded-full transition-colors duration-200 shrink-0 pointer-events-none ${
                enabled ? "bg-rose-600" : "bg-gray-300"
            }`}
        >
            <span
                className={`absolute top-0.5 left-0.5 w-7 h-7 bg-white rounded-full shadow-md transition-transform duration-200 ${
                    enabled ? "translate-x-5" : "translate-x-0"
                }`}
            />
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MoreMenu() {
    const { url } = useTenantSlug();
    const { user } = useAuth();
    const { fastOrderMode, toggleFastOrderMode } = useFastOrderMode();
    const { flags: { isFastOrderEnabled } } = useFlags();
    const [isWeatherOpen, setIsWeatherOpen] = useState(false);
    const t = useT();

    if (!user) return null;

    return (
        <div className="space-y-4">
            {/* Work Days is the one section that is a card of its own rather than
                rows, so it is laid out here instead of through SettingsGroup. */}
            <section className="space-y-2">
                <p className="pl-3 text-xs font-bold uppercase tracking-widest text-gray-700">{t("more.workDays")}</p>
                <WorkDays />
            </section>

            <SettingsGroup title={t("more.personal")}>
                <SettingsRow
                    icon={<Banknote size={22} strokeWidth={2} className="text-gray-900" />}
                    label={t("more.myPay")}
                    onClick={() => navigation.push(url("/mobile/more/earnings"))}
                />
                <SettingsRow
                    icon={<ReceiptText size={22} strokeWidth={2} className="text-gray-900" />}
                    label={t("more.myClaims")}
                    onClick={() => navigation.push(url("/mobile/more/reimbursements"))}
                />
                <SettingsRow
                    icon={<Store size={22} strokeWidth={2} className="text-gray-900" />}
                    label={t("more.myStores")}
                    onClick={() => navigation.push(url("/mobile/more/stores"))}
                />
            </SettingsGroup>

            <SettingsGroup title={t("more.general")}>
                <SettingsRow
                    icon={<Cloud size={22} strokeWidth={2} className="text-gray-900" />}
                    label={t("more.weather")}
                    onClick={() => setIsWeatherOpen(true)}
                />
                <SettingsRow
                    icon={<MapPin size={22} strokeWidth={2} className="text-gray-900" />}
                    label={t("more.locationFeedback")}
                    onClick={() => navigation.push(url("/mobile/more/map"))}
                />
                <SettingsRow
                    icon={<ScrollText size={22} strokeWidth={2} className="text-gray-900" />}
                    label={t("more.patchNotes")}
                    onClick={() => navigation.push(url("/mobile/more/patch-notes"))}
                />
            </SettingsGroup>

            {isFastOrderEnabled && (
                <SettingsGroup title={t("more.preferences")}>
                    <SettingsRow
                        icon={<Rocket size={22} strokeWidth={2} className="text-gray-900" />}
                        label={t("more.fastOrderMode")}
                        onClick={toggleFastOrderMode}
                        right={<FastOrderToggle enabled={fastOrderMode} />}
                    />
                </SettingsGroup>
            )}

            <WeatherDrawer
                isOpen={isWeatherOpen}
                onClose={() => setIsWeatherOpen(false)}
            />
        </div>
    );
}
