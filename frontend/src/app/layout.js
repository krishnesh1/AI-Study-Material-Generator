import "./globals.css";

export const metadata = {
  title: "AI-Powered Learning Companion",
  description: "Turn any YouTube video into Study Notes & Quizzes",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
