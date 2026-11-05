'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/chats');
  }, [router]);
  return <div className="min-h-screen flex items-center justify-center text-white">Redirecting...</div>;
}
