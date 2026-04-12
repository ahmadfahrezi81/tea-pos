// components/pos/QrisCode.tsx
import QRCode from "react-qr-code";
import Image from "next/image";

interface QrisCodeProps {
    value: string;
    size?: number;
}

export function QrisCode({ value, size = 250 }: QrisCodeProps) {
    const logoSize = Math.round(size * 0.22);

    return (
        <div className="relative inline-flex items-center justify-center">
            <QRCode
                value={value}
                size={size}
                bgColor="#ffffff"
                fgColor="#111111"
                level="H"
            />
            <div
                className="absolute bg-white rounded-lg p-1 flex items-center justify-center"
                style={{ width: logoSize + 8, height: logoSize + 8 }}
            >
                <Image
                    src="/LEMONI-512x512.png"
                    alt="logo"
                    width={logoSize}
                    height={logoSize}
                    className="rounded-md object-contain"
                />
            </div>
        </div>
    );
}
