"use client";

import { useChat } from "ai/react";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import { supabase } from '../utils/supabaseClient';
import AuthForm from './auth/AuthForm';
import './page.css';

export default function Chat() {
  const [isLoading, setIsLoading] = useState(true);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('positive');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('idle');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const { messages, input, handleInputChange, handleSubmit, setMessages } = useChat({
    onFinish: (message) => {
      // Ensure message has a createdAt timestamp
      const messageWithTimestamp = {
        ...message,
        createdAt: message.createdAt || Date.now(),
      };
      // No localStorage, Supabase will handle persistence
    }
  });
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);
  const [chats, setChats] = useState([]); // all chat sessions
  const [activeChatId, setActiveChatId] = useState(null); // current chat id

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

  useEffect(() => {
    const clearChatLink = document.getElementById('clear-chat-link');
    if (clearChatLink) {
      const onClick = (e) => {
        e.preventDefault();
        handleClearChat();
      };
      const onKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClearChat();
        }
      };
      clearChatLink.addEventListener('click', onClick);
      clearChatLink.addEventListener('keydown', onKeyDown);
      return () => {
        clearChatLink.removeEventListener('click', onClick);
        clearChatLink.removeEventListener('keydown', onKeyDown);
      };
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
      const onClick = (e) => {
        e.preventDefault();
        setIsDarkMode(prev => !prev);
      };
      const onKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsDarkMode(prev => !prev);
        }
      };
      darkModeToggle.addEventListener('click', onClick);
      darkModeToggle.addEventListener('keydown', onKeyDown);
      return () => {
        darkModeToggle.removeEventListener('click', onClick);
        darkModeToggle.removeEventListener('keydown', onKeyDown);
      };
    }
  }, []);

  useEffect(() => {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
      darkModeToggle.textContent = isDarkMode ? 'Light mode' : 'Dark mode';
    }
  }, [isDarkMode]);

  useEffect(() => {
    const feedbackLink = document.getElementById('header-feedback-link');
    if (feedbackLink) {
      const onClick = (e) => {
        e.preventDefault();
        openFeedback();
      };
      feedbackLink.addEventListener('click', onClick);
      return () => {
        feedbackLink.removeEventListener('click', onClick);
      };
    }
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

  const handleRecordClick = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }
    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new window.MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = async () => {
        setIsTranscribing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        try {
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          if (data.text) {
            handleInputChange({ target: { value: data.text } });
          }
        } catch (err) {
          alert('Transcription failed.');
        }
        setIsTranscribing(false);
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Could not access microphone.');
    }
  };

  const openFeedback = () => setIsFeedbackOpen(true);
  const closeFeedback = () => {
    setIsFeedbackOpen(false);
    setFeedbackStatus('idle');
    setFeedbackMessage('');
    setFeedbackName('');
    setFeedbackContact('');
    setFeedbackType('positive');
  };
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackStatus('loading');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: feedbackType,
          message: feedbackMessage,
          name: feedbackName,
          contact: feedbackContact,
        }),
      });
      if (res.ok) {
        setFeedbackStatus('success');
      } else {
        setFeedbackStatus('error');
      }
    } catch {
      setFeedbackStatus('error');
    }
  };

  const MicrophoneIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="22" x2="12" y2="16" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );

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

  useEffect(() => {
    // Check for existing session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };
    getSession();
    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Load chat history from Supabase
  useEffect(() => {
    if (!user) return;
    const loadChat = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('chats')
        .select('messages')
        .eq('user_id', user.id)
        .single();
      if (data && data.messages) {
        setMessages(data.messages);
      } else {
        setMessages([]);
      }
      setIsLoading(false);
    };
    loadChat();
  }, [user]);

  // Save chat history to Supabase on message change
  useEffect(() => {
    if (!user) return;
    const saveChat = async () => {
      await supabase.from('chats').upsert({
        user_id: user.id,
        messages,
        updated_at: new Date().toISOString(),
      }, { onConflict: ['user_id'] });
    };
    if (messages.length > 0) saveChat();
  }, [messages, user]);

  // Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMessages([]);
  };

  // Sidebar close on ESC or click outside
  useEffect(() => {
    if (!isSidebarOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') setIsSidebarOpen(false);
    }
    function handleClick(e) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setIsSidebarOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isSidebarOpen]);

  // Fetch all chats for user
  useEffect(() => {
    if (!user) return;
    const fetchChats = async () => {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .eq('deleted', false)
        .order('updated_at', { ascending: false });
      if (data) setChats(data);
    };
    fetchChats();
  }, [user]);

  // Load messages for active chat
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    const chat = chats.find(c => c.id === activeChatId);
    if (chat) setMessages(chat.messages || []);
  }, [activeChatId]);

  // Save chat to Supabase on messages change
  useEffect(() => {
    if (!user || !activeChatId) return;
    const saveChat = async () => {
      const chat = chats.find(c => c.id === activeChatId);
      if (!chat) return;
      const firstPrompt = messages.find(m => m.role === 'user')?.content?.split('\n')[0] || '';
      await supabase.from('chats').update({
        messages,
        updated_at: new Date().toISOString(),
        first_prompt: firstPrompt,
      }).eq('id', activeChatId);
      // Refresh chats
      const { data } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .eq('deleted', false)
        .order('updated_at', { ascending: false });
      if (data) setChats(data);
    };
    if (messages.length > 0) saveChat();
  }, [messages, user, activeChatId]);

  // New Chat handler
  const handleNewChat = async () => {
    const { data, error } = await supabase.from('chats').insert({
      user_id: user.id,
      messages: [],
      first_prompt: '',
    }).select();
    if (data && data[0]) {
      setChats([data[0], ...chats]);
      setActiveChatId(data[0].id);
      setMessages([]);
    }
  };

  // Select chat handler
  const handleSelectChat = (chatId) => {
    setActiveChatId(chatId);
    setIsSidebarOpen(false);
  };

  // Delete chat handler
  const handleDeleteChat = async (chatId) => {
    if (!window.confirm('Delete this chat?')) return;
    await supabase.from('chats').update({ deleted: true }).eq('id', chatId);
    setChats(chats.filter(c => c.id !== chatId));
    if (activeChatId === chatId) {
      setActiveChatId(null);
      setMessages([]);
    }
  };

  // Group chats by date
  const groupChatsByDate = (chats) => {
    const groups = {};
    const now = new Date();
    chats.forEach(chat => {
      const d = new Date(chat.created_at);
      let group = 'Earlier';
      if (d.toDateString() === now.toDateString()) group = 'Today';
      else if (now - d < 7 * 24 * 60 * 60 * 1000) group = 'This Week';
      if (!groups[group]) groups[group] = [];
      groups[group].push(chat);
    });
    return groups;
  };
  const groupedChats = groupChatsByDate(chats);

  // Show AuthForm if not logged in
  if (!user) {
    return <AuthForm onAuth={session => {
      if (session && session.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    }} />;
  }

  return (
    <div className="chatbot">
      {/* Hamburger menu */}
      {!isSidebarOpen && (
        <button
          className="sidebar-hamburger"
          aria-label="Open menu"
          onClick={() => setIsSidebarOpen(open => !open)}
        >
          <span className="hamburger-bar" />
          <span className="hamburger-bar" />
          <span className="hamburger-bar" />
        </button>
      )}

      {/* Sidebar overlay */}
      <div className={`sidebar-overlay${isSidebarOpen ? ' open' : ''}`}></div>
      {/* Sidebar */}
      <nav
        className={`sidebar${isSidebarOpen ? ' open' : ''}`}
        ref={sidebarRef}
        aria-label="Sidebar menu"
        tabIndex="-1"
      >
        <button
          className="sidebar-close"
          aria-label="Close menu"
          onClick={() => setIsSidebarOpen(false)}
        >×</button>
        <div className="sidebar-content">
          {/* User email */}
          <div className="sidebar-email">{user.email}</div>
          <button className="sidebar-item" onClick={handleNewChat} style={{marginTop: '0.5rem', marginBottom: '0.5rem', fontWeight: 600, color: '#800000'}}>+ New Chat</button>
          {/* Chat list grouped by date */}
          {Object.keys(groupedChats).map(group => (
            <div key={group} style={{marginBottom: '1rem'}}>
              <div style={{fontSize: '0.95rem', fontWeight: 600, color: '#888', margin: '0.5rem 0 0.2rem 0'}}>{group}</div>
              {groupedChats[group].map(chat => (
                <div key={chat.id} className={`sidebar-item${activeChatId === chat.id ? ' active' : ''}`} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: activeChatId === chat.id ? '#f5e6e6' : undefined}}>
                  <span style={{flex: 1, cursor: 'pointer'}} onClick={() => handleSelectChat(chat.id)}>
                    {chat.first_prompt ? chat.first_prompt.slice(0, 40) : <em>New chat</em>}
                    <span style={{display: 'block', fontSize: '0.8em', color: '#aaa'}}>{new Date(chat.created_at).toLocaleDateString()}</span>
                  </span>
                  <button onClick={() => handleDeleteChat(chat.id)} style={{background: 'none', border: 'none', color: '#c00', marginLeft: 8, cursor: 'pointer'}} title="Delete chat" aria-label="Delete chat">
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          ))}
          <hr className="sidebar-divider" />
          {/* Feedback and dark mode toggle */}
          <button
            className="sidebar-item"
            onClick={() => {
              setIsSidebarOpen(false);
              openFeedback();
            }}
          >
            Feedback
          </button>
          <button
            id="dark-mode-toggle"
            className="sidebar-item"
            onClick={() => setIsDarkMode(prev => !prev)}
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? 'Light mode' : 'Dark mode'}
          </button>
          <hr className="sidebar-divider" />
          {/* Logout */}
          <button className="sidebar-item sidebar-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      {/* Main content (rest of chat UI) */}
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
                    aria-label={copiedMessageId === m.id ? 'Copied!' : 'Copy message'}
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
                {new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          <button
            type="button"
            onClick={handleRecordClick}
            className={`mic-button ${isRecording ? 'listening' : ''}`}
            title={isRecording ? 'Stop recording' : 'Record voice input'}
            aria-label={isRecording ? 'Stop recording' : 'Record voice input'}
            disabled={isTranscribing}
          >
            <MicrophoneIcon />
          </button>
          <button type="submit" className="send-button">
            Send
          </button>
        </form>
        {isTranscribing && (
          <div className="loading-label">Loading...</div>
        )}
      </div>
      {isFeedbackOpen && (
        <div className="feedback-modal">
          <div className="feedback-modal-content">
            <button className="feedback-modal-close" onClick={closeFeedback} aria-label="Close feedback form">×</button>
            {feedbackStatus === 'success' ? (
              <div className="feedback-thankyou">Thank you for your feedback!</div>
            ) : (
              <form className="feedback-form" onSubmit={handleFeedbackSubmit}>
                <label>
                  Type:
                  <select value={feedbackType} onChange={e => setFeedbackType(e.target.value)}>
                    <option value="positive">Positive</option>
                    <option value="feature">Feature Request</option>
                    <option value="bug">Bug</option>
                  </select>
                </label>
                <label>
                  Message:
                  <textarea value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} required rows={4} />
                </label>
                <label>
                  Name (optional):
                  <input type="text" value={feedbackName} onChange={e => setFeedbackName(e.target.value)} />
                </label>
                <label>
                  Contact (optional):
                  <input type="text" value={feedbackContact} onChange={e => setFeedbackContact(e.target.value)} placeholder="Email or phone" />
                </label>
                <button type="submit" className="send-button" disabled={feedbackStatus==='loading'}>
                  {feedbackStatus==='loading' ? 'Sending...' : 'Send Feedback'}
                </button>
                {feedbackStatus==='error' && <div className="feedback-error">Failed to send. Please try again.</div>}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
