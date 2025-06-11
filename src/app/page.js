"use client";

import { useChat } from "ai/react";
import Image from "next/image";

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();
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
            </div>
          </div>
        ))}
      </div>

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
      </form>
    </div>
  );
}
