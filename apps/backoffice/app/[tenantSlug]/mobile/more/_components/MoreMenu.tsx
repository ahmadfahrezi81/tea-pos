"use client";

import { useState } from "react";
import { Cloud, MapPin, ScrollText } from "lucide-react";
import { SettingsRow, SettingsGroup } from "@tea-pos/ui/custom/SettingsRow";
import { WeatherDrawer } from "@tea-pos/ui/custom/WeatherDrawer";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import useWeather from "@/lib/hooks/weather/useWeather";
import { useT } from "@/lib/hooks/useT";

export default function MoreMenu() {
    const { url } = useTenantSlug();
    const [isWeatherOpen, setIsWeatherOpen] = useState(false);
    const { data: weather, isLoading: isWeatherLoading } = useWeather();
    const t = useT();

    return (
        <div className="space-y-4">
            <SettingsGroup title="General">
                <SettingsRow
                    icon={<Cloud size={22} strokeWidth={2} className="text-gray-900" />}
                    label="Weather"
                    onClick={() => setIsWeatherOpen(true)}
                />
                <SettingsRow
                    icon={<MapPin size={22} strokeWidth={2} className="text-gray-900" />}
                    label="Location Feedback"
                    onClick={() => navigation.push(url("/mobile/more/map"))}
                />
                <SettingsRow
                    icon={<ScrollText size={22} strokeWidth={2} className="text-gray-900" />}
                    label="Patch Notes"
                    onClick={() => navigation.push(url("/mobile/more/patch-notes"))}
                />
            </SettingsGroup>

            <WeatherDrawer
                isOpen={isWeatherOpen}
                onClose={() => setIsWeatherOpen(false)}
                data={weather}
                isLoading={isWeatherLoading}
                t={t}
            />
        </div>
    );
}
