"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { useBanks } from "@/lib/hooks/banks/useBanks";
import { NumberInput } from "../../../home/manage/_components/shared/NumberInput";
import { Drawer } from "vaul";
import { X, ChevronRight } from "lucide-react";
import type { PayrollUserInfoResponse } from "@tea-pos/features/payroll-user-info/schema";

function BankPickerDrawer({
    isOpen,
    onClose,
    onSelect,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (name: string) => void;
}) {
    const banks = useBanks();
    const [query, setQuery] = useState("");
    const filtered = banks.filter((b) =>
        b.name.toLowerCase().includes(query.toLowerCase()),
    );

    return (
        <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl flex flex-col focus:outline-none" style={{ maxHeight: "80dvh" }}>
                    <Drawer.Title className="sr-only">Select bank</Drawer.Title>
                    <Drawer.Description className="sr-only">Choose your bank from the list</Drawer.Description>
                    <div className="absolute top-2 left-0 right-0 flex justify-center">
                        <div className="w-8 h-1 rounded-full bg-gray-300" />
                    </div>
                    <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
                        <p className="text-lg font-semibold text-gray-900">Select Bank</p>
                        <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 active:bg-gray-100">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="px-4 pb-3 shrink-0">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search bank..."
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand/40"
                        />
                    </div>
                    <div className="overflow-y-auto pb-10">
                        {filtered.map((bank) => (
                            <button
                                key={bank.id}
                                onClick={() => { onSelect(bank.name); onClose(); }}
                                className="w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-100 last:border-none active:bg-gray-50 text-left"
                            >
                                <span className="text-base text-gray-900">{bank.name}</span>
                            </button>
                        ))}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}

function EditForm({ info, update }: {
    info: PayrollUserInfoResponse | null;
    update: (input: { bankName?: string; bankAccountNumber?: string; bankAccountHolder?: string }) => Promise<PayrollUserInfoResponse>;
}) {
    const router = useRouter();
    const [bankName, setBankName] = useState(info?.bankName ?? "");
    const [bankAccountNumber, setBankAccountNumber] = useState(Number(info?.bankAccountNumber?.replace(/\D/g, "") || 0));
    const [bankAccountHolder, setBankAccountHolder] = useState(info?.bankAccountHolder ?? "");
    const [isBankPickerOpen, setIsBankPickerOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        try {
            await update({
                bankName: bankName.trim() || undefined,
                bankAccountNumber: bankAccountNumber ? String(bankAccountNumber) : undefined,
                bankAccountHolder: bankAccountHolder.trim() || undefined,
            });
            router.back();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 space-y-4">
                    <div className="space-y-1.5">
                        <p className="text-xs font-medium text-gray-500">Bank name</p>
                        <button
                            onClick={() => setIsBankPickerOpen(true)}
                            className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none active:ring-2 active:ring-brand/40 text-left"
                        >
                            <span className={bankName ? "text-gray-900" : "text-gray-400"}>
                                {bankName || "Select bank"}
                            </span>
                            <ChevronRight size={18} className="text-gray-400 shrink-0" />
                        </button>
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-xs font-medium text-gray-500">Account number</p>
                        <NumberInput
                            raw
                            value={bankAccountNumber}
                            onChange={setBankAccountNumber}
                            placeholder="1234567890"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-xs font-medium text-gray-500">Account holder name</p>
                        <input
                            type="text"
                            value={bankAccountHolder}
                            onChange={(e) => setBankAccountHolder(e.target.value)}
                            placeholder="As printed on the account"
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand/40"
                        />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-4 bg-brand text-white font-bold rounded-xl active:opacity-80 disabled:opacity-40 text-base"
                >
                    {isSaving ? "Saving..." : "Save"}
                </button>
            </div>

            <BankPickerDrawer
                isOpen={isBankPickerOpen}
                onClose={() => setIsBankPickerOpen(false)}
                onSelect={setBankName}
            />
        </>
    );
}

export default function EditPayrollInfoPage() {
    const { info, isLoading, update } = usePayrollUserInfo();

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-7 h-7 border-3 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return <EditForm key={info?.id ?? "new"} info={info} update={update} />;
}
