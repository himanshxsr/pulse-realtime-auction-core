'use client';

import { Award, FileText, Lock, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';

interface AssetDrawerProps {
  title: string;
  description: string;
}

export const AssetDrawer: React.FC<AssetDrawerProps> = ({ title, description }) => {
  const [activeTab, setActiveTab] = useState<'specs' | 'provenance' | 'escrow'>('specs');

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="border-b border-slate-200 pb-3 flex items-center gap-6">
        <button
          onClick={() => setActiveTab('specs')}
          className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'specs'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            <span>Lot Specifications</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('provenance')}
          className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'provenance'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4" />
            <span>Hologram Provenance</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('escrow')}
          className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'escrow'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Escrow & Transfer</span>
          </div>
        </button>
      </div>

      <div className="pt-1 text-sm text-slate-700">
        {activeTab === 'specs' && (
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-base">{title}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Asset Condition
                </span>
                <span className="font-bold text-emerald-600">Match Used (Grade A+)</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Authentication
                </span>
                <span className="font-bold text-slate-900">Physical Hologram</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Chain of Custody
                </span>
                <span className="font-bold text-slate-900">Direct Player Deposit</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Vault Security
                </span>
                <span className="font-bold text-blue-600">Climate Sealed</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'provenance' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-lg font-medium">
              <Award className="w-5 h-5 flex-shrink-0 text-emerald-600" />
              <span>
                Cryptographically Signed & Tamper-Evident Physical Holographic Verification #VK-2016-9734.
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Every asset in the Pulse Live Catalog undergoes multi-layer spectroscopic inspection, photographic alignment matching, and direct player authentication records.
            </p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700">
              Certificate SHA-256 Digest: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
            </div>
          </div>
        )}

        {activeTab === 'escrow' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2 text-blue-700 bg-blue-50 border border-blue-200 p-3 rounded-lg font-medium">
              <Lock className="w-5 h-5 flex-shrink-0 text-blue-600" />
              <span>
                Institutional Escrow Guarantee: Winning funds remain locked until delivery verification.
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Upon auction expiration, the winning bid is automatically logged into the PostgreSQL 16 immutable audit ledger. High-value physical delivery is executed via armored climate-controlled transit within 48 hours.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
