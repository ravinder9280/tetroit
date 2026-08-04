import "@monorepo/ui/globals.css";

import type { Metadata } from "next";

import { ReactQueryProvider } from "../providers/query-provider";
import { ThemeProvider } from "../providers/theme-provider";

export const metadata: Metadata = {
  description: "A real-time personal AI chat application",
  title: "Tetroit Chat",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="class" enableSystem>
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
