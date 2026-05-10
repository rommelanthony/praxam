'use client';
import { useEffect, useState } from 'react';
import UsernameModal from '@/components/UsernameModal';
import { XpToastManager } from '@/components/XpToast';
export default function GamificationShell({ children, email, initialUsername }: { children: React.ReactNode; email: string; initialUsername: string | null; }) {
  const [username, setUsername] = useState<string | null>(initialUsername);
  const [showModal, setShowModal] = useState(false);
  useEffect(() => {
    if (!username) { const t = setTimeout(() => setShowModal(true), 800); return () => clearTimeout(t); }
  }, [username]);
  return (<>{children}{showModal && <UsernameModal email={email} onComplete={u => { setUsername(u); setShowModal(false); }} />}<XpToastManager /></>);
}
