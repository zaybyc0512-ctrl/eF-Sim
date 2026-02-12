'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Minus, Plus } from 'lucide-react';
import { SkillSelector } from '@/components/SkillSelector';
import { PositionMap } from '@/components/PositionMap';
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const STAT_GROUPS = [
    {
        title: '攻撃',
        items: [
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
        title: '守備',
        items: [
            { label: 'ディフェンスセンス', key: 'defensive_awareness' },
            { label: 'ボール奪取', key: 'tackling' },
            { label: 'アグレッシブネス', key: 'aggression' },
            { label: '守備意識', key: 'defensive_engagement' },
        ]
    },
    {
        title: 'フィジカル',
        items: [
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
        title: 'GK',
        items: [
            { label: 'GKセンス', key: 'gk_awareness' },
            { label: 'キャッチング', key: 'gk_catching' },
            { label: 'クリアリング', key: 'gk_clearing' },
            { label: 'コラプシング', key: 'gk_reflexes' },
            { label: 'ディフレクティング', key: 'gk_reach' },
        ]
    },
];
export default function EditPlayerPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<any>(null);
    const [session, setSession] = useState<any>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    // Auth & Access Control
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.replace('/');
                return;
            }
            setSession(session);
            // Fetch Role
            const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).single();
            const role = roleData?.role || null;
            setUserRole(role);
            // Fetch Player
            const { data: player, error } = await supabase.from('players').select('*').eq('id', id).single();
            if (error || !player) {
                alert('選手データが見つかりません');
                router.replace('/');
                return;
            }
            // Lock Check
            if (player.is_locked && role !== 'admin' && role !== 'developer') {
                alert('この選手はロックされているため編集できません');
                router.replace(`/players/${id}`);
                return;
            }
            setFormData(player);
            setLoading(false);
        };
        checkAuth();
    }, [id, router]);
    const handleChange = (key: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }));
    };
    const handleSkillsChange = (newSkills: string[]) => {
        setFormData((prev: any) => ({ ...prev, skills: newSkills }));
    };
    const handleSave = async () => {
        if (!confirm('変更を保存しますか？')) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('players')
                .update({
                    ...formData,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id);
            if (error) throw error;
            alert('保存しました');
            router.push(`/players/${id}`);
        } catch (err: any) {
            console.error(err);
            alert('保存に失敗しました: ' + err.message);
        } finally {
            setSaving(false);
        }
    };
    const StepperInput = ({ label, value, onChange, min = 1, max = 99 }: { label: string, value: number, onChange: (val: number) => void, min?: number, max?: number }) => (
        <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
            <div className="flex items-center">
                <button
                    onClick={() => onChange(Math.max(min, value - 1))}
                    className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-l-lg border border-r-0 border-gray-300 transition active:bg-gray-300"
                    type="button"
                >
                    <Minus className="w-4 h-4" />
                </button>
                <input
                    type="number"
                    min={min}
                    max={max}
                    value={value || ''}
                    onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
                    className="flex-1 w-full h-10 text-center border-y border-gray-300 text-gray-900 font-bold font-mono focus:outline-none focus:bg-blue-50"
                />
                <button
                    onClick={() => onChange(Math.min(max, value + 1))}
                    className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-r-lg border border-l-0 border-blue-200 transition active:bg-blue-200"
                    type="button"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8 font-sans pb-32">
            <div className="mx-auto max-w-4xl">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-4">
                        <Link href={`/players/${id}`} className="text-gray-500 hover:text-gray-900 transition flex items-center gap-1 font-bold">
                            <ArrowLeft className="w-5 h-5" /> キャンセル
                        </Link>
                        <h1 className="text-xl font-bold text-gray-800">選手データ編集</h1>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        保存する
                    </button>
                </div>
                <div className="grid grid-cols-1 gap-6">
                    {/* Basic Info */}
                    <div className="bg-white rounded-xl shadow border p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">基本情報</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">選手名</label>
                                <input type="text" value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">カード種別</label>
                                <input type="text" value={formData.card_type || ''} onChange={e => handleChange('card_type', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">所属チーム</label>
                                <input type="text" value={formData.team || ''} onChange={e => handleChange('team', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">国籍・地域</label>
                                <input type="text" value={formData.nationality || ''} onChange={e => handleChange('nationality', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <StepperInput label="年齢" value={formData.age} onChange={v => handleChange('age', v)} min={15} max={50} />
                                <StepperInput label="身長 (cm)" value={formData.height} onChange={v => handleChange('height', v)} min={150} max={210} />
                            </div>
                            <div>
                                <StepperInput label="レベル上限" value={formData.max_level} onChange={v => handleChange('max_level', v)} min={1} max={100} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">利き足</label>
                                <select value={formData.dominant_foot || '右足'} onChange={e => handleChange('dominant_foot', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="右足">右足</option>
                                    <option value="左足">左足</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">プレイスタイル</label>
                                <input type="text" value={formData.playstyle || ''} onChange={e => handleChange('playstyle', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        {/* Detailed Props */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 bg-gray-50 p-4 rounded-lg">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">逆足頻度</label>
                                <select value={formData.weak_foot_usage || ''} onChange={e => handleChange('weak_foot_usage', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900">
                                    <option value="">未設定</option>
                                    <option value="やや低い">やや低い</option>
                                    <option value="普通">普通</option>
                                    <option value="高い">高い</option>
                                    <option value="最高">最高</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">逆足精度</label>
                                <select value={formData.weak_foot_accuracy || ''} onChange={e => handleChange('weak_foot_accuracy', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900">
                                    <option value="">未設定</option>
                                    <option value="やや低い">やや低い</option>
                                    <option value="普通">普通</option>
                                    <option value="高い">高い</option>
                                    <option value="最高">最高</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">コンディション</label>
                                <select value={formData.form || ''} onChange={e => handleChange('form', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900">
                                    <option value="">未設定</option>
                                    <option value="不調">不調</option>
                                    <option value="普通">普通</option>
                                    <option value="好調">好調</option>
                                    <option value="絶好調">絶好調</option>
                                    <option value="小さい">小さい</option>
                                    <option value="大きい">大きい</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">怪我耐性</label>
                                <select value={formData.injury_resistance || ''} onChange={e => handleChange('injury_resistance', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900">
                                    <option value="">未設定</option>
                                    <option value="低い">低い</option>
                                    <option value="普通">普通</option>
                                    <option value="高い">高い</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    {/* Stats */}
                    <div className="bg-white rounded-xl shadow border p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">能力値 (Level 1)</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {STAT_GROUPS.map(group => (
                                <div key={group.title}>
                                    <h3 className="font-bold text-sm text-gray-500 mb-2 bg-gray-50 px-2 py-1 rounded inline-block">{group.title}</h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        {group.items.map(item => (
                                            <div key={item.key} className="flex items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <StepperInput
                                                        label={item.label}
                                                        value={formData[item.key]}
                                                        onChange={(val) => handleChange(item.key, val)}
                                                        min={40}
                                                        max={99}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Positions */}
                    <div className="bg-white rounded-xl shadow border p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">ポジション適性 (クリックで変更)</h2>
                        <div className="bg-gray-50 p-6 rounded-xl flex justify-center">
                            <PositionMap
                                value={formData.positions || {}}
                                editable={true}
                                onChange={(newPositions) => handleChange('positions', newPositions)}
                            />
                        </div>
                        <p className="text-center text-xs text-gray-500 mt-2">
                            ※マスをクリックするごとに「なし」→「準適性」→「本適性」と切り替わります
                        </p>
                    </div>
                    {/* Skills */}
                    <div className="bg-white rounded-xl shadow border p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">所持スキル</h2>
                        <SkillSelector
                            selectedSkills={formData.skills || []}
                            onChange={handleSkillsChange}
                            session={session}
                        />
                    </div>
                </div>
                <div className="mt-8 flex justify-end gap-4">
                    <Link href={`/players/${id}`} className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition">
                        キャンセル
                    </Link>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shadow-lg hover:shadow-xl flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        変更内容を保存
                    </button>
                </div>
            </div>
        </div>
    );
}
