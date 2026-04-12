// components/pos/QrisCode.tsx
import QRCode from "react-qr-code";

interface QrisCodeProps {
    value: string;
    size?: number;
}

export function QrisCode({ value, size = 250 }: QrisCodeProps) {
    return (
        <div className="bg-white p-3 rounded-xl border border-gray-100">
            <QRCode
                value={value}
                size={size}
                bgColor="#ffffff"
                fgColor="#111111"
                level="M"
            />
        </div>
    );
}
