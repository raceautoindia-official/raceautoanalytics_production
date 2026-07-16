// Client-side signal fired the moment a subscription changes for the CURRENT
// user (e.g. right after a successful in-app purchase). Entitlement hooks
// (useFlashEntitlement / useForecastEntitlement / useCurrentPlan) listen for it
// and refetch in place, so the UI flips to "paid" instantly instead of waiting
// for the next tab-focus or the 90s background poll.
//
// NOTE: this only covers changes made in THIS browser. A change made elsewhere
// (an admin promoting the user on Race Auto India) still relies on the 90s poll
// until the server-push (Phase 3) lands — a tab in another device can't hear a
// window event from the admin's browser.
export const SUBSCRIPTION_CHANGED_EVENT = "subscription:changed";

export function notifySubscriptionChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SUBSCRIPTION_CHANGED_EVENT));
  }
}
