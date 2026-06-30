"use client";

import * as React from "react";

/** Focus after the popup has opened to avoid open/focus flicker. */
export function useDeferredFocus(open: boolean) {
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      ref.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  return ref;
}
