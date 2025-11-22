import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/context/Web3ContextV4";
import ProvidersWrapper from "@/components/ProvidersWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChatDApp v4.0 - Ultra-Fast Glass-Morphism Chat",
  description:
    "A WhatsApp-like decentralized chat application with private messaging on Celo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Web3Provider>
          <ProvidersWrapper>{children}</ProvidersWrapper>
        </Web3Provider>
      </body>
    </html>
  );
}
