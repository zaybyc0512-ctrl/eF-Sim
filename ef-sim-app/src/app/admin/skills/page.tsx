'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Save, Loader2, Database } from 'lucide-react';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Skill = {
    id: string;
    name: string;
    type: 'normal' | 'special';
};

export default function AdminSkillsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [skills, setSkills] = useState<Skill[]>([]);

    // Form
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState<'normal' | 'special'>('normal');
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

            fetchSkills();
            setLoading(false);
        };
        checkAuthAndFetch();
    }, [router]);

    const fetchSkills = async () => {
        const { data, error } = await supabase
            .from('skills')
            .select('*')
            .order('type', { ascending: true }) // normal first
            .order('name');

        if (data) setSkills(data);
        if (error) console.error(error);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return;
        setIsSubmitting(true);

        const { error } = await supabase.from('skills').insert({
            name: newName,
            type: newType
        });

        if (error) {
            alert('エラー (重複など): ' + error.message);
        } else {
            setNewName('');
            fetchSkills();
        }
        setIsSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('本当に削除しますか？')) return;
        const { error } = await supabase.from('skills').delete().eq('id', id);
        if (!error) fetchSkills();
        else alert('削除失敗: ' + error.message);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-gray-100 flex font-sans">
            <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:block p-4 space-y-2">
                <div className="p-4 border-b border-slate-800 mb-4">
                    <h1 className="text-xl font-bold tracking-wider">ADMIN</h1>
                </div>
                <Link href="/admin" className="block px-4 py-2 hover:bg-slate-800 rounded text-slate-300">CSVインポート</Link>
                <Link href="/admin/boosters" className="block px-4 py-2 hover:bg-slate-800 rounded text-slate-300">ブースター管理</Link>
                <Link href="/admin/skills" className="block px-4 py-2 bg-blue-600 rounded font-bold">スキル管理</Link>
                <Link href="/" className="block px-4 py-2 hover:bg-slate-800 rounded text-slate-400 mt-8 border-t border-slate-800">トップに戻る</Link>
            </aside>

            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-2">
                        <Database className="w-6 h-6 text-blue-600" />
                        スキル管理
                    </h1>

                    {/* Add Form */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                        <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">新規スキル登録</h2>
                        <form onSubmit={handleAdd} className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-700 mb-1">スキル名</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="例: ライジングシュート"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">タイプ</label>
                                <div className="flex rounded border border-gray-300 bg-gray-50 p-1">
                                    <button
                                        type="button"
                                        onClick={() => setNewType('normal')}
                                        className={`px-3 py-1.5 text-sm rounded transition font-bold ${newType === 'normal' ? 'bg-white shadow text-blue-600 ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        通常
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewType('special')}
                                        className={`px-3 py-1.5 text-sm rounded transition font-bold ${newType === 'special' ? 'bg-white shadow text-amber-600 ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        特殊
                                    </button>
                                </div>
                            </div>
                            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 h-[42px] shadow-sm">
                                {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                追加
                            </button>
                        </form>
                    </div>

                    {/* List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="max-h-[600px] overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100 text-gray-700 font-bold border-b sticky top-0">
                                    <tr>
                                        <th className="px-6 py-4">スキル名</th>
                                        <th className="px-6 py-4">タイプ</th>
                                        <th className="px-6 py-4 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {skills.map(s => (
                                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-3 font-bold text-gray-900">{s.name}</td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${s.type === 'special'
                                                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                                                        : 'bg-blue-100 text-blue-800 border-blue-200'
                                                    }`}>
                                                    {s.type === 'special' ? 'Special (特殊)' : 'Normal (通常)'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <button onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {skills.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-12 text-center text-gray-400 font-bold">データがありません</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
