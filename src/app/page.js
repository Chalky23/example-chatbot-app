"use client";

import { useChat } from "ai/react";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import { supabase } from '../utils/supabaseClient';
import AuthForm from './auth/AuthForm';
import './page.css';
import { v4 as uuidv4 } from 'uuid';

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const HowToGuide = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="how-to-guide">
      <button 
        className="sidebar-item"
        onClick={() => setIsOpen(!isOpen)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        How to use JackBot
        <span style={{ fontSize: '1.2rem' }}>{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="how-to-content" style={{ padding: '0.5rem 0 0.5rem 1rem' }}>
          <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
            <p>• Type your message in the input field</p>
            <p>• Use the microphone button for voice input</p>
            <p>• Click the copy button to copy responses</p>
            <p>• Create new chats using the + button</p>
            <p>• Switch between dark/light mode</p>
            <p>• Send feedback using the feedback button</p>
          </div>
        </div>
      )}
    </div>
  );
};

const Chat = () => {
  // Initialize all state first
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('positive');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('idle');
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
  
  const sidebarRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chatContainerRef = useRef(null);

  // Auto-scroll function
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Initialize chat hook with basic configuration
  const { messages, input, handleInputChange, handleSubmit, setMessages } = useChat({
    api: '/api/chat',
    initialMessages: [],
    onResponse: async (response) => {
      if (!activeChatId || !user) return;

      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage?.role === 'user') {
        const updatedMessages = [...messages];
        try {
          // Save message and set first_prompt if needed
          let updateFields = {
            messages: updatedMessages,
            updated_at: new Date().toISOString()
          };
          // Always check the database for first_prompt
          const { data: chatData, error: fetchError } = await supabase
            .from('chats')
            .select('first_prompt')
            .eq('id', activeChatId)
            .single();
          if (fetchError) {
            console.error('Error fetching chat for first_prompt:', fetchError);
            return;
          }
          if (!chatData.first_prompt) {
            updateFields.first_prompt = lastUserMessage.content.split('\n')[0] || '';
          }
          const { error } = await supabase
            .from('chats')
            .update(updateFields)
            .eq('id', activeChatId);
          if (error) {
            console.error('Error updating chat with user message:', error);
          }
          // Fetch the updated chat and update local state
          const { data: updatedChat, error: updateFetchError } = await supabase
            .from('chats')
            .select('*')
            .eq('id', activeChatId)
            .single();
          if (!updateFetchError && updatedChat) {
            setChats(prevChats => prevChats.map(c => c.id === activeChatId ? updatedChat : c));
          }
        } catch (err) {
          console.error('Error saving user message:', err);
        }
      }
    },
    onFinish: async (message) => {
      if (!activeChatId || !user) return;
      const updatedMessages = [...messages, { ...message, createdAt: Date.now() }];
      try {
        const { error } = await supabase
          .from('chats')
          .update({
            messages: updatedMessages,
            updated_at: new Date().toISOString()
          })
          .eq('id', activeChatId);
        if (error) {
          console.error('Error updating chat:', error);
        }
        // Fetch the updated chat and update local state
        const { data: updatedChat, error: updateFetchError } = await supabase
          .from('chats')
          .select('*')
          .eq('id', activeChatId)
          .single();
        if (!updateFetchError && updatedChat) {
          setChats(prevChats => prevChats.map(c => c.id === activeChatId ? updatedChat : c));
        }
        scrollToBottom();
      } catch (err) {
        console.error('Error saving chat:', err);
      }
    }
  });

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update header state when messages change
  useEffect(() => {
    setIsHeaderCompact(messages.length > 0);
  }, [messages]);

  // Check for existing session
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
      setIsLoading(false);
    };
    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // Load user's chats
  useEffect(() => {
    if (!user) return;

    const loadChats = async () => {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .eq('deleted', false)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading chats:', error);
        return;
      }

      setChats(data || []);
      if (data && data.length > 0 && !activeChatId) {
        setActiveChatId(data[0].id);
        setMessages(data[0].messages || []);
      }
    };

    loadChats();
  }, [user]);

  // Handle new chat creation
  const handleNewChat = async () => {
    if (!user) return;

    const newId = uuidv4();
    const { data, error } = await supabase
      .from('chats')
      .insert([{
        id: newId,
        user_id: user.id,
        messages: [],
        first_prompt: null,
        title: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating new chat:', error);
      return;
    }

    setChats(prevChats => [data, ...prevChats]);
    setActiveChatId(data.id);
    setMessages([]);
  };

  // Handle chat selection
  const handleSelectChat = async (chatId) => {
    const selectedChat = chats.find(c => c.id === chatId);
    if (selectedChat) {
      setActiveChatId(chatId);
      setMessages(selectedChat.messages || []);
      setIsSidebarOpen(false);
    }
  };

  // Handle chat deletion
  const handleDeleteChat = async (chatId) => {
    if (!window.confirm('Delete this chat?')) return;

    const { error } = await supabase
      .from('chats')
      .update({ deleted: true })
      .eq('id', chatId);

    if (error) {
      console.error('Error deleting chat:', error);
      return;
    }

    setChats(prevChats => prevChats.filter(c => c.id !== chatId));
    if (activeChatId === chatId) {
      const remainingChats = chats.filter(c => c.id !== chatId);
      if (remainingChats.length > 0) {
        setActiveChatId(remainingChats[0].id);
        setMessages(remainingChats[0].messages || []);
      } else {
        setActiveChatId(null);
        setMessages([]);
      }
    }
  };

  // Handle message submission
  const handleMessageSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeChatId) return;
    try {
      await handleSubmit(e);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMessages([]);
    setChats([]);
    setActiveChatId(null);
  };

  // Show AuthForm if not logged in
  if (!user) {
    return <AuthForm onAuth={session => {
      if (session?.user) {
        setUser(session.user);
      }
    }} />;
  }

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

  // Rest of your component JSX...
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
      <div
        className={`sidebar-overlay${isSidebarOpen ? ' open' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
        style={{ cursor: isSidebarOpen ? 'pointer' : 'default' }}
      ></div>
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
          {/* How to guide, Feedback and dark mode toggle */}
          <HowToGuide />
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

      <div className={`header-content ${isHeaderCompact ? 'compact' : ''}`}>
        <Image
          src="/jackbot-img.jpeg"
          className="image"
          width={200}
          height={200}
          alt="jackbot image"
        />
        <h1>{isHeaderCompact ? 'JackBot' : "Hi, I'm JackBot!"}</h1>
      </div>

      <div className="chat-container" ref={chatContainerRef}>
        {isLoading ? (
          <>
            <div className="message skeleton-message">
              <div className="message-content skeleton-content">
                <div className="skeleton-header"></div>
                <div className="skeleton-text"></div>
                <div className="skeleton-text"></div>
                <div className="skeleton-text" style={{ width: '60%' }}></div>
              </div>
            </div>
            <div className="message skeleton-message">
              <div className="message-content skeleton-content">
                <div className="skeleton-header"></div>
                <div className="skeleton-text"></div>
                <div className="skeleton-text"></div>
                <div className="skeleton-text" style={{ width: '60%' }}></div>
              </div>
            </div>
            <div className="message skeleton-message">
              <div className="message-content skeleton-content">
                <div className="skeleton-header"></div>
                <div className="skeleton-text"></div>
                <div className="skeleton-text"></div>
                <div className="skeleton-text" style={{ width: '60%' }}></div>
              </div>
            </div>
          </>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              id={`message-${m.id}`}
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
          ))
        )}
      </div>

      <div className="input-container">
        <form onSubmit={handleMessageSubmit} className="input-form">
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

export default Chat;
