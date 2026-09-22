"use client";

import { use, useState } from "react";
import { usePayslip } from "@/lib/hooks/payroll/usePayroll";
import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { useUpload } from "@/lib/hooks/upload/useUpload";
import { getDaysUntilPayoutUnlock } from "@tea-pos/utils/week";
import { parseISO, format } from "date-fns";
import { Copy, Check } from "lucide-react";
import { PhotoPicker } from "@/components/shared/PhotoPicker";
import { FormFooter } from "@/components/shared/FormFooter";
import { Callout } from "@tea-pos/ui/custom/Callout";
import { Field } from "@tea-pos/ui/custom/Field";
import { Textarea } from "@tea-pos/ui/custom/Textarea";
import { Skeleton } from "@tea-pos/ui/custom/Skeleton";

function CopyableValue({ value, prefix, className }: { value: string; prefix?: string; className?: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className={`flex items-center gap-1.5 active:opacity-70 ${className ?? "text-base font-medium text-gray-900"}`}
        >
            {prefix}{value}
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-400" />}
        </button>
    );
}

export default function PayConfirmPage({
    params,
    searchParams,
}: {
    params: Promise<{ payoutId: string }>;
    searchParams: Promise<{ userId?: string }>;
}) {
    const { payoutId } = use(params);
    const { userId } = use(searchParams);
    const { url } = useTenantSlug();
    const { payslip, isLoading: payslipLoading, settlePayout } = usePayslip(payoutId, userId);
    const { upload } = useUpload();
    const { info: payrollUserInfo, isLoading: infoLoading } = usePayrollUserInfo(userId ?? "");
    const { users } = useTenantUsers();
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [proofPreview, setProofPreview] = useState<string | null>(null);
    const [notes, setNotes] = useState("");
    const [error, setError] = useState<string | null>(null);

    /* True while *our own* settle is in flight, so the guard below does not read
       it as the stale-tab case. Without it the page flashes "Already paid" in
       the gap between the cache updating and the navigation committing.

       State, not a ref like `ActionButton`'s: that one must beat two taps in one
       tick, this one only a re-render a round trip away. */
    const [settlingHere, setSettlingHere] = useState(false);

    const targetUser = users.find((u) => u.id === userId);
    const userParam = userId ? `?userId=${userId}` : "";

    const handleConfirm = async (skip: boolean) => {
        // False releases the button: nothing was sent.
        if (!skip && !proofFile) { setError("Please attach a transfer screenshot."); return false; }
        setError(null);
        setSettlingHere(true);
        try {
            const proofUrl = proofFile
                ? await upload(proofFile, "payroll-proofs")
                : undefined;
            await settlePayout({
                status: skip ? "skipped" : "paid",
                paymentProofUrl: proofUrl,
                // Omitted rather than sent as "" when left blank — the column
                // stays null, which is how "no note" is stored.
                notes: notes.trim() || undefined,
            });
        } catch (err) {
            /* Released and re-thrown so `FormFooter`'s `onError` still fires. No
               `finally`: on success the guard stays suppressed until the screen
               leaves. */
            setSettlingHere(false);
            throw err;
        }
        /* Back, not replace. This screen must leave history either way — the
           back button walking into a settled confirm form was the original
           bug — but replacing put a *second* copy of the payslip on top of the
           one already behind us, so the next back moved between two identical
           entries and appeared to do nothing.

           `back()` pops this entry and lands on that payslip, with its own
           query string intact. The shell falls back to replacing with the
           parent when there is nothing to pop, which is the same destination. */
        navigation.back();
    };

    if (payslipLoading || infoLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl p-4 space-y-2.5">
                        <Skeleton delay={i * 90} className="h-4 w-28" />
                        <Skeleton delay={i * 90 + 60} className="h-3.5 w-2/3" />
                    </div>
                ))}
            </div>
        );
    }

    const totalPay = payslip?.totalPay ?? 0;
    const endDate = payslip?.payout?.endDate;
    const settled = payslip?.payout?.status === "paid" || payslip?.payout?.status === "skipped";

    /* Reachable by back button, by a stale tab, or by typing the URL. The form
       would otherwise offer to settle a payout that is already settled, and
       doing so would overwrite who paid it, when, and the proof they filed.

       `settlingHere` excepts our own settle: a guard that refuses a repeat has
       to be able to tell it from the original. */
    if (settled && !settlingHere) {
        return (
            <div className="space-y-4">
                <div className="bg-white rounded-xl p-6 space-y-2 text-center">
                    <p className="text-lg font-bold text-gray-900">
                        {payslip?.payout.status === "skipped" ? "Period already closed" : "Already paid"}
                    </p>
                    <p className="text-sm text-gray-500">
                        Nothing left to confirm here. The payslip has the details.
                    </p>
                </div>
                <button
                    onClick={() => navigation.replace(url(`/mobile/pay/payouts/${payoutId}${userParam}`))}
                    className="w-full py-3.5 bg-brand text-white font-bold rounded-xl active:opacity-80"
                >
                    View payslip
                </button>
            </div>
        );
    }

    /* Nothing owed means there is nothing to transfer, so this screen closes the
       period instead of paying it. The rule lives here rather than in the API:
       what a zero total means is a judgement about the period, not a fact the
       server should enforce on an amount. */
    const isSkip = totalPay === 0;
    const daysUntilUnlock = endDate ? getDaysUntilPayoutUnlock(endDate) : 0;
    const locked = daysUntilUnlock > 0;
    const staffName = targetUser?.fullName ?? "the staff member";

    return (
        <div className="space-y-4">
            {/* Amount */}
            <div className="bg-white rounded-xl p-4 space-y-1">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    {isSkip ? "Amount owed" : "Amount to Pay"}
                </p>
                {isSkip ? (
                    <p className="text-3xl font-bold text-gray-900">Rp 0</p>
                ) : (
                    <CopyableValue value={totalPay.toLocaleString("id-ID")} prefix="Rp " className="text-3xl font-bold text-gray-900" />
                )}
                {payslip?.payout && (
                    <p className="text-sm text-gray-500">
                        {format(parseISO(payslip.payout.startDate), "d MMM")} – {format(parseISO(payslip.payout.endDate), "d MMM yyyy")}
                    </p>
                )}
            </div>

            {/* Bank details — only the transfer needs them */}
            {!isSkip && (
                <div className="bg-white rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">Staff</span>
                        <span className="font-medium text-gray-800">{targetUser?.fullName ?? "—"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">Bank</span>
                        <span className="font-medium text-gray-800">{payrollUserInfo?.bankName ?? "—"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">Account No.</span>
                        {payrollUserInfo?.bankAccountNumber
                            ? <CopyableValue value={payrollUserInfo.bankAccountNumber} />
                            : <span className="font-medium text-amber-600">Not set</span>}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">Account Name</span>
                        <span className="font-medium text-gray-800">{payrollUserInfo?.bankAccountHolder ?? "—"}</span>
                    </div>
                </div>
            )}

            {isSkip && (
                <div className="bg-white rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">Staff</span>
                        <span className="font-medium text-gray-800">{targetUser?.fullName ?? "—"}</span>
                    </div>
                    <Callout>
                        Nothing was approved for this period, so no transfer is made. Closing it
                        locks its commissions and claims the same way paying would.
                    </Callout>
                </div>
            )}

            {/* Proof upload */}
            {!isSkip && (
                <div className="bg-white rounded-xl p-4">
                    <Field label="Transfer Screenshot" required>
                        <PhotoPicker
                            previewUrl={proofPreview}
                            onCapture={(file, previewUrl) => { setProofFile(file); setProofPreview(previewUrl); }}
                            onRemove={() => { setProofFile(null); setProofPreview(null); }}
                            onError={(msg) => setError(msg)}
                            allowGallery
                        />
                    </Field>
                </div>
            )}

            {/* Note to the staff member — they see this on their payslip, so it
                is addressed to them rather than kept as an internal reference. */}
            <div className="bg-white rounded-xl p-4 space-y-2">
                <Field label="Note for staff">
                    <Textarea
                        value={notes}
                        onChange={setNotes}
                        maxLength={500}
                        rows={3}
                        placeholder={isSkip
                            ? "e.g. No shifts worked this fortnight"
                            : "e.g. Paid early for the holiday, includes W30 shortfall"}
                    />
                </Field>
                <Callout>
                    Shown to {staffName} on their payslip. Can&apos;t be edited after
                    {isSkip ? " the period is closed." : " payment."}
                </Callout>
            </div>

            {locked && (
                <Callout>
                    This period runs until {endDate ? format(parseISO(endDate), "EEE, d MMM") : "its last day"}.
                    {" "}It can be {isSkip ? "closed" : "paid"} from that day, {daysUntilUnlock} day
                    {daysUntilUnlock === 1 ? "" : "s"} from now.
                </Callout>
            )}

            {error && (
                <div className="bg-red-50 rounded-xl px-4 py-3">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            <FormFooter
                label={locked
                    ? `${daysUntilUnlock} day${daysUntilUnlock === 1 ? "" : "s"} left`
                    : isSkip ? "Mark as Skipped" : "Confirm Payment"}
                loadingLabel={isSkip ? "Closing..." : "Confirming..."}
                onSubmit={() => handleConfirm(isSkip)}
                onError={(err) =>
                    setError(err instanceof Error ? err.message : "Failed to confirm payment")
                }
                disabled={locked || (!isSkip && !proofFile)}
                variant={isSkip ? "gray" : "green"}
                confirmTitle={isSkip ? "Skip this payout?" : "Confirm payment?"}
                confirmMessage={isSkip
                    ? `${staffName} is owed nothing for this period.`
                    : `Rp ${totalPay.toLocaleString("id-ID")} to ${staffName}.`}
                confirmIcon={isSkip ? "fluent-emoji:receipt" : "fluent-emoji:money-with-wings"}
                confirmNote={isSkip
                    ? {
                        title: "What this records",
                        body: "The period closes with no transfer, against your name and today's date. Its commissions and claims can no longer be approved or rejected.",
                    }
                    : {
                        title: "What this records",
                        body: "The transfer screenshot, your name and today's date are saved to the payslip. The note cannot be edited afterwards.",
                    }}
            />
        </div>
    );
}
