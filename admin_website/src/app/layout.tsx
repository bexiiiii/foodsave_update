import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { GlobalErrorHandler } from '@/components/GlobalErrorHandler';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FoodSave Admin Dashboard",
  description: "Admin dashboard for FoodSave application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background antialiased`} suppressHydrationWarning>
        <ErrorBoundary>
          <GlobalErrorHandler />
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
