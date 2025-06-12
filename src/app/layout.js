import "./globals.css";

export const metadata = {
  title: "JackBot",
  description:
    "Your very own chatbot, for those times when the workplace web filter doesn't like ChatGPT",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
