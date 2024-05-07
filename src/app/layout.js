import "./globals.css";

export const metadata = {
  title: "JackBot",
  description:
    "Your very own chatbot, for those times when the workplace web filter doesn't like ChatGPT",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
