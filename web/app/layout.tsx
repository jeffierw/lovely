import type { Metadata } from "next";
import "../styles/globals.css";
import "@mysten/dapp-kit/dist/index.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "lovely",
  description: "Web3 creator subscriptions powered by Walrus + Seal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[var(--bg)] text-[var(--text)] min-h-screen">
        <Providers>
          <div className="min-h-screen bg-[var(--bg)]">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
