import { t as translate } from "@tea-pos/utils/translations";

/**
 * Backoffice has no language switcher — every screen is English. This exists so
 * shared components, which take a `t(key)` prop, can be handed the same message
 * catalogue the seller app uses instead of each app inventing its own copy.
 */
export function useT() {
    return (key: string) => translate("en", key);
}
