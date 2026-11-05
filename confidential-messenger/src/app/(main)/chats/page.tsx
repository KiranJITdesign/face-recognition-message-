'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  unreadCount: number;
  timestamp: string;
  avatar?: string;
}

export default function ChatsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const shouldReduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setConversations([
          {
            id: 'conv-1',
            name: 'Alex Johnson',
            lastMessage: 'Hey, can we discuss the project tomorrow?',
            unreadCount: 2,
            timestamp: '2024-01-15T14:30:00',
            avatar: 'AJ',
          },
          {
            id: 'conv-2',
            name: 'Sarah Miller',
            lastMessage: 'I have reviewed the document. Looks good!',
            unreadCount: 0,
            timestamp: '2024-01-14T09:15:00',
            avatar: 'SM',
          },
          {
            id: 'conv-3',
            name: 'Project Team',
            lastMessage: 'Meeting notes from yesterdays sync',
            unreadCount: 5,
            timestamp: '2024-01-13T16:45:00',
            avatar: 'PT',
          },
          {
            id: 'conv-4',
            name: 'David Chen',
            lastMessage: 'Thanks for the update!',
            unreadCount: 0,
            timestamp: '2024-01-12T11:20:00',
            avatar: 'DC',
          },
      ]);
      setIsLoading(false);
    }, 350);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewChat = useCallback(() => {
    alert('New chat functionality coming soon!');
  }, []);

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    if (days > 0) return date.toLocaleDateString();
    else if (hours > 0) return `${hours}h ago`;
    else if (minutes > 0) return `${minutes}m ago`;
    else return 'Just now';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900/20 to-cyan-900/10">
      <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">Chats</h1>
              <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 text-xs rounded-full">
                {conversations.length}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-40 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all sm:w-64"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                onClick={handleNewChat}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-cyan-400 text-black font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                New Chat
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-96 gap-4 px-6 text-center">
            <motion.div
              className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
              animate={{ scale: [0.8, 1, 0.8] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            />
            <p className="text-white/60">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <div className="w-24 h-24 rounded-3xl bg-white/5 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-12 h-12 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">
              {searchQuery ? 'No matching conversations' : 'Your inbox is quiet'}
            </h2>
            <p className="text-white/50 text-center">
              {searchQuery
                ? `Try another name or message instead of “${searchQuery}”.`
                : 'Start a new conversation to begin messaging securely.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-cyan-200 transition-colors hover:bg-white/5"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredConversations.map((conv, index) => (
              <motion.div
                key={conv.id}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: shouldReduceMotion ? 0 : index * 0.05, duration: 0.4 }}
                whileHover={shouldReduceMotion ? undefined : { x: 4 }}
              >
                <Link href={`/chats/${conv.id}`} className="block">
                  <div className="p-6 rounded-2xl glass border border-white/10 hover:border-indigo-500/30 hover:bg-white/5 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-black font-bold">
                          {conv.avatar || conv.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold truncate">{conv.name}</h3>
                          <p className="text-white/60 text-sm truncate mt-1">{conv.lastMessage}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {conv.unreadCount > 0 && (
                          <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded-full min-w-[24px] text-center">
                            {conv.unreadCount}
                          </span>
                        )}
                        <span className="text-xs text-white/40 whitespace-nowrap">
                          {formatTime(conv.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
