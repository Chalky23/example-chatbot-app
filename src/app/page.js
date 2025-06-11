"use client";

import { useChat } from "ai/react";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Chat() {
  const [isLoading, setIsLoading] = useState(true);
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    onFinish: (message) => {
      // Save messages to localStorage whenever a new message is added
      const updatedMessages = [...messages, message];
      localStorage.setItem('chatHistory', JSON.stringify(updatedMessages));
    }
  });

  // Load messages from localStorage on component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatHistory');
    if (savedMessages) {
      const parsedMessages = JSON.parse(savedMessages);
      // Update messages with saved history
      parsedMessages.forEach((msg) => {
        if (!messages.find((m) => m.id === msg.id)) {
          messages.push(msg);
        }
      });
    }
    setIsLoading(false);
  }, []);

  const handleClearChat = () => {
    localStorage.removeItem('chatHistory');
    window.location.reload();
  };

  return (
    <div className="chatbot">
      <Image
        src="/jackbot-img.jpeg"
        className="image"
        width={200}
        height={200}
        alt="jackbot image"
      />
      <h1>Hi, I&apos;m JackBot!</h1>
      <div className="chat-container">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`message ${m.role === "user" ? "user-message" : "bot-message"}`}
          >
            <div className="message-content">
              <div className="message-role">{m.role === "user" ? "You" : "JackBot"}</div>
              <div className="message-text">{m.content}</div>
              <div className="message-timestamp">
                {new Date(m.createdAt || Date.now()).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="chat-controls">
        <form onSubmit={handleSubmit} className="input-form">
          <input
            className="inputField"
            value={input}
            placeholder="Ask me anything..."
            onChange={handleInputChange}
          />
          <button type="submit" className="send-button">
            Send
          </button>
          <button type="button" onClick={handleClearChat} className="clear-button">
            Clear
          </button>
        </form>
      </div>
    </div>
  );
}
