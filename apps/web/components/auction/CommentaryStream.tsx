'use client';

import type { CommentaryMessage } from '@pulse/shared-types';
import { Megaphone, MessageSquare, ShieldAlert } from 'lucide-react';
import React from 'react';

interface CommentaryStreamProps {
  commentaryList: CommentaryMessage[];
}

export const CommentaryStream: React.FC<CommentaryStreamProps> = ({ commentaryList }) => {
  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[320px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Live Auctioneer Calls
          </h3>
        </div>
        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
          Audio-Tactile Sync
        </span>
      </div>

      <div className="overflow-y-auto flex-1 mt-3 space-y-2 pr-1">
        {commentaryList.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Auctioneer stream ready. Live commentary calls will broadcast here.
          </div>
        ) : (
          commentaryList.map((msg, index) => {
            const timeStr = new Date(msg.timestamp).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={msg.id || `${msg.timestamp}-${index}`}
                className={`p-3 rounded-lg border text-xs space-y-1 ${
                  msg.type === 'ANTI_SNIPE'
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                    : msg.type === 'SOLD'
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50/50 border-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-[10px] uppercase tracking-wider text-slate-500">
                    {msg.type === 'ANTI_SNIPE' ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    <span>{msg.type} CALL</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{timeStr}</span>
                </div>
                <p className="font-medium text-slate-900 leading-snug">{msg.text}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
