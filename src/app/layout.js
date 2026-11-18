
import PerformanceMonitor from "@/components/dev/performance-monitor";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
});

export const metadata = {
  title: {
    default: "Sales Tracker | Advanced Air & Vacuum",
    template: "%s | Sales Tracker | Advanced Air & Vacuum",
  },
  description: "Sales Tracker | Advanced Air & Vacuum",
  icons: {
    icon: "/Favicon.jpg",
    shortcut: "/Favicon.jpg",
    apple: "/Favicon.jpg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${montserrat.variable} antialiased min-h-screen`}
      >
        <PerformanceMonitor />
        {children}
      </body>
    </html>
  );
}
