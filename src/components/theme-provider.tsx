"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

const SCRIPT_TAG_WARNING = "Encountered a script tag";

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes(SCRIPT_TAG_WARNING)
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      {...props}
      // next-themes injects an inline <script> to prevent theme flash on load.
      // React 19 warns about script tags inside components during client render.
      // The script still runs correctly from SSR HTML; this only silences the dev noise.
      scriptProps={{ suppressHydrationWarning: true }}
    >
      {children}
    </NextThemesProvider>
  );
}
