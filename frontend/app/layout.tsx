import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BugJournal - A GitHub-style bug journal for developers",
  description: "BugJournal allows developers to write bug entries locally in markdown and browse them like GitHub issues.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
