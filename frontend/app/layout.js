import "./globals.css";
import { Inter } from "next/font/google";
import Providers from "./providers";

// Modern, crisp variable typeface used across the whole app.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  title: "NextStep — Student Habit, Study & Advice Tracker",
  description:
    "Turn student advice into real action plans. Read advice, save it, build a habit, add it to your calendar, and track your progress.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
