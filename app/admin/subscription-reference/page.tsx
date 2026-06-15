// Retired standalone page — Subscription Reference now lives as a tab inside
// the CMS (/admin/cms). Kept as a redirect so old links/bookmarks still work.
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/admin/cms");
}
