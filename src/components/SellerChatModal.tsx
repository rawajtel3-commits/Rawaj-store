import React, { useState } from 'react';
import { 
  X, 
  MessageSquareText, 
  Send, 
  UserCheck, 
  ShieldCheck, 
  Truck, 
  Tag, 
  CheckCheck,
  Package
} from 'lucide-react';
import { SellerChatMessage, Product } from '../types';

interface SellerChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachedProduct?: Product | null;
  messages: SellerChatMessage[];
  onSendMessage: (text: string, productId?: string) => void;
}

export const SellerChatModal: React.FC<SellerChatModalProps> = ({
  isOpen,
  onClose,
  attachedProduct,
  messages,
  onSendMessage,
}) => {
  const [input, setInput] = useState('');

  if (!isOpen) return null;

  const quickInquiries = [
    'متى موعد التوصيل للمكلا أو صنعاء أو عدن؟',
    'هل يتوفر ضمان محلي معتمد مع الجهاز؟',
    'هل هناك خصم للكميات والجملة؟',
    'ما هي سياسة الاسترجاع والاستبدال؟',
  ];

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;
    onSendMessage(text, attachedProduct?.id);
    setInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full h-[600px] shadow-2xl flex flex-col overflow-hidden my-auto relative">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-[#551465]/20 border border-[#551465]/40 flex items-center justify-center text-brand-300">
                <UserCheck className="w-5 h-5" />
              </div>
              <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950 absolute -bottom-0.5 -right-0.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>فريق مبيعات متجر رواج</span>
                <span className="text-[10px] bg-[#551465]/20 text-brand-300 px-1.5 py-0.5 rounded border border-[#551465]/40 font-bold">متصل الآن</span>
              </h3>
              <span className="text-[11px] text-slate-400">متوسط وقت الرد: خلال 2 دقيقة</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Attached product info if available */}
        {attachedProduct && (
          <div className="bg-[#551465]/30 p-2.5 px-4 border-b border-[#551465]/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <Package className="w-4 h-4 text-brand-300" />
              <span className="text-slate-300">تستفسر عن: </span>
              <span className="font-bold text-white truncate">{attachedProduct.name}</span>
            </div>
            <span className="text-brand-300 font-extrabold shrink-0">{attachedProduct.price} ر.س</span>
          </div>
        )}

        {/* Quick Question Buttons */}
        <div className="p-2.5 bg-slate-950/60 border-b border-slate-800 overflow-x-auto flex gap-2 scrollbar-none text-xs">
          {quickInquiries.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              className="bg-slate-800 hover:bg-[#551465]/20 text-brand-300 border border-slate-700 hover:border-[#551465]/50 px-3 py-1 rounded-lg text-[11px] whitespace-nowrap transition"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed space-y-1 ${
                    isUser
                      ? 'bg-[#551465] text-white rounded-tl-none shadow-md border border-brand-500/30'
                      : 'bg-slate-950 border border-slate-800 text-slate-100 rounded-tr-none'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-75 mb-1">
                    <span className="font-bold">{msg.senderName}</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="p-3 bg-slate-950 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب استفسارك المباشر للبائع..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#551465]"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                input.trim()
                  ? 'bg-[#551465] hover:bg-brand-700 text-white shadow-md shadow-[#551465]/20 border border-brand-500/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>إرسال</span>
              <Send className="w-3.5 h-3.5 rotate-180 text-brand-200" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
