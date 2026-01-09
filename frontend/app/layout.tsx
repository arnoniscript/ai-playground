import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageContext";
import BankAccountGuard from "@/components/bank-account-guard";

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
      <body>
        <LanguageProvider>
          <BankAccountGuard>{children}</BankAccountGuard>
        </LanguageProvider>
      </body>
    </html>
  );
}
