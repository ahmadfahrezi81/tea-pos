let _navigate: ((path: string) => void) | null = null;
let _replace: ((path: string) => void) | null = null;

export const navigation = {
    register: (fn: (path: string) => void) => {
        _navigate = fn;
    },
    registerReplace: (fn: (path: string) => void) => {
        _replace = fn;
    },
    push: (path: string) => {
        _navigate?.(path);
    },
    /**
     * For a screen that has finished its job and should not be returned to — a
     * confirmation that has been confirmed. Pushing from there would leave the
     * spent screen in history for the back button to walk back into.
     *
     * Falls back to a push when no replace has been registered, so a caller is
     * never silently dropped.
     */
    replace: (path: string) => {
        (_replace ?? _navigate)?.(path);
    },
};
