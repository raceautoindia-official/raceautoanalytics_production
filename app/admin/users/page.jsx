// Retired standalone page — user management now lives as the "User Management"
// tab inside the CMS (/admin/cms), gated by the /admin middleware Basic-Auth.
// Kept as a redirect so the old /admin/users link still works.
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/admin/cms");
}
