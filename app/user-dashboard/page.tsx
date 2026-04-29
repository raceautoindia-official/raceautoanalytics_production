"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// /user-dashboard is not a real route in this app — every user-facing account
// surface lives at /settings. Some external links and bookmarks may still point
// here, so we silently redirect instead of showing a 404.
export default function UserDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      Redirecting to your account…
    </div>
  );
}
