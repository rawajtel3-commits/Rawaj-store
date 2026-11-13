import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  ShoppingBag, 
  ExternalLink, 
  HelpCircle,
  Lightbulb,
  Check
} from 'lucide-react';
import { AIMessage, Product } from '../types';
import { LazyImage } from './LazyImage';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct,
  onAddToCart,
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'msg-init',
      sender: 'assistant',
      text: 'مرحباً بك! أنا "مساعد متجر رواج الذكي" المدعوم بنموذج Gemini AI. 🤖✨\n\nكيف يمكنني مساعدتك اليوم؟ يمكنني اقتراح أفضل الحواسيب، مقارنة المواصفات، أو مساعدتك في اختيار هدية مثالية حسب ميزانيتك!',
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages, loading]);

  if (!isOpen) return null;

  const quickPrompts = [
    'اقترح حاسوباً محمولاً للمطورين وبطارية تدوم طويلاً',
    'أبحث عن أفضل ساعة رياضية مقاومة للماء مع تتبع ECG',
    'ما هي أفضل سماعات عزل صوت للمكالمات والسفر؟',
    'اريد جهاز ألعاب بدقة 4K حقيقية ومعدل 120 إطار',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: AIMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
        }),
      });

      const data = await response.json();

      const assistantMsg: AIMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'يسعدني مساعدتك في استكشاف أي خيار داخل المتجر!',
        recommendedProductIds: data.recommendedProductIds || [],
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: 'عذراً، حدث خطأ مؤقت في الاتصال بالمساعد الذكي. يمكنك المحاولة مجدداً.',
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pr-0 sm:pr-10">
        <div className="w-screen max-w-lg bg-slate-900 text-white shadow-2xl flex flex-col border-l border-slate-800">
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-900 to-[#551465]/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#551465]/20 border border-[#551465]/40 flex items-center justify-center text-brand-300">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                  <span>المساعد الذكي (Gemini AI)</span>
                </h2>
                <span className="text-[10px] text-brand-300 font-medium">توصيات مخصصة وبحث ذكي</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Chips */}
          <div className="p-3 bg-slate-950 border-b border-slate-800 overflow-x-auto flex gap-2 scrollbar-none text-xs">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="bg-slate-900 hover:bg-[#551465]/20 text-brand-300 border border-[#551465]/30 px-3 py-1.5 rounded-xl whitespace-nowrap text-[11px] font-medium transition flex items-center gap-1 shrink-0"
              >
                <Lightbulb className="w-3 h-3 text-amber-400" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => {
              const isAssistant = msg.sender === 'assistant';
              const recommendedProducts = (msg.recommendedProductIds || [])
                .map((id) => products.find((p) => p.id === id))
                .filter(Boolean) as Product[];

              return (
                <div key={msg.id} className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
                  {isAssistant && (
                    <div className="w-8 h-8 rounded-xl bg-[#551465]/20 border border-[#551465]/40 flex items-center justify-center text-brand-300 shrink-0 mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] space-y-2 ${isAssistant ? 'text-right' : 'text-right'}`}>
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isAssistant
                          ? 'bg-slate-950 border border-slate-800 text-slate-100 shadow'
                          : 'bg-[#551465] text-white font-medium shadow-md shadow-[#551465]/20 border border-brand-500/30'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      <span className={`text-[9px] block mt-1.5 ${isAssistant ? 'text-slate-500' : 'text-brand-200 font-bold'}`}>
                        {msg.timestamp}
                      </span>
                    </div>

                    {/* Interactive Recommended Product Cards */}
                    {recommendedProducts.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] text-brand-300 font-bold block">
                          🛍️ المنتجات الموصى بها لك:
                        </span>
                        <div className="space-y-2">
                          {recommendedProducts.map((product) => (
                            <div
                              key={product.id}
                              className="bg-slate-950 p-2.5 rounded-xl border border-[#551465]/40 flex items-center justify-between gap-3 hover:border-[#551465] transition"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <LazyImage
                                  src={product.images[0]}
                                  alt={product.name}
                                  sizeHint="thumb"
                                  wrapperClassName="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 shrink-0"
                                  className="w-full h-full object-cover"
                                />
                                <div className="truncate">
                                  <h5 
                                    onClick={() => onSelectProduct(product)}
                                    className="text-xs font-bold text-white hover:text-brand-300 cursor-pointer truncate"
                                  >
                                    {product.name}
                                  </h5>
                                  <span className="text-xs text-brand-300 font-extrabold">
                                    {product.price.toLocaleString()} ر.س
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => onSelectProduct(product)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                  title="عرض التفاصيل"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onAddToCart(product)}
                                  className="p-1.5 rounded-lg bg-[#551465] hover:bg-brand-700 text-white font-bold text-xs flex items-center gap-1 shadow border border-brand-500/30"
                                >
                                  <ShoppingBag className="w-3.5 h-3.5 text-brand-200" />
                                  <span>سلة</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {!isAssistant && (
                    <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl bg-[#551465]/20 border border-[#551465]/40 flex items-center justify-center text-brand-300 shrink-0">
                  <Bot className="w-4 h-4 animate-bounce" />
                </div>
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
                  <span>يقوم Gemini AI بتحليل الاستفسار وتجهيز أفضل التوصيات...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="اكتب استفسارك للمساعد الذكي..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#551465]"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  inputMessage.trim() && !loading
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
    </div>
  );
};
