import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "NyayMitra — Your AI Legal Companion",
    description:
        "NyayMitra (न्याय मित्र) is an AI-powered legal assistant for Indian citizens. Get free legal guidance in your language, find local lawyers and NGOs, and understand your rights.",
    keywords: [
        "legal aid India",
        "free legal advice",
        "Karnataka lawyer",
        "Bengaluru legal help",
        "Indian law AI",
        "NyayMitra",
    ],
    openGraph: {
        title: "NyayMitra — AI Legal Helper for India",
        description: "Free multilingual legal guidance powered by AI. Serving citizens across India.",
        siteName: "NyayMitra",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
