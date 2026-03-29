let _navigate: ((path: string) => void) | null = null;

export const navigation = {
    register: (fn: (path: string) => void) => {
        _navigate = fn;
    },
    push: (path: string) => {
        _navigate?.(path);
    },
};
