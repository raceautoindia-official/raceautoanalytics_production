/**
 * /flash-reports/settings — redirects to /settings (the new generic Account Settings page).
 * This redirect keeps existing bookmarks and links working.
 */
import { redirect } from "next/navigation";

export default function FlashSettingsRedirect() {
  redirect("/settings");
}
