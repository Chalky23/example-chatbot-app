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
      <h1>Hi, I&apos;m JackBot! </h1>
      {messages.map((m) => (
        <div key={m.id} className="chatHistory">
          {m.role === "user" ? "You: " : "JackBot: "}
          {m.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          className="inputField"
          value={input}
          placeholder="Ask me anything."
          onChange={handleInputChange}
        />
      </form>
    </div>
  );
}
