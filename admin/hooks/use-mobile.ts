import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onChange: () => void): () => void {
  const mediaQueryList = window.matchMedia(QUERY);

  mediaQueryList.addEventListener("change", onChange);

  return () => mediaQueryList.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function getServerSnapshot(): boolean {
  // SSR 阶段无法测量视口，默认按桌面布局渲染，水合后由真实快照修正。
  return false;
}

export function useIsMobile(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
