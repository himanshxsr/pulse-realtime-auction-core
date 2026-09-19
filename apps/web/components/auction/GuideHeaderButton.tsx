'use client';

import { RecruiterGuideModal } from '@/components/auction/RecruiterGuideModal';
import { HelpCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export function GuideHeaderButton() {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const hasSeen = localStorage.getItem('pulse_guide_seen');
      if (!hasSeen) {
        setIsModalOpen(true);
      }
    } catch (err) {
      console.warn('LocalStorage access error:', err);
    }
  }, []);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-sm"
        title="Open Live Engine Testing Guide"
      >
        <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
        <span>Guide</span>
      </button>

      <RecruiterGuideModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
