import { INDONESIAN_BANKS, type Bank } from "@tea-pos/utils/banks";

export function useBanks(): Bank[] {
    return INDONESIAN_BANKS;
}
