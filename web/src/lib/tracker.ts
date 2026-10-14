// Typed access to the vanilla tracker loaded from /mt.js (may be absent or opted out).

type Tracker = {
  visitorId: string | null;
  sessionId: string | null;
  track: (
    name: string,
    props?: Record<string, string | number | boolean | null>,
  ) => void;
};

declare global {
  interface Window {
    mandisaTracker?: Tracker;
  }
}

export function trackEvent(
  name: string,
  props?: Record<string, string | number | boolean | null>,
) {
  window.mandisaTracker?.track(name, props);
}

export function visitorId() {
  return typeof window === "undefined"
    ? null
    : (window.mandisaTracker?.visitorId ?? null);
}
