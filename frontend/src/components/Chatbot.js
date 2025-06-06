import React, { useState } from 'react';
import '../styles/Chatbot.css';

import config from '../config';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      content: 'Hello! I\'m the SmartSlide Assistant. I can help answer questions about SmartSlide\'s features and how to use the application. What would you like to know?'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message to chat
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setIsLoading(true);    try {
      const response = await fetch(`${config.API_BASE_URL}/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessages(prev => [...prev, { type: 'bot', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { 
          type: 'bot', 
          content: 'Sorry, I encountered an error. Please try again later.' 
        }]);
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, { 
        type: 'bot', 
        content: 'Sorry, I\'m having trouble connecting right now. Please try again later.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chatbot-container">
      {/* Chatbot Toggle Button */}
      <button 
        className="chatbot-toggle" 
        onClick={() => setIsOpen(!isOpen)}
        title="SmartSlide Assistant"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3.04 1.05 4.35L2 22l5.65-1.05C9.96 21.64 11.46 22 13 22h7c1.1 0 2-.9 2-2V12c0-5.52-4.48-10-10-10z" fill="currentColor"/>
          <circle cx="9" cy="12" r="1" fill="white"/>
          <circle cx="15" cy="12" r="1" fill="white"/>
          <path d="M8 15c.83.83 2.17.83 3 0s2.17-.83 3 0" stroke="white" strokeLinecap="round" strokeWidth="1"/>
        </svg>
      </button>

      {/* Chatbot Window */}
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <h3>SmartSlide Assistant</h3>
            <button 
              className="chatbot-close" 
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </div>
          
          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.type === 'user' ? 'user-message' : 'bot-message'}`}
              >
                <div className="message-content">
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message bot-message">
                <div className="message-content typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>
          
          <div className="chatbot-input">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about SmartSlide..."
              rows="2"
              disabled={isLoading}
            />            <button 
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="send-button"
              title="Send message"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
