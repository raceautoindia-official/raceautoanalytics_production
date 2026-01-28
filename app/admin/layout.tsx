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
