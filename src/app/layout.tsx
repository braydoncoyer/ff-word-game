import type { Metadata } from "next";
import { Playfair_Display, Crimson_Text, Abril_Fatface } from "next/font/google";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700", "900"],
  display: "swap",
});

const crimsonText = Crimson_Text({
  variable: "--font-crimson",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const abrilFatface = Abril_Fatface({
  variable: "--font-abril",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Frantic Five - Daily Word Puzzle",
  description: "Find the secret 5-letter word between two alphabetically ordered words. A new puzzle every day!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        className={`${playfairDisplay.variable} ${crimsonText.variable} ${abrilFatface.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
