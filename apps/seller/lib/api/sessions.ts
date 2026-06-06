import { apiFetch, buildParams } from "./client";
import type {
    OpenStoreInput, TransferSessionInput, GetActiveSessionQuery,
    GetGateStateQuery, ResumeSessionInput, ListSessionsByMonthQuery,
} from "@tea-pos/features/sessions/schema";
import { OpenStoreResponse, StoreSessionResponse, GateStateResponse, ResumeSessionResponse, SessionsByMonthResponse, SessionsBySummaryResponse } from "@tea-pos/features/sessions/schema";

export const sessionsApi = {
    getActive: async (params: GetActiveSessionQuery) => {
        const sp = buildParams(params as Record<string, unknown>);
        return apiFetch<unknown>(`/api/sessions?${sp}`).then((data) => {
            if (!data) return null;
            return StoreSessionResponse.parse(data);
        });
    },

    getGateState: async (params: GetGateStateQuery) => {
        const sp = buildParams(params as Record<string, unknown>);
        return GateStateResponse.parse(await apiFetch<unknown>(`/api/sessions/gate?${sp}`));
    },

    open: async (input: OpenStoreInput) => {
        return OpenStoreResponse.parse(
            await apiFetch<unknown>("/api/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            }),
        );
    },

    resume: async (input: ResumeSessionInput) => {
        return ResumeSessionResponse.parse(
            await apiFetch<unknown>("/api/sessions/resume", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            }),
        );
    },

    transfer: async (input: TransferSessionInput) => {
        return StoreSessionResponse.parse(
            await apiFetch<unknown>("/api/sessions/transfer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            }),
        );
    },

    end: async (sessionId: string) => {
        return StoreSessionResponse.parse(
            await apiFetch<unknown>(`/api/sessions/${encodeURIComponent(sessionId)}`, {
                method: "PATCH",
            }),
        );
    },

    listByMonth: async (params: ListSessionsByMonthQuery) => {
        const sp = buildParams(params as Record<string, unknown>);
        return SessionsByMonthResponse.parse(await apiFetch<unknown>(`/api/sessions?${sp}`));
    },

    getBySummary: async (summaryId: string) => {
        return SessionsBySummaryResponse.parse(
            await apiFetch<unknown>(`/api/sessions/summary/${encodeURIComponent(summaryId)}`),
        );
    },
};
