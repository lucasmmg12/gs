import React, { useState, useEffect, useRef } from 'react';
import { X, Phone, Video, MoreVertical, Send, Paperclip, Smile, Check, CheckCheck } from 'lucide-react';
import type { Client } from '../data/mockData';

interface WhatsAppDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
}

interface ChatMessage {
  id: string;
  text: string;
  sender: 'me' | 'client';
  time: string;
  status: 'sent' | 'delivered' | 'read';
}

export const WhatsAppDrawer: React.FC<WhatsAppDrawerProps> = ({ isOpen, onClose, client }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: `Hola ${client.contact.ceo.split(' ')[0]}, ¿cómo va todo con la implementación de los nuevos procesos?`,
      sender: 'me',
      time: '09:41',
      status: 'read'
    },
    {
      id: '2',
      text: '¡Hola! Todo muy bien. Justo estábamos revisando la estructura de costos que definimos en la última tutoría.',
      sender: 'client',
      time: '10:05',
      status: 'read'
    },
    {
      id: '3',
      text: 'Perfecto. Recuerda que cualquier duda con el Excel me puedes escribir por aquí.',
      sender: 'me',
      time: '10:12',
      status: 'read'
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const handleSend = () => {
    if (!message.trim()) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      text: message,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    setMessages(prev => [...prev, newMsg]);
    setMessage('');

    // Simulate status update
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, status: 'delivered' } : m));
    }, 1000);

    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, status: 'read' } : m));
    }, 2500);
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity"
          onClick={onClose}
        ></div>
      )}

      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-full sm:w-[400px] bg-[#EFEAE2] shadow-2xl z-50 transform transition-transform duration-500 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* WhatsApp Header */}
        <div className="bg-[#00A884] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
                {client.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight">{client.name}</h3>
                <p className="text-xs text-white/80">{client.contact.ceo}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Video className="w-5 h-5 cursor-pointer hover:text-white/80" />
            <Phone className="w-5 h-5 cursor-pointer hover:text-white/80" />
            <MoreVertical className="w-5 h-5 cursor-pointer hover:text-white/80" />
          </div>
        </div>

        {/* WhatsApp Background Pattern */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")', backgroundSize: '400px' }}></div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 z-10">
          <div className="flex justify-center mb-6">
            <span className="bg-white/90 text-gray-500 text-xs px-3 py-1 rounded-lg shadow-sm">Hoy</span>
          </div>

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] rounded-lg px-3 py-1.5 shadow-sm relative ${
                  msg.sender === 'me' 
                    ? 'bg-[#D9FDD3] rounded-tr-none' 
                    : 'bg-white rounded-tl-none'
                }`}
              >
                <p className="text-sm text-gray-800 pr-10">{msg.text}</p>
                <div className="absolute bottom-1 right-2 flex items-center gap-1">
                  <span className="text-[10px] text-gray-500">{msg.time}</span>
                  {msg.sender === 'me' && (
                    <span className="text-gray-400">
                      {msg.status === 'sent' && <Check className="w-3 h-3" />}
                      {msg.status === 'delivered' && <CheckCheck className="w-3 h-3" />}
                      {msg.status === 'read' && <CheckCheck className="w-3 h-3 text-[#53bdeb]" />}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-[#f0f2f5] px-4 py-3 flex items-center gap-3 shrink-0 z-10">
          <button className="text-gray-500 hover:text-gray-700 transition-colors">
            <Smile className="w-6 h-6" />
          </button>
          <button className="text-gray-500 hover:text-gray-700 transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          
          <div className="flex-1 bg-white rounded-lg flex items-center shadow-sm">
            <input 
              type="text" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Escribe un mensaje"
              className="w-full bg-transparent px-4 py-2.5 text-sm focus:outline-none"
            />
          </div>

          <button 
            onClick={handleSend}
            disabled={!message.trim()}
            className={`transition-colors p-2 rounded-full ${message.trim() ? 'bg-[#00A884] text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      </div>
    </>
  );
};
