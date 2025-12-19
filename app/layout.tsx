import './globals.css'

export const metadata = {
  title: 'Macro Risk Dashboard',
  description: 'Real-time macro economic risk indicators',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
