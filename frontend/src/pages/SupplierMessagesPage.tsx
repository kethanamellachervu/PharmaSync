import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Building2,
  CheckCircle2,
  Clock,
  Bot,
  User,
  Package,
  Calendar,
  IndianRupee,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { apiService } from '../services/api';
import { SupplierConversation, SupplierMessage } from '../types';

export const SupplierMessagesPage: React.FC = () => {
  const [conversations, setConversations] = useState<SupplierConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupplierMessage[]>([]);
  const [activeConv, setActiveConv] = useState<SupplierConversation | null>(null);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const list = await apiService.getSupplierConversations();
      setConversations(list);
      if (list.length > 0 && !selectedConvId) {
        setSelectedConvId(list[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load supplier conversations:', err);
    } finally {
      setLoadingConvs(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    setLoadingMessages(true);
    try {
      const res = await apiService.getSupplierConversationById(convId);
      setActiveConv(res.conversation);
      setMessages(res.messages);
    } catch (err: any) {
      console.error('Failed to load messages for conversation:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConvId) {
      fetchMessages(selectedConvId);
    }
  }, [selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || messageInput).trim();
    if (!text || !selectedConvId) return;

    setSending(true);
    try {
      const res = await apiService.sendSupplierMessage(selectedConvId, text, 'supplier');
      setActiveConv(res.conversation);
      setMessages(res.messages);
      setMessageInput('');
      await fetchConversations();
    } catch (err: any) {
      alert(err.message || 'Failed to send supplier message.');
    } finally {
      setSending(false);
    }
  };

  const presetResponses = [
    `Yes, ${activeConv?.requestedQuantity || 132} units are available at ₹4.50 per unit. We can deliver in 2 days.`,
    'We have stock available.',
    `100 units available.`,
    `Unit price is ₹5.00 per unit, delivery in 1 day.`,
  ];

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ORDER_SENT':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
            <Send className="w-3.5 h-3.5 text-blue-600" /> ORDER SENT
          </span>
        );
      case 'SUPPLIER_RESPONDED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> AWAITING CONFIRMATION
          </span>
        );
      case 'ORDER_CONFIRMED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ORDER CONFIRMED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#087F5B] text-white flex items-center justify-center font-bold shadow-xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Supplier Communication</h1>
            <p className="text-xs text-gray-500">
              Interactive B2B messaging hub between PharmaSync AI Procurement Assistant and Distributors.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            fetchConversations();
            if (selectedConvId) fetchMessages(selectedConvId);
          }}
          className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Chats
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Left Sidebar: Supplier Conversations List */}
        <div className="lg:col-span-4 border-r border-gray-200 flex flex-col min-h-0 bg-slate-50/50">
          <div className="p-4 border-b border-gray-200 bg-white">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Supplier Chats</h2>
            <p className="text-xs text-gray-500">Active purchase order threads</p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loadingConvs ? (
              <div className="p-8 text-center text-gray-400">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Loading conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="font-semibold text-gray-600">No active conversations</p>
                <p className="mt-1">Approve purchase requests in Admin Dashboard to start supplier ordering.</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full p-4 text-left transition-colors flex items-start gap-3 ${
                      isSelected ? 'bg-emerald-50/80 border-l-4 border-[#087F5B]' : 'hover:bg-gray-100/60'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-[#087F5B] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-sm font-bold text-gray-900 truncate">{conv.supplierName}</h3>
                        <span className="font-mono text-[10px] font-semibold text-gray-500 shrink-0">{conv.orderNumber}</span>
                      </div>
                      <p className="text-xs font-medium text-gray-700 truncate mt-0.5">
                        {conv.medicineName} — <span className="font-bold text-[#087F5B]">{conv.requestedQuantity} units</span>
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        {getStatusBadge(conv.status)}
                        <span className="text-[10px] text-gray-400">
                          {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Conversation & Message Stream */}
        <div className="lg:col-span-8 flex flex-col min-h-0 bg-white">
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-base font-bold text-gray-700">Select a Supplier Chat</p>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                Choose a conversation from the sidebar to view order details and simulate supplier responses.
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#087F5B] text-white flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      {activeConv.supplierName}
                      <span className="font-mono text-xs font-semibold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                        {activeConv.orderNumber}
                      </span>
                    </h2>
                    <p className="text-xs text-gray-500">
                      Reorder Item: <span className="font-bold text-gray-800">{activeConv.medicineName}</span> ({activeConv.requestedQuantity} units)
                    </p>
                  </div>
                </div>

                <div>{getStatusBadge(activeConv.status)}</div>
              </div>

              {/* Order Confirmation Banner Box */}
              {activeConv.extractedData && (
                <div className="mx-4 mt-3 p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 shadow-2xs text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-gray-500 block text-[11px] font-medium uppercase tracking-wider flex items-center gap-1">
                      <Package className="w-3.5 h-3.5 text-[#087F5B]" /> Quantity
                    </span>
                    <span className="font-bold text-gray-900 text-sm">
                      {activeConv.extractedData.availableQuantity || activeConv.requestedQuantity} units
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px] font-medium uppercase tracking-wider flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5 text-[#087F5B]" /> Unit Price
                    </span>
                    <span className="font-bold text-gray-900 text-sm">
                      {activeConv.extractedData.unitPrice ? `₹${activeConv.extractedData.unitPrice.toFixed(2)}` : 'Pending'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px] font-medium uppercase tracking-wider flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5 text-[#087F5B]" /> Total
                    </span>
                    <span className="font-bold text-[#087F5B] text-sm">
                      {activeConv.extractedData.totalPrice ? `₹${activeConv.extractedData.totalPrice.toFixed(2)}` : 'Pending'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px] font-medium uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#087F5B]" /> Expected Delivery
                    </span>
                    <span className="font-semibold text-gray-800 text-sm">
                      {activeConv.extractedData.expectedDelivery || 'Pending Confirmation'}
                    </span>
                  </div>
                </div>
              )}

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                {loadingMessages ? (
                  <div className="p-8 text-center text-gray-400">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs">Loading messages...</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAI = msg.senderType === 'ai';
                    const isSummary = msg.messageType === 'confirmation_summary';

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 max-w-2xl ${isAI ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isAI
                              ? 'bg-[#087F5B] text-white shadow-xs'
                              : 'bg-slate-800 text-white'
                          }`}
                        >
                          {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>

                        {/* Message Content Bubble */}
                        <div className="space-y-1">
                          <div className={`flex items-center gap-2 ${isAI ? '' : 'justify-end'}`}>
                            <span className="text-[11px] font-bold text-gray-700">
                              {isAI ? 'PharmaSync AI Assistant' : activeConv.supplierName}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div
                            className={`p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-line shadow-2xs ${
                              isSummary
                                ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white font-mono font-medium rounded-tl-xs border border-emerald-600'
                                : isAI
                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-tl-xs'
                                : 'bg-slate-900 text-white rounded-tr-xs'
                            }`}
                          >
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Preset Response Chips for Prototype Testing */}
              <div className="px-4 py-2 bg-slate-100/70 border-t border-gray-200 flex items-center gap-2 overflow-x-auto shrink-0">
                <span className="text-[11px] font-bold text-gray-500 shrink-0 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Test Responses:
                </span>
                {presetResponses.map((preset, idx) => (
                  <button
                    key={idx}
                    disabled={sending}
                    onClick={() => handleSendMessage(preset)}
                    className="px-2.5 py-1 rounded-full bg-white hover:bg-emerald-50 text-gray-700 hover:text-[#087F5B] text-[11px] font-medium border border-gray-200 hover:border-emerald-300 shrink-0 transition-colors shadow-2xs"
                  >
                    "{preset.length > 35 ? preset.substring(0, 35) + '...' : preset}"
                  </button>
                ))}
              </div>

              {/* Message Input Box */}
              <div className="p-3 border-t border-gray-200 bg-white shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type supplier message (e.g. Yes, 132 units available at ₹4.50, delivery in 2 days)..."
                    className="flex-1 text-xs p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#087F5B] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || !messageInput.trim()}
                    className="px-4 py-3 rounded-xl bg-[#087F5B] hover:bg-[#06684a] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" /> Send
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierMessagesPage;
