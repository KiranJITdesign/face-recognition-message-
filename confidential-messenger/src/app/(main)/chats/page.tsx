'use client';
import Link from 'next/link';

export default function ChatsPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Chats</h1>
          <Link href="/chats/new" className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-cyan-400 text-black font-semibold rounded-xl">
            New Chat
          </Link>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="text-white text-center py-20">
          <h2 className="text-2xl mb-4">Welcome to Confidential Messenger</h2>
          <p className="text-slate-400">End-to-end encrypted messaging with passkey authentication</p>
        </div>
      </main>
    </div>
  );
}
