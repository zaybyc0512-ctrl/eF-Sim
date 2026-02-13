'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Plus, Trash2, Loader2, Database, Minus } from 'lucide-react';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Booster = {
    id: string;
    name: string;
    type: 'normal' | 'special' | 'squad_link';
    targets: string[]; // text[] in DB
    default_value: number;
};

// All available stats for targets
const ALL_STATS = [
    'offensive_awareness', 'ball_control', 'dribbling', 'tight_possession', 'low_pass', 'loft_pass',
    'finishing', 'heading', 'place_kicking', 'curl', 'speed', 'acceleration', 'kicking_power', 'jump',
    'physical_contact', 'balance', 'stamina', 'defensive_awareness', 'tackling', 'aggression', 'defensive_engagement',
    'gk_awareness', 'gk_catching', 'gk_clearing', 'gk_reflexes', 'gk_reach'
];

const STAT_LABELS: Record<string, string> = {
    offensive_awareness: 'オフェンスセンス',
    ball_control: 'ボールコントロール',
    dribbling: 'ドリブル',
    tight_possession: 'ボールキープ',
    low_pass: 'グラウンダーパス',
    loft_pass: 'フライパス',
    finishing: '決定力',
    heading: 'ヘディング',
    place_kicking: 'プレースキック',
    curl: 'カーブ',
    defensive_awareness: 'ディフェンスセンス',
    tackling: 'ボール奪取',
    aggression: 'アグレッシブネス',
    defensive_engagement: '守備意識',
    speed: 'スピード',
    acceleration: '瞬発力',
    kicking_power: 'キック力',
    jump: 'ジャンプ',
    physical_contact: 'フィジカルコンタクト',
    balance: 'ボディコントロール',
    stamina: 'スタミナ',
    gk_awareness: 'GKセンス',
    gk_catching: 'キャッチング',
    gk_clearing: 'クリアリング',
    gk_reflexes: 'コラプシング',
    gk_reach: 'ディフレクティング',
};

export default function AdminBoostersPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [boosters, setBoosters] = useState<Booster[]>([]);

    // Form State
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState<string>('normal');
    const [newTargets, setNewTargets] = useState<string[]>([]);
    const [newValue, setNewValue] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const checkAuthAndFetch = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.replace('/');
                return;
            }

            const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).single();
            if (roleData?.role !== 'admin' && roleData?.role !== 'developer') {
                router.replace('/');
                return;
            }

            fetchBoosters();
            setLoading(false);
        };
        checkAuthAndFetch();
    }, [router]);

    const fetchBoosters = async () => {
        const { data, error } = await supabase
            .from('boosters')
            .select('*')
            .order('type', { ascending: false })
            .order('name');

        if (data) setBoosters(data);
        if (error) console.error(error);
    };

    const handleTargetChange = (stat: string) => {
        if (newTargets.includes(stat)) {
            setNewTargets(newTargets.filter(t => t !== stat));
        } else {
            setNewTargets([...newTargets, stat]);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return;
        setIsSubmitting(true);

        const { error } = await supabase.from('boosters').insert({
            name: newName,
            type: newType,
            targets: newTargets.length > 0 ? newTargets : ['all'],
            default_value: newValue
        });

        if (error) {
            alert('エラー: ' + error.message);
        } else {
            setNewName('');
            setNewTargets([]);
            setNewValue(1);
            fetchBoosters();
        }
        setIsSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('本当に削除しますか？')) return;
        const { error } = await supabase.from('boosters').delete().eq('id', id);
        if (!error) fetchBoosters();
        else alert('削除失敗: ' + error.message);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    return (
        <div className="min-h-screen bg-gray-100 flex font-sans">
            <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:block p-4 space-y-2">
                <div className="p-4 border-b border-slate-800 mb-4">
                    <h1 className="text-xl font-bold tracking-wider">ADMIN</h1>
                </div>
                <Link href="/admin" className="block px-4 py-2 hover:bg-slate-800 rounded text-slate-300">CSVインポート</Link>
                <Link href="/admin/boosters" className="block px-4 py-2 bg-blue-600 rounded font-bold">ブースター管理</Link>
                <Link href="/admin/skills" className="block px-4 py-2 hover:bg-slate-800 rounded text-slate-300">スキル管理</Link>
                <Link href="/" className="block px-4 py-2 hover:bg-slate-800 rounded text-slate-400 mt-8 border-t border-slate-800">トップに戻る</Link>
            </aside>

            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-2">
                        <Database className="w-6 h-6 text-blue-600" />
                        ブースター管理
                    </h1>

                    {/* Add Form */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                        <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">新規ブースター登録</h2>
                        <form onSubmit={handleAdd} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">ブースター名</label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        className="w-full p-2.5 border border-gray-300 rounded text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="例: ストライカーセンス"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">タイプ</label>
                                    <select
                                        value={newType}
                                        onChange={e => setNewType(e.target.value)}
                                        className="w-full p-2.5 border border-gray-300 rounded text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="normal">Normal</option>
                                        <option value="special">Special</option>
                                        <option value="squad_link">Squad Link</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">上昇値</label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setNewValue(prev => Math.max(1, prev - 1))}
                                            className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-gray-700 border border-gray-300"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <input
                                            type="number"
                                            value={newValue}
                                            onChange={e => setNewValue(Number(e.target.value))}
                                            className="w-20 text-center p-2 border border-gray-300 rounded text-gray-900 font-bold"
                                            min={1}
                                            max={10}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setNewValue(prev => Math.min(10, prev + 1))}
                                            className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-gray-700 border border-gray-300"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">対象ステータス (選択なしの場合はALL)</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-[200px] overflow-y-auto">
                                    {ALL_STATS.map(stat => (
                                        <label key={stat} className="flex items-center gap-2 text-xs text-gray-700 hover:bg-white p-1 rounded cursor-pointer transition">
                                            <input
                                                type="checkbox"
                                                checked={newTargets.includes(stat)}
                                                onChange={() => handleTargetChange(stat)}
                                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                            <span className="truncate">{STAT_LABELS[stat] || stat}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-100">
                                <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-sm">
                                    {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                    ブースターを登録
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Loading/List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-700 font-bold border-b">
                                <tr>
                                    <th className="px-6 py-4">名前</th>
                                    <th className="px-6 py-4">タイプ</th>
                                    <th className="px-6 py-4">対象</th>
                                    <th className="px-6 py-4">値</th>
                                    <th className="px-6 py-4 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {boosters.map(b => (
                                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900">{b.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${b.type === 'special' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                                b.type === 'squad_link' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                                    'bg-gray-100 text-gray-600 border-gray-200'
                                                }`}>
                                                {b.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-xs">
                                            {Array.isArray(b.targets) && b.targets.includes('all') ?
                                                <span className="font-bold text-blue-600">ALL (全能力)</span> :
                                                <span className="truncate block max-w-[200px]" title={Array.isArray(b.targets) ? b.targets.join(', ') : b.targets}>
                                                    {Array.isArray(b.targets) ? b.targets.length + ' 項目' : b.targets}
                                                </span>
                                            }
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-gray-900">+{b.default_value}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleDelete(b.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {boosters.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold">データがありません</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
