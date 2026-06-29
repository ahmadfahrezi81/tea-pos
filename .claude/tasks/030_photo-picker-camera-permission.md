# PhotoPicker Camera Permission Handling

## Context

The `PhotoPicker` component (`apps/seller/app/[tenantSlug]/mobile/home/manage/_components/shared/PhotoPicker.tsx`) uses a native `<input type="file" capture="environment">` to open the camera. When camera permission is denied by the OS (observed on Vivo phones), the picker closes silently — `e.target.files?.[0]` is `undefined`, the function does an early `return`, and the user sees nothing.

This affects the Open Store page (`open/page.tsx`) and any other page using `PhotoPicker`. The fix must be bulletproof on Android, especially aggressive OEM skins like Vivo (Funtouch OS / OriginOS) which often block browser camera access at the OS level.

---

## Root Cause

```ts
// PhotoPicker.tsx:20
const file = e.target.files?.[0];
if (!file) return;  // silent bail — no onError, no feedback
```

`onError` is only called for compression failures on unsupported file types. Permission denial never reaches it.

---

## Fix Plan

### 1. Pre-check permission with `navigator.permissions`

Before triggering `inputRef.current?.click()`, query camera permission status:

- `"denied"` → skip the click entirely, call `onError` immediately with a message pointing to Settings
- `"prompt"` → call `getUserMedia({ video: true })` to explicitly trigger the browser's permission dialog, then proceed to the input click on grant; call `onError` on denial
- `"granted"` → proceed directly to `inputRef.current?.click()`

Note: `navigator.permissions` may not be available in all browsers/webviews. Wrap in a try/catch and fall through to the click if unsupported.

### 2. Catch empty result after click (OEM fallback)

Even when `navigator.permissions` says `"granted"`, Vivo's OS can block at the OS level. After `handleFileChange` fires with an empty `files`, detect this and show an error:

```ts
const file = e.target.files?.[0];
if (!file) {
    onError?.("Camera access was blocked. Please allow camera permission in your phone's Settings app.");
    return;
}
```

**No gallery fallback.** The app requires real-time camera photos for transparency — uploading from the gallery is not permitted.

---

## Error Display

**Permission errors** → Vaul bottom sheet, handled **internally inside `PhotoPicker`**. This is a blocking, actionable error that needs clear instructions — the same pattern used by `StorePickerDrawer`, `CartDrawer`, etc. across the app.

The sheet shows:
- Title: "Camera Access Blocked"
- Short explanation of why
- Step-by-step instructions to fix it in phone Settings
- A single "Got it" dismiss button

**Compression / processing errors** → still bubble up via `onError` to the parent's red banner. Those are transient failures, not actionable settings issues.

No changes needed in parent pages (`open/page.tsx` etc.) for permission errors — the sheet is self-contained in `PhotoPicker`.

---

## Implementation

### `PhotoPicker.tsx`

Add internal state `const [permissionBlocked, setPermissionBlocked] = useState(false)` to control the bottom sheet.

Replace the tap button's `onClick` with an async `handleClick`:

```tsx
const handleClick = async () => {
    try {
        const status = await navigator.permissions.query({ name: "camera" as PermissionName });
        if (status.state === "denied") {
            setPermissionBlocked(true);
            return;
        }
        if (status.state === "prompt") {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach((t) => t.stop());
            } catch {
                setPermissionBlocked(true);
                return;
            }
        }
    } catch {
        // permissions API not supported (iOS Safari etc.) — fall through to native input
    }
    inputRef.current?.click();
};
```

In `handleFileChange`, replace the silent bail with:

```tsx
const file = e.target.files?.[0];
if (!file) {
    setPermissionBlocked(true); // OEM fallback (Vivo, Oppo, etc.)
    return;
}
```

Add the Vaul drawer at the bottom of the component's JSX (same pattern as `StorePickerDrawer`):

```tsx
<Drawer.Root open={permissionBlocked} onOpenChange={setPermissionBlocked}>
    <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl px-4 pt-5 pb-8 focus:outline-none">
            <div className="absolute top-2 left-0 right-0 flex justify-center">
                <div className="w-8 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between mb-1">
                <Drawer.Title className="text-xl font-bold text-gray-900">
                    Camera Access Blocked
                </Drawer.Title>
                <button
                    onClick={() => setPermissionBlocked(false)}
                    className="p-1.5 rounded-full text-gray-900 hover:bg-gray-100 -mr-2"
                >
                    <X size={26} />
                </button>
            </div>
            <Drawer.Description className="sr-only">Camera permission is required to take photos</Drawer.Description>
            <p className="text-sm text-gray-500 mb-4">
                This app needs camera access to take photos.
            </p>
            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside mb-6">
                <li>Open your phone's <strong>Settings</strong></li>
                <li>Go to <strong>Apps</strong> → your browser</li>
                <li>Tap <strong>Permissions</strong> → <strong>Camera</strong> → Allow</li>
                <li>Come back and try again</li>
            </ol>
            <button
                onClick={() => setPermissionBlocked(false)}
                className="w-full py-3 rounded-xl bg-brand text-white font-semibold"
            >
                Got it
            </button>
        </Drawer.Content>
    </Drawer.Portal>
</Drawer.Root>
```

Import `X` from `lucide-react` and `Drawer` from `vaul`.

### `open/page.tsx` / any page using `PhotoPicker`

No changes needed. Permission errors are now fully self-contained in `PhotoPicker`.

---

## Files to Modify

- `apps/seller/app/[tenantSlug]/mobile/home/manage/_components/shared/PhotoPicker.tsx` — main fix

### `onError` audit

All five consumers found via grep:

| File | `onError` wired? |
|---|---|
| `manage/open/page.tsx` | ✅ |
| `manage/request/add/page.tsx` | ✅ |
| `manage/report/add/page.tsx` | ✅ |
| `more/reimbursements/add/page.tsx` | ✅ |
| `manage/_components/daily/SinglePhotoStep.tsx` | ❌ missing |

`SinglePhotoStep` is used in the close-day flow. Permission errors are now handled by the internal drawer so they'll surface regardless, but compression errors will still be silent there. Add `onError` to that usage too.

---

## Notes

- `getUserMedia` in the `"prompt"` path triggers the browser permission dialog. After grant, `inputRef.current?.click()` opens the camera again — that's fine, the browser remembers the grant.
- On iOS Safari, `navigator.permissions.query({ name: 'camera' })` throws — the catch handles it and falls through to the click. iOS shows its own native permission dialog so this path is fine.
- The empty `files` check in `handleFileChange` is the OEM fallback — catches Vivo/Oppo/Xiaomi cases where the OS blocks the camera after the browser thinks permission is granted.
- Do NOT remove `capture="environment"` — it opens the rear camera directly on Android without showing a picker UI.
