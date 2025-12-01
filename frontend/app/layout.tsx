import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Marisa Playground",
  description: "Testing platform for Eleven Labs conversational AI models",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
