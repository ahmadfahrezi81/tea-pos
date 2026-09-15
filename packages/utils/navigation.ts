let _navigate: ((path: string) => void) | null = null;
let _replace: ((path: string) => void) | null = null;
let _back: (() => void) | null = null;

export const navigation = {
    register: (fn: (path: string) => void) => {
        _navigate = fn;
    },
    registerReplace: (fn: (path: string) => void) => {
        _replace = fn;
    },
    registerBack: (fn: () => void) => {
        _back = fn;
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
    /**
     * Up a level, the way the header's back arrow goes — what a form does once
     * it has saved. Through the shell rather than `router.back()`, so it shows
     * the navigation bar, and so a form opened after a reload still lands on its
     * parent instead of leaving the app's history.
     *
     * Falls back to the browser's back when no shell has registered.
     */
    back: () => {
        if (_back) _back();
        else window.history.back();
    },
};
