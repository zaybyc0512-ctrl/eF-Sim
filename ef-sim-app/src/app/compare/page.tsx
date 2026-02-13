'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Search, X, Layers } from 'lucide-react';

const STAT_GROUPS = [
    {
        title: '攻撃', items: [
            { label: 'オフェンスセンス', key: 'offensive_awareness' },
            { label: 'ボールコントロール', key: 'ball_control' },
            { label: 'ドリブル', key: 'dribbling' },
            { label: 'ボールキープ', key: 'tight_possession' },
            { label: 'グラウンダーパス', key: 'low_pass' },
            { label: 'フライパス', key: 'loft_pass' },
            { label: '決定力', key: 'finishing' },
            { label: 'ヘディング', key: 'heading' },
            { label: 'プレースキック', key: 'place_kicking' },
            { label: 'カーブ', key: 'curl' },
        ]
    },
    {
        title: '守備', items: [
            { label: 'ディフェンスセンス', key: 'defensive_awareness' },
            { label: 'ボール奪取', key: 'tackling' },
            { label: 'アグレッシブネス', key: 'aggression' },
            { label: '守備意識', key: 'defensive_engagement' },
        ]
    },
    {
        title: 'フィジカル', items: [
            { label: 'スピード', key: 'speed' },
            { label: '瞬発力', key: 'acceleration' },
            { label: 'キック力', key: 'kicking_power' },
            { label: 'ジャンプ', key: 'jump' },
            { label: 'フィジカルコンタクト', key: 'physical_contact' },
            { label: 'ボディコントロール', key: 'balance' },
            { label: 'スタミナ', key: 'stamina' },
        ]
    },
    {
        title: 'GK', items: [
            { label: 'GKセンス', key: 'gk_awareness' },
            { label: 'キャッチング', key: 'gk_catching' },
            { label: 'クリアリング', key: 'gk_clearing' },
            { label: 'コラプシング', key: 'gk_reflexes' },
            { label: 'ディフレクティング', key: 'gk_reach' },
        ]
    },
];

export default function ComparePage() {
    const [playerA, setPlayerA] = useState<any>(null);
    const [playerB, setPlayerB] = useState<any>(null);
    const [searchQueryA, setSearchQueryA] = useState('');
    const [searchQueryB, setSearchQueryB] = useState('');
    const [candidatesA, setCandidatesA] = useState<any[]>([]);
    const [candidatesB, setCandidatesB] = useState<any[]>([]);

    // Search Logic
    const handleSearch = async (query: string, setCandidates: (c: any[]) => void) => {
        if (!query) {
            setCandidates([]);
            return;
        }
        const { data } = await supabase.from('players').select('*').ilike('name', `%${query}%`).limit(5);
        if (data) setCandidates(data);
    };

    useEffect(() => {
        const timeout = setTimeout(() => handleSearch(searchQueryA, setCandidatesA), 300);
        return () => clearTimeout(timeout);
    }, [searchQueryA]);

    useEffect(() => {
        const timeout = setTimeout(() => handleSearch(searchQueryB, setCandidatesB), 300);
        return () => clearTimeout(timeout);
    }, [searchQueryB]);

    return (
        <div className="min-h-screen bg-gray-100 font-sans pb-20">
            {/* Header */}
            <header className="bg-white shadow-sm border-b sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </Link>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-purple-600" />
                            Compare Players
                        </h1>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-2 sm:px-4 py-8">
                {/* Search / Select Area */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    {/* Player A Search */}
                    <div className="relative">
                        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
                            <Search className="w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Select Player A..."
                                className="flex-1 outline-none text-sm font-bold"
                                value={searchQueryA}
                                onChange={(e) => setSearchQueryA(e.target.value)}
                            />
                            {playerA && <button onClick={() => { setPlayerA(null); setSearchQueryA(''); }}><X className="w-4 h-4 text-gray-400 hover:text-red-500" /></button>}
                        </div>
                        {candidatesA.length > 0 && !playerA && (
                            <div className="absolute top-full left-0 right-0 bg-white border shadow-lg mt-1 rounded-lg z-20 max-h-60 overflow-y-auto">
                                {candidatesA.map(p => (
                                    <div key={p.id} onClick={() => { setPlayerA(p); setCandidatesA([]); setSearchQueryA(p.name); }} className="p-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2 border-b last:border-0">
                                        <img src={p.evidence_url} className="w-8 h-8 object-contain bg-gray-100 rounded" />
                                        <span className="text-sm font-bold">{p.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {playerA && (
                            <div className="mt-2 flex flex-col items-center">
                                <img src={playerA.evidence_url} className="w-24 h-24 object-contain" />
                                <h3 className="font-bold text-lg mt-1">{playerA.name}</h3>
                            </div>
                        )}
                    </div>

                    {/* Player B Search */}
                    <div className="relative">
                        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-red-500">
                            <Search className="w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Select Player B..."
                                className="flex-1 outline-none text-sm font-bold"
                                value={searchQueryB}
                                onChange={(e) => setSearchQueryB(e.target.value)}
                            />
                            {playerB && <button onClick={() => { setPlayerB(null); setSearchQueryB(''); }}><X className="w-4 h-4 text-gray-400 hover:text-red-500" /></button>}
                        </div>
                        {candidatesB.length > 0 && !playerB && (
                            <div className="absolute top-full left-0 right-0 bg-white border shadow-lg mt-1 rounded-lg z-20 max-h-60 overflow-y-auto">
                                {candidatesB.map(p => (
                                    <div key={p.id} onClick={() => { setPlayerB(p); setCandidatesB([]); setSearchQueryB(p.name); }} className="p-2 hover:bg-red-50 cursor-pointer flex items-center gap-2 border-b last:border-0">
                                        <img src={p.evidence_url} className="w-8 h-8 object-contain bg-gray-100 rounded" />
                                        <span className="text-sm font-bold">{p.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {playerB && (
                            <div className="mt-2 flex flex-col items-center">
                                <img src={playerB.evidence_url} className="w-24 h-24 object-contain" />
                                <h3 className="font-bold text-lg mt-1">{playerB.name}</h3>
                            </div>
                        )}
                    </div>
                </div>

                {/* Comparison Table */}
                {playerA && playerB && (
                    <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
                        <div className="flex bg-gray-100 font-bold text-gray-500 text-xs uppercase tracking-wider py-2 border-b">
                            <div className="flex-1 text-center text-blue-600">{playerA.name}</div>
                            <div className="w-32 text-center">Stat</div>
                            <div className="flex-1 text-center text-red-600">{playerB.name}</div>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {STAT_GROUPS.map(group => (
                                <div key={group.title}>
                                    <div className="bg-gray-50 p-2 text-center text-xs font-bold text-gray-400 sticky top-0">
                                        {group.title}
                                    </div>
                                    {group.items.map(item => {
                                        const valA = playerA[item.key] || 0;
                                        const valB = playerB[item.key] || 0;
                                        const diff = valA - valB;

                                        // Colors
                                        // A: If A > B (Win), +Diff (Lime). Else -Diff (Red)
                                        // B: If B > A (Win), +Diff (Lime) on right. Else -Diff (Red) on right.

                                        return (
                                            <div key={item.key} className="flex items-center py-2 hover:bg-gray-50 transition">
                                                {/* Player A Cell */}
                                                <div className="flex-1 flex justify-center items-center gap-2 border-r border-dashed border-gray-200">
                                                    {diff !== 0 && (
                                                        <span className={`text-xs font-bold ${diff > 0 ? 'text-lime-600' : 'text-red-500'}`}>
                                                            {diff > 0 ? `+${diff}` : diff}
                                                        </span>
                                                    )}
                                                    <span className={`text-lg font-mono font-bold ${diff > 0 ? 'text-lime-600' : (diff < 0 ? 'text-red-500' : 'text-gray-700')}`}>
                                                        {valA}
                                                    </span>
                                                </div>

                                                {/* Label */}
                                                <div className="w-32 text-center text-xs font-bold text-gray-500 truncate px-1">
                                                    {item.label}
                                                </div>

                                                {/* Player B Cell */}
                                                <div className="flex-1 flex justify-center items-center gap-2 border-l border-dashed border-gray-200">
                                                    <span className={`text-lg font-mono font-bold ${diff < 0 ? 'text-lime-600' : (diff > 0 ? 'text-red-500' : 'text-gray-700')}`}>
                                                        {valB}
                                                    </span>
                                                    {diff !== 0 && (
                                                        <span className={`text-xs font-bold ${diff < 0 ? 'text-lime-600' : 'text-red-500'}`}>
                                                            {diff < 0 ? `+${Math.abs(diff)}` : `-${diff}`}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
