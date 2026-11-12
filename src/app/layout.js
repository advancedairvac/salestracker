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
    default: "Advanced Sales Tracker",
    template: "%s | Advanced Sales Tracker",
  },
  description: "Advanced Sales Tracker",
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
