export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="overflow-hidden">
      <body className="overflow-hidden">
        {children}
      </body>
    </html>
  )
}