// Retired standalone page — superseded by the "User Management" tab inside the
// CMS (/admin/cms). Kept as a redirect so the old /admin/manage-users link
// still works.
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/admin/cms");
}
