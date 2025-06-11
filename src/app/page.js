"use client";

import { useChat } from "ai/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import ReactMarkdown from 'react-markdown';

export default function Chat() {
  const [isLoading, setIsLoading] = useState(true);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
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

  const handleCopyMessage = async (content, messageId) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const CopyIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );

  const CheckIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

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
              <div className="message-header">
                <div className="message-role">{m.role === "user" ? "You" : "JackBot"}</div>
                {m.role === "assistant" && (
                  <button
                    onClick={() => handleCopyMessage(m.content, m.id)}
                    className={`copy-button ${copiedMessageId === m.id ? 'copied' : ''}`}
                    title="Copy message"
                  >
                    {copiedMessageId === m.id ? <CheckIcon /> : <CopyIcon />}
                  </button>
                )}
              </div>
              <div className="message-text">
                <ReactMarkdown
                  components={{
                    // Style code blocks
                    code({ node, inline, className, children, ...props }) {
                      return (
                        <code className={`${className} ${inline ? 'inline-code' : 'code-block'}`} {...props}>
                          {children}
                        </code>
                      );
                    },
                    // Style links
                    a({ node, children, ...props }) {
                      return (
                        <a className="markdown-link" {...props}>
                          {children}
                        </a>
                      );
                    },
                    // Style lists
                    ul({ node, children, ...props }) {
                      return (
                        <ul className="markdown-list" {...props}>
                          {children}
                        </ul>
                      );
                    },
                    // Style blockquotes
                    blockquote({ node, children, ...props }) {
                      return (
                        <blockquote className="markdown-blockquote" {...props}>
                          {children}
                        </blockquote>
                      );
                    }
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              </div>
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
