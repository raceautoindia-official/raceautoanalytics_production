/**
 * The admin pages must never be served from a cache.
 *
 * Without this, a client-only page like /admin/cms is statically prerendered
 * and served with `Cache-Control: s-maxage=31536000` — a ONE YEAR TTL — so the
 * HTML kept pointing at the previous build's JavaScript after a deploy. A CMS
 * change could be live on the server and still invisible to editors, with only
 * a cache-busting query string revealing the new build.
 *
 * /admin/page.jsx already set this for itself; putting it on the layout covers
 * every admin page, including the CMS.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="container-fluid admin-panel">{children}</div>
    </>
  );
}
