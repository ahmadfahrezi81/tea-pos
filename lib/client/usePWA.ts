// lib/hooks/usePWA.ts
import { useState, useEffect } from "react";

export function useIsIPhonePWA() {
    const [isIPhonePWA, setIsIPhonePWA] = useState(false);

    useEffect(() => {
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        const isStandalone =
            (navigator as Navigator & { standalone?: boolean }).standalone ===
            true;
        setIsIPhonePWA(isIOS && isStandalone);
    }, []);

    return isIPhonePWA;
}
