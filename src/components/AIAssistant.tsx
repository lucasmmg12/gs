import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Sparkles, Bot, User, ChevronDown } from 'lucide-react';
import type { Client } from '../data/mockData';

interface AIAssistantProps {
  activeTab: string;
  selectedClient?: Client;
  userRole?: 'consultor' | 'cliente';
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ activeTab, selectedClient, userRole = 'consultor' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: userRole === 'consultor' 
        ? '¡Hola! Soy tu asistente de Estudio GS. Estoy analizando la realidad operativa de tus clientes. ¿En qué te ayudo hoy?'
        : '¡Hola! Soy el asistente IA de Estudio GS. Estoy monitoreando tus procesos. ¿Tienes alguna duda sobre tu avance?',
      timestamp: new Date()
    }
  ]);

  // Reset messages when role changes
  useEffect(() => {
    setMessages([
      {
        id: Date.now().toString(),
        sender: 'ai',
        text: userRole === 'consultor' 
          ? '¡Hola! Soy tu asistente de Estudio GS. Estoy analizando la realidad operativa de tus clientes. ¿En qué te ayudo hoy?'
          : '¡Hola! Soy el asistente IA de Estudio GS. Estoy monitoreando tus procesos. ¿Tienes alguna duda sobre tu avance?',
        timestamp: new Date()
      }
    ]);
  }, [userRole]);

  // Context-aware greeting logic
  useEffect(() => {
    let contextMessage = '';
    
    if (activeTab === 'clientes' && selectedClient) {
      contextMessage = `Veo que estás analizando a ${selectedClient.name}. Su nivel de adherencia a la realidad es del ${selectedClient.metrics.realityAdherence}%. ¿Quieres que te resuma sus principales bloqueos?`;
    } else if (activeTab === 'reuniones') {
      contextMessage = 'Estás en Reuniones de Gabinete. Sube un audio y extraeré automáticamente la "Fotografía de la Realidad Actual" y las tareas clave.';
    } else if (activeTab === 'diagnostico') {
      contextMessage = 'Este es el Diagnóstico de la Realidad. Si lo deseas, puedo cruzar estos datos con el Pentágono del Orden para detectar anomalías.';
    }

    if (contextMessage) {
      setShowNotification(true);
      if (!messages.find(m => m.text === contextMessage)) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'ai',
          text: contextMessage,
          timestamp: new Date()
        }]);
      }
    }
  }, [activeTab, selectedClient]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMsg = inputValue;
    setInputValue('');
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'user',
      text: userMsg,
      timestamp: new Date()
    }]);

    setIsTyping(true);

    // Simulate AI response based on context
    setTimeout(() => {
      setIsTyping(false);
      let aiResponse = 'Esa es una excelente observación. Analizaré la matriz operativa para integrarlo en nuestra próxima Intervención de Praxis.';
      
      if (userMsg.toLowerCase().includes('resumen') && selectedClient) {
        aiResponse = `Claro. El bloqueo principal de ${selectedClient.name} actualmente es "${selectedClient.intervenciones[0]?.linkedProblem}". Te sugiero priorizar la intervención de ${selectedClient.intervenciones[0]?.topic}.`;
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'ai',
        text: aiResponse,
        timestamp: new Date()
      }]);
    }, 1500);
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setShowNotification(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* Chat Window */}
      <div 
        className={`bg-white/95 backdrop-blur-xl border border-gray-200/60 shadow-2xl rounded-2xl w-80 sm:w-96 mb-4 transition-all duration-500 origin-bottom-right overflow-hidden flex flex-col
          ${isOpen ? 'scale-100 opacity-100 h-[500px]' : 'scale-0 opacity-0 h-0'}
        `}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-black p-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="bg-gradient-to-tr from-red-600 to-red-400 p-2 rounded-full shadow-lg shadow-red-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full"></span>
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide">Estudio GS AI</h3>
              <p className="text-[10px] text-gray-400 font-medium">Pedagogía de la Realidad</p>
            </div>
          </div>
          <button 
            onClick={toggleChat}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 scroll-smooth">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm
                ${msg.sender === 'user' ? 'bg-gray-200' : 'bg-red-100 text-red-600'}`}>
                {msg.sender === 'user' ? <User className="w-4 h-4 text-gray-600" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed max-w-[80%] shadow-sm
                ${msg.sender === 'user' 
                  ? 'bg-black text-white rounded-tr-none' 
                  : 'bg-white border border-gray-100 text-gray-700 rounded-tl-none'}`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3 flex-row items-center">
              <div className="shrink-0 w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-gray-100 shrink-0">
          <div className="relative flex items-center">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Pregúntame sobre este cliente..."
              className="w-full bg-gray-50 border border-gray-200 text-sm rounded-full py-3 pl-4 pr-12 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
            />
            <button 
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="absolute right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Button Notification */}
      {!isOpen && showNotification && (
        <div className="absolute bottom-20 right-0 bg-black text-white text-xs font-semibold px-4 py-2.5 rounded-2xl rounded-br-none shadow-xl mb-2 animate-bounce border border-gray-800 flex items-center gap-2 whitespace-nowrap">
          <Sparkles className="w-3 h-3 text-red-400" /> ¡Tengo información sobre esto!
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={toggleChat}
        className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 hover:scale-110 relative
          ${isOpen ? 'bg-gray-900 rotate-90' : 'bg-gradient-to-r from-red-600 to-red-800 hover:shadow-red-600/50'}
        `}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        {!isOpen && showNotification && (
          <span className="absolute top-0 right-0 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
          </span>
        )}
      </button>

    </div>
  );
};
