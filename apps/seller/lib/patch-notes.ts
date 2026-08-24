import type { PatchNote } from "@tea-pos/ui/custom/PatchNotes";

/**
 * Newest first. Each entry is one short line — see `.claude/skills/patch-notes`.
 *
 * A version with nothing a seller could notice does not appear, so gaps in the
 * sequence are expected rather than missing. The list starts at 5.0.2 because
 * that is as far back as the commit history describes what actually changed.
 */
export const patchNotes: PatchNote[] = [
    {
        version: "5.4.10",
        date: "2026-08-25",
        entries: [
            { kind: "improved", text: "The logo appears the moment you open the app, even with no connection." },
            { kind: "fixed", text: "The logo no longer goes missing while the app is loading." },
        ],
    },
    {
        version: "5.4.9",
        date: "2026-08-23",
        entries: [
            { kind: "improved", text: "The app opens faster." },
            { kind: "improved", text: "You see the logo while the app opens, instead of a blank screen." },
        ],
    },
    {
        version: "5.4.8",
        date: "2026-08-23",
        entries: [
            { kind: "improved", text: "Every part of your payslip now has a heading." },
            { kind: "improved", text: "The work days calendar on your payslip is bigger and easier to read." },
            { kind: "improved", text: "Tap the transfer receipt on your payslip to see it full screen." },
            { kind: "fixed", text: "The day summary shows who opened and who closed the day." },
        ],
    },
    {
        version: "5.4.7",
        date: "2026-08-17",
        entries: [
            { kind: "added", text: "After an update, the app shows you what changed." },
            { kind: "improved", text: "No more refresh prompt when there is nothing to refresh." },
        ],
    },
    {
        version: "5.4.6",
        date: "2026-08-17",
        entries: [{ kind: "added", text: "This screen: what changed in each version." }],
    },
    {
        version: "5.4.5",
        date: "2026-08-17",
        entries: [
            { kind: "fixed", text: "The back button no longer gets stuck after the app refreshes." },
            { kind: "improved", text: "A pay period with nothing owed now shows as Skipped instead of staying open." },
        ],
    },
    {
        version: "5.4.4",
        date: "2026-08-16",
        entries: [{ kind: "improved", text: "The app starts faster." }],
    },
    {
        version: "5.4.3",
        date: "2026-08-16",
        entries: [{ kind: "improved", text: "Only one refresh prompt appears when a new version is ready." }],
    },
    {
        version: "5.4.2",
        date: "2026-08-16",
        entries: [
            { kind: "fixed", text: "You are told about a new version as soon as it is ready." },
            { kind: "fixed", text: "My Pay loads even while the pay schedule is being changed." },
        ],
    },
    {
        version: "5.4.1",
        date: "2026-08-09",
        entries: [{ kind: "fixed", text: "Product sales and day-of-week charts load again." }],
    },
    {
        version: "5.4.0",
        date: "2026-08-09",
        entries: [
            { kind: "added", text: "The takeover screen shows how many cups the current holder has sold." },
            { kind: "improved", text: "Days with no waste now count in the waste chart." },
        ],
    },
    {
        version: "5.3.0",
        date: "2026-08-09",
        entries: [
            { kind: "fixed", text: "The orders list updates right after you place an order." },
            { kind: "improved", text: "New artwork on the takeover and refresh screens." },
        ],
    },
    {
        version: "5.2.0",
        date: "2026-08-09",
        entries: [{ kind: "improved", text: "Products load faster." }],
    },
    {
        version: "5.1.3",
        date: "2026-08-05",
        entries: [{ kind: "improved", text: "Orders, stores and daily summaries load faster." }],
    },
    {
        version: "5.1.2",
        date: "2026-08-04",
        entries: [
            { kind: "added", text: "Admin can leave you a note when confirming your payment." },
            { kind: "added", text: "You are prompted to reload when a new version is ready." },
            { kind: "improved", text: "Payment details are grouped together on the payslip." },
        ],
    },
    {
        version: "5.1.1",
        date: "2026-08-02",
        entries: [
            { kind: "fixed", text: "Handing a store over works when two people act at once." },
            { kind: "fixed", text: "The payslip screen no longer crashes." },
            { kind: "fixed", text: "Chart tooltips stay attached to the point you tapped." },
        ],
    },
    {
        version: "5.1.0",
        date: "2026-07-30",
        entries: [
            { kind: "added", text: "Tapping the tab you are on scrolls back to the top." },
            { kind: "improved", text: "The close-day steps are easier to move through." },
        ],
    },
    {
        version: "5.0.6",
        date: "2026-07-28",
        entries: [
            { kind: "added", text: "Charts can be broken down by category." },
            { kind: "fixed", text: "Photos keep their shape instead of stretching." },
        ],
    },
    {
        version: "5.0.5",
        date: "2026-07-25",
        entries: [
            { kind: "added", text: "A tea waste chart." },
            { kind: "improved", text: "Daily sales load faster." },
        ],
    },
    {
        version: "5.0.4",
        date: "2026-07-25",
        entries: [{ kind: "added", text: "You can hide demo and closed stores in the store picker." }],
    },
    {
        version: "5.0.3",
        date: "2026-07-25",
        entries: [{ kind: "added", text: "A Chats tab, still in development." }],
    },
    {
        version: "5.0.2",
        date: "2026-07-25",
        entries: [
            { kind: "added", text: "Your payslip shows the expected payout date." },
            { kind: "improved", text: "Earnings cards are easier to read." },
        ],
    },
];
