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
        <header className="header-bar">
          <span id="dark-mode-toggle" className="header-dark-toggle" role="button" tabIndex="0" aria-label="Toggle dark mode">
            Dark mode
          </span>
          <span className="header-title">JackBot</span>
          <span id="clear-chat-link" className="header-clear" role="button" tabIndex="0" aria-label="Clear chat">Clear chat</span>
        </header>
        {children}
      </body>
    </html>
  );
}
