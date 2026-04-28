import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BIC's Function Sheet",
  description: "Bahrain International Circuit — event coordination",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
