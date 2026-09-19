"use client";

import { useRef, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { cn } from "@tea-pos/utils/cn";

interface ActionButtonProps
    extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
    /**
     * The mutation. It may throw — that is how this button learns it failed.
     * Returning `false` means nothing was sent, so the button is released: that
     * is the escape hatch for a handler that opens a confirm and the user backs
     * out of it.
     */
    action: (
        event: MouseEvent<HTMLButtonElement>,
    ) => void | boolean | Promise<unknown>;
    /**
     * Where a rejection goes, normally the app's `showError`. Without one the
     * rejection is re-thrown: a swallowed error is worse than the double press
     * this button exists to prevent.
     */
    onError?: (error: unknown) => void;
    /**
     * Shown beside the spinner while the action runs, replacing the label.
     * Only for a long, multi-stage wait that needs explaining — a spinner
     * already says the app is alive. Without it the spinner sits over the
     * label instead and the button cannot change width.
     */
    busyLabel?: ReactNode;
    /**
     * Release the button when the action succeeds. Off by default: most of these
     * navigate, and navigation takes long enough that a released button is a
     * second submit waiting to happen. Pass it where the screen stays put.
     */
    resetOnSuccess?: boolean;
    children: ReactNode;
}

/**
 * A button for an action that writes — post, put, delete. It shows a spinner
 * inside itself while the action runs and refuses the second press.
 *
 * Busy is an attribute this component writes on the button, not React state,
 * and the spinner is CSS (`.action-*` in each app's globals.css). That is the
 * whole point: rendering the spinner from state needs a commit, and a commit is
 * exactly what a slow device withholds — the feedback would arrive after the
 * request it was meant to describe. One attribute write lands in the tap's own
 * tick, whatever React is doing. Same reasoning as `navProgress` in
 * packages/shell. Do not convert this to `useState`.
 *
 * It owns no styling. `className` is passed straight through so a call site
 * keeps the look it already had — only `relative` is added, so the overlaid
 * spinner has something to sit in.
 *
 * See task 066.
 */
export function ActionButton({
    action,
    onError,
    busyLabel,
    resetOnSuccess = false,
    className,
    children,
    type = "button",
    ...rest
}: ActionButtonProps) {
    const ref = useRef<HTMLButtonElement>(null);
    /* The guard, and the reason this is a ref rather than state: `disabled`
       only bites once React commits, and on a slow phone two taps land in the
       same tick, before that commit. */
    const inFlight = useRef(false);
    const disableFrame = useRef<number | null>(null);

    const setBusy = (busy: boolean) => {
        const el = ref.current;
        if (!el) return;

        if (busy) {
            el.setAttribute("data-busy", "true");
            el.setAttribute("aria-busy", "true");
            /* `disabled` is cosmetic here — the ref above already blocks the
               second press — so it waits a frame. Disabling an element while a
               finger is still down can leave iOS holding the :active transform
               until touchend, which would be this button breaking the very
               styles it promised not to touch. */
            disableFrame.current = requestAnimationFrame(() => {
                disableFrame.current = null;
                if (inFlight.current && ref.current) ref.current.disabled = true;
            });
            return;
        }

        if (disableFrame.current !== null) {
            cancelAnimationFrame(disableFrame.current);
            disableFrame.current = null;
        }
        el.removeAttribute("data-busy");
        el.removeAttribute("aria-busy");
        el.disabled = false;
    };

    const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
        if (inFlight.current) return;
        inFlight.current = true;
        setBusy(true);

        try {
            const result = await action(event);
            /* Deliberately still busy on success. The button is usually about
               to be navigated away from, and releasing it during that gap is
               how one tap becomes two. */
            if (resetOnSuccess || result === false) {
                inFlight.current = false;
                setBusy(false);
            }
        } catch (error) {
            inFlight.current = false;
            setBusy(false);
            if (!onError) throw error;
            onError(error);
        }
    };

    return (
        <button
            ref={ref}
            type={type}
            onClick={handleClick}
            className={cn("relative", className)}
            {...rest}
        >
            {busyLabel ? (
                <>
                    <span className="action-spinner action-inline" aria-hidden />
                    <span className="action-swap">{children}</span>
                    <span className="action-busy-label">{busyLabel}</span>
                </>
            ) : (
                <>
                    {/* The label is wrapped so it can be faded — most of these
                        buttons hold a bare string, and a text node cannot be
                        styled. The wrapper inherits the button's own display,
                        alignment and gap, so an icon beside a word keeps its
                        layout instead of collapsing into one flex item. */}
                    <span className="action-label">{children}</span>
                    <span className="action-overlay" aria-hidden>
                        <span className="action-spinner" />
                    </span>
                </>
            )}
        </button>
    );
}
