// import "./globals.css";
// import type { Metadata } from "next";
// import { Inter } from "next/font/google";
// import { Toaster } from "@/components/ui/toaster";

// const inter = Inter({ subsets: ["latin"] });

// export const metadata: Metadata = {
//   title: "File Upload & Gemini LLM",
//   description: "Upload files and ask questions using Gemini LLM",
// };

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <html lang="en">
//       <head>
//         <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
//       </head>
//       <body className={inter.className}>
//         {children}
//         <Toaster />
//       </body>
//     </html>
//   );
// }



























// import "./globals.css";
// import type { Metadata } from "next";
// import { Inter } from "next/font/google";
// import { Toaster } from "@/components/ui/toaster";
// import Script from "next/script"; // Import Script component

// const inter = Inter({ subsets: ["latin"] });

// export const metadata: Metadata = {
//   title: "File Upload & Gemini LLM",
//   description: "Upload files and ask questions using Gemini LLM",
// };

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <html lang="en">
//       <head>
//         <Script
//           src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"
//           strategy="beforeInteractive" // Ensures it loads before your scripts run
//         />
//       </head>
//       <body className={inter.className}>
//         {children}
//         <Toaster />
//       </body>
//     </html>
//   );
// }





















import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import Script from "next/script"; // Import Next.js Script

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StudyBuddy",
  description: "AI Assignment Helper",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
        {/* Move the script inside body & use lazyOnload */}
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"
          strategy="lazyOnload" // Loads script only after page loads
        />
      </body>
    </html>
  );
}
