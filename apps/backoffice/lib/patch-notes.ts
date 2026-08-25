import type { PatchNote } from "@tea-pos/ui/custom/PatchNotes";

/**
 * Newest first. Each entry is one short line — see `.claude/skills/patch-notes`.
 *
 * A version with nothing an owner could notice does not appear, so gaps in the
 * sequence are expected rather than missing. This list is complete: 1.0.0 is
 * the release the app arrived in.
 */
export const patchNotes: PatchNote[] = [
    {
        version: "1.0.13",
        date: "2026-08-25",
        entries: [
            { kind: "improved", text: "A pencil shows which fields you can type in, and a lock shows which you cannot." },
            { kind: "improved", text: "A red star now marks every field you have to fill in." },
            { kind: "fixed", text: "An automatic claim type can no longer be created without minimum hours, which stopped it from ever paying out." },
        ],
    },
    {
        version: "1.0.11",
        date: "2026-08-25",
        entries: [
            { kind: "improved", text: "The logo appears the moment you open the app, even with no connection." },
            { kind: "fixed", text: "The logo no longer goes missing while the app is loading." },
        ],
    },
    {
        version: "1.0.10",
        date: "2026-08-23",
        entries: [
            { kind: "improved", text: "The app opens faster." },
        ],
    },
    {
        version: "1.0.9",
        date: "2026-08-23",
        entries: [
            { kind: "improved", text: "Every part of the payslip screen now has a heading." },
            { kind: "improved", text: "The work days calendar on a payslip is bigger and easier to read." },
            { kind: "improved", text: "The transfer receipt shows as a photo you can tap to enlarge." },
        ],
    },
    {
        version: "1.0.8",
        date: "2026-08-17",
        entries: [
            { kind: "added", text: "After an update, the app shows you what changed." },
            { kind: "improved", text: "No more refresh prompt when there is nothing to refresh." },
        ],
    },
    {
        version: "1.0.7",
        date: "2026-08-17",
        entries: [{ kind: "added", text: "This screen: what changed in each version." }],
    },
    {
        version: "1.0.6",
        date: "2026-08-17",
        entries: [
            { kind: "added", text: "You can close a pay period that owes nothing, without paying it." },
            { kind: "improved", text: "Pay unlocks on the last day of the period, so nobody is paid early." },
            { kind: "fixed", text: "The back button no longer gets stuck after the app refreshes." },
        ],
    },
    {
        version: "1.0.5",
        date: "2026-08-17",
        entries: [
            { kind: "improved", text: "The Pay tab shows less, and says each thing once." },
            { kind: "added", text: "Paying now asks you to confirm first." },
        ],
    },
    {
        version: "1.0.4",
        date: "2026-08-17",
        entries: [
            { kind: "added", text: "Home replaces the dashboard, and you can filter it by store." },
            { kind: "improved", text: "Open days and takings sit side by side at the top." },
        ],
    },
    {
        version: "1.0.3",
        date: "2026-08-16",
        entries: [{ kind: "improved", text: "The app starts faster." }],
    },
    {
        version: "1.0.2",
        date: "2026-08-16",
        entries: [{ kind: "improved", text: "Only one refresh prompt appears when a new version is ready." }],
    },
    {
        version: "1.0.1",
        date: "2026-08-16",
        entries: [
            { kind: "added", text: "A Pay Schedule screen for how often staff are paid." },
            { kind: "added", text: "A sales chart and an open-days grid on the dashboard." },
            { kind: "added", text: "A More menu with your account details." },
        ],
    },
    {
        version: "1.0.0",
        date: "2026-06-03",
        entries: [
            { kind: "added", text: "The backoffice app: payroll, supply and daily summaries in one place." },
        ],
    },
];
