'use client';
import { useParams } from 'next/navigation';

export default function ChatPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  
  return (
    <div className="min-h-screen bg-slate-900">
      <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold text-white">Chat: {conversationId}</h2>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="text-white text-center py-20">
          <p>End-to-end encrypted chat with {conversationId}</p>
        </div>
      </main>
    </div>
  );
}
