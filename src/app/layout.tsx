import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "~/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Viesti - Slack Clone",
  description: "A real-time chat application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full">
        <body className={cn(inter.className, "h-full overflow-hidden")}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
