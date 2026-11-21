declare function draw(theme: string): void;

export function swapTheme(next: string) {
  // ok: view-transition-without-flush-sync-js
  document.startViewTransition(() => draw(next));
  // ok: view-transition-without-flush-sync-js
  document.startViewTransition(() => {
    document.documentElement.dataset.theme = next;
  });
}

import { useState } from "react";

export function useSwap(next: string) {
  const [, setTheme] = useState(next);
  // ruleid: view-transition-without-flush-sync-js
  document.startViewTransition(() => setTheme(next));
}
