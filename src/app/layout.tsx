import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClauseLens - Legal Contract Diligence",
  description:
    "Grounded legal contract intelligence with verified citations and substantive clause comparison.",
  icons: {
    icon: [
      { url: "/untitled-ui-icon.png", sizes: "256x256", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: "/untitled-ui-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased light" style={{ colorScheme: "light" }}>
      <head>
        <link rel="icon" type="image/png" sizes="256x256" href="/untitled-ui-icon.png" />
        <link rel="apple-touch-icon" href="/untitled-ui-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full overflow-hidden bg-[#FAFAF8] text-[#18181B] antialiased selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
