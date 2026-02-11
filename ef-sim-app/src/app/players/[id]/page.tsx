'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import {
    ArrowLeft, Loader2, MapPin, Shield, Activity, Zap, Grab,
    RotateCcw, ChevronDown, ChevronUp, X, SlidersHorizontal,
    TrendingUp, UserCog, Minus, Plus, Play, Trophy
} from 'lucide-react';
import { PositionMap } from '@/components/PositionMap'; // Phase 17
import { SkillSelector } from '@/components/SkillSelector'; // Phase 17
import { GlobalMenu } from '@/components/GlobalMenu';
import { calculateManagerBoost } from '@/utils/managerBoost';
import { AutoAllocateModal } from '@/components/AutoAllocateModal';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// UI表示用の能力値リスト
const STAT_GROUPS = [
    {
        title: '攻撃',
        icon: <Zap className="w-5 h-5 text-yellow-500" />,
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
        icon: <Shield className="w-5 h-5 text-blue-500" />,
        items: [
            { label: 'ディフェンスセンス', key: 'defensive_awareness' },
            { label: 'ボール奪取', key: 'tackling' },
            { label: 'アグレッシブネス', key: 'aggression' },
            { label: '守備意識', key: 'defensive_engagement' },
        ]
    },
    {
        title: 'フィジカル',
        icon: <Activity className="w-5 h-5 text-green-500" />,
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
        icon: <Grab className="w-5 h-5 text-purple-500" />,
        items: [
            { label: 'GKセンス', key: 'gk_awareness' },
            { label: 'キャッチング', key: 'gk_catching' },
            { label: 'クリアリング', key: 'gk_clearing' },
            { label: 'コラプシング', key: 'gk_reflexes' },
            { label: 'ディフレクティング', key: 'gk_reach' },
        ]
    },
    // Phase 17: Removed 'Other' group (moved to Profile display)
];

// タレントデザイン用カテゴリの定義
const PROGRESSION_MAP: Record<string, { label: string; keys: string[]; iconPath: string }> = {
    shooting: { label: 'シュート', keys: ['finishing', 'place_kicking', 'curl'], iconPath: '/icons/shooting.png' },
    passing: { label: 'パス', keys: ['low_pass', 'loft_pass'], iconPath: '/icons/passing.png' },
    dribbling: { label: 'ドリブル', keys: ['ball_control', 'dribbling', 'tight_possession'], iconPath: '/icons/dribbling.png' },
    dexterity: { label: 'クイックネス', keys: ['offensive_awareness', 'acceleration', 'balance'], iconPath: '/icons/dexterity.png' },
    lower_body: { label: '脚力', keys: ['speed', 'kicking_power', 'stamina'], iconPath: '/icons/lower_body.png' },
    aerial: { label: 'エアバトル', keys: ['heading', 'jump', 'physical_contact'], iconPath: '/icons/aerial.png' },
    defending: { label: 'ディフェンス', keys: ['defensive_awareness', 'tackling', 'aggression', 'defensive_engagement'], iconPath: '/icons/defending.png' },
    gk1: { label: 'GK1', keys: ['gk_awareness', 'jump'], iconPath: '/icons/gk1.png' },
    gk2: { label: 'GK2', keys: ['gk_catching', 'gk_clearing'], iconPath: '/icons/gk2.png' },
    gk3: { label: 'GK3', keys: ['gk_reflexes', 'gk_reach'], iconPath: '/icons/gk3.png' },
};

// 全能力値キーのリスト (監督補正ドロップダウン用)
const ALL_STATS_FLAT = STAT_GROUPS.flatMap(g => g.items).filter(item =>
    !['weak_foot_usage', 'weak_foot_accuracy', 'form', 'injury_resistance'].includes(item.key)
);

export default function PlayerDetailsPage() {
    const params = useParams();
    const id = params?.id as string;

    const [player, setPlayer] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // タレントポイント割り振り状態
    const [allocation, setAllocation] = useState<Record<string, number>>({
        shooting: 0, passing: 0, dribbling: 0, dexterity: 0, lower_body: 0,
        aerial: 0, defending: 0, gk1: 0, gk2: 0, gk3: 0
    });

    // 監督補正状態
    const [managerProficiency, setManagerProficiency] = useState<number>(87);
    const [boostedStats, setBoostedStats] = useState<string[]>(['', '']); // 2つのスロット

    // Phase 17: Booster State
    const [normalBoosters, setNormalBoosters] = useState<any[]>([]);
    const [activeUniqueValue, setActiveUniqueValue] = useState<number>(0);
    const [selectedAdditionalBoosterId, setSelectedAdditionalBoosterId] = useState<string>('');

    // Phase 17 Step 4: UI Toggles
    const [isUniqueBoosterActive, setIsUniqueBoosterActive] = useState(true);
    const [isAdditionalBoosterActive, setIsAdditionalBoosterActive] = useState(true);
    const [isManagerBoostActive, setIsManagerBoostActive] = useState(true);


    // UI State
    const [isTalentDesignOpen, setIsTalentDesignOpen] = useState(true);
    const [isManagerBoostOpen, setIsManagerBoostOpen] = useState(false); // Default closed
    const [isAutoAllocateOpen, setIsAutoAllocateOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const fetchPlayer_and_Boosters = async () => {
            setLoading(true);
            try {
                // Fetch Player
                const { data: playerData, error: playerError } = await supabase
                    .from('players')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (playerError) throw playerError;
                setPlayer(playerData);

                // Phase 17: Set initial unique booster value if exists
                if (playerData.custom_booster && playerData.custom_booster[0]) {
                    setActiveUniqueValue(playerData.custom_booster[0].value);
                }

                // Phase 17: Fetch Normal Boosters
                const { data: boosterData } = await supabase
                    .from('boosters')
                    .select('*')
                    .eq('type', 'normal')
                    .order('name');
                if (boosterData) setNormalBoosters(boosterData);

            } catch (err: any) {
                console.error(err);
                setError('データの取得に失敗しました。');
            } finally {
                setLoading(false);
            }
        };

        fetchPlayer_and_Boosters();
    }, [id]);

    // コスト計算関数
    const calculateTotalCost = (level: number) => {
        let total = 0;
        for (let i = 1; i <= level; i++) {
            const cost = Math.floor((i - 1) / 4) + 1;
            total += cost;
        }
        return total;
    };

    // ポイント計算
    const maxLevel = player?.max_level || 1;
    const totalPoints = Math.max(0, (maxLevel - 1) * 2);

    // 消費ポイントの計算
    const usedPoints = Object.values(allocation).reduce((sum, val) => sum + calculateTotalCost(val), 0);
    const remainingPoints = totalPoints - usedPoints;

    // 到達可能な最大レベル計算
    const getMaxPossibleLevel = (currentLevel: number, remaining: number) => {
        let lvl = currentLevel;
        let pts = remaining;

        while (lvl < 99) {
            const nextLevel = lvl + 1;
            const cost = Math.floor((nextLevel - 1) / 4) + 1;

            if (pts >= cost) {
                pts -= cost;
                lvl = nextLevel;
            } else {
                break;
            }
        }
        return lvl;
    };

    const handleAllocationChange = (key: string, value: string) => {
        const newValue = Math.min(99, Math.max(0, Number(value) || 0));
        const otherCost = Object.entries(allocation)
            .filter(([k]) => k !== key)
            .reduce((sum, [, val]) => sum + calculateTotalCost(val), 0);

        const newKeyCost = calculateTotalCost(newValue);
        const newTotalCost = otherCost + newKeyCost;

        if (newTotalCost > totalPoints && newValue > allocation[key]) {
            return;
        }

        setAllocation(prev => ({ ...prev, [key]: newValue }));
    };

    const handleReset = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setAllocation({
            shooting: 0, passing: 0, dribbling: 0, dexterity: 0, lower_body: 0,
            aerial: 0, defending: 0, gk1: 0, gk2: 0, gk3: 0
        });
    };

    // 監督補正の選択変更
    const handleBoostStatChange = (index: number, key: string) => {
        const newBoosts = [...boostedStats];
        newBoosts[index] = key;
        setBoostedStats(newBoosts);
    };

    // 能力値計算 (タレントのみ)
    const calculateTalentStat = (key: string, baseValue: number) => {
        let addedValue = 0;
        Object.keys(allocation).forEach(progKey => {
            if (PROGRESSION_MAP[progKey].keys.includes(key)) {
                addedValue += allocation[progKey];
            }
        });
        return Math.min(99, baseValue + addedValue);
    };

    // 能力値クリック時のカテゴリ検索 & セット
    const handleStatClick = (statKey: string) => {
        const foundCategory = Object.keys(PROGRESSION_MAP).find(catKey =>
            PROGRESSION_MAP[catKey].keys.includes(statKey)
        );
        if (foundCategory) {
            setActiveCategory(foundCategory);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                <p>選手データを読み込んでいます...</p>
            </div>
        );
    }

    if (error || !player) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-900">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">404 Not Found</h1>
                <p className="text-gray-500 mb-6">{error || '指定された選手が見つかりませんでした。'}</p>
                <Link href="/" className="text-blue-600 hover:underline font-bold flex items-center">
                    <ArrowLeft className="w-5 h-5 mr-1" />
                    トップページに戻る
                </Link>
            </div>
        );
    }

    const sliderMax = activeCategory ? getMaxPossibleLevel(allocation[activeCategory], remainingPoints) : 99;

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8 font-sans pb-32">
            <div className="max-w-6xl mx-auto">
                {/* Header / Nav */}
                <div className="mb-6 flex items-center justify-between bg-white/80 backdrop-blur p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-4">
                        <GlobalMenu />
                        <Link href="/" className="inline-flex items-center text-gray-800 hover:text-blue-600 transition font-bold text-lg tracking-tight">
                            eF-Sim
                        </Link>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Left Column: Image & Basic Info */}
                    <div className="w-full md:w-1/3 space-y-6">
                        {/* Image Card */}
                        <div className="bg-white rounded-xl shadow border p-6 flex flex-col items-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-blue-50/50 -z-10" />
                            <div className="relative w-full aspect-square bg-white rounded-xl overflow-hidden mb-4 border shadow-inner p-4">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={player.evidence_url || '/placeholder.png'} alt={player.name} className="w-full h-full object-contain drop-shadow-xl" />
                            </div>
                            <div className="text-center w-full relative z-10">
                                <h1 className="text-3xl font-extrabold text-gray-900 mb-2 uppercase break-words leading-tight tracking-tight">{player.name}</h1>
                                <span className="inline-block bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-bold px-4 py-1.5 rounded-full mb-6 shadow-md shadow-blue-200">{player.card_type}</span>

                                <div className="flex flex-col gap-3 text-sm text-gray-600 border-t border-gray-100 pt-5 w-full">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold flex items-center gap-2 text-gray-500"><Activity className="w-4 h-4 text-gray-400" /> レベル</span>
                                        <span className="text-right truncate ml-2 font-mono font-bold text-lg text-gray-800">{player.max_level || 1}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold flex items-center gap-2 text-gray-500"><MapPin className="w-4 h-4 text-gray-400" /> 所属チーム</span>
                                        <span className="text-right truncate ml-2 font-medium">{player.team}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold flex items-center gap-2 text-gray-500"><MapPin className="w-4 h-4 text-gray-400" /> 国籍・地域</span>
                                        <span className="text-right truncate ml-2 font-medium">{player.nationality}</span>
                                    </div>

                                    {/* Extended Profile Info */}
                                    <div className="border-t border-gray-100 my-2 pt-2"></div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-gray-500 text-xs">身長 / 年齢</span>
                                        <span className="font-bold text-gray-800">{player.height ? `${player.height}cm` : '-'} / {player.age ? player.age : '-'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-gray-500 text-xs">利き足</span>
                                        <span className="font-bold text-gray-800">{player.dominant_foot || '-'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-gray-500 text-xs">プレイスタイル</span>
                                        <span className={`font-bold ${player.playstyle === 'なし' ? 'text-gray-400' : 'text-blue-600'}`}>{player.playstyle || '-'}</span>
                                    </div>

                                    <div className="border-t border-gray-100 my-2 pt-2"></div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-gray-500 text-xs">逆足頻度</span>
                                        <span className="font-bold text-gray-800">{player.weak_foot_usage || '-'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-gray-500 text-xs">逆足精度</span>
                                        <span className="font-bold text-gray-800">{player.weak_foot_accuracy || '-'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-gray-500 text-xs">コンディションの波</span>
                                        <span className="font-bold text-gray-800">{player.form || '-'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-gray-500 text-xs">怪我耐性</span>
                                        <span className="font-bold text-gray-800">{player.injury_resistance || '-'}</span>
                                    </div>
                                </div>

                                {/* Position Map Display */}
                                <div className="mt-6 flex justify-center w-full">
                                    <div className="w-full">
                                        <h4 className="font-bold text-gray-700 mb-2 text-center text-xs">ポジション適性</h4>
                                        <PositionMap value={player.positions as Record<string, number> || {}} readonly />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Player Stats & Skills */}
                    <div className="w-full md:w-2/3 space-y-6">

                        {/* Talent Design Section */}
                        <div className="bg-white rounded-xl shadow border overflow-hidden transition-all duration-300 group">
                            <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setIsTalentDesignOpen(!isTalentDesignOpen)}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><SlidersHorizontal className="w-5 h-5" /></div>
                                    <h2 className="text-lg font-bold text-gray-800">Talent Design</h2>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${remainingPoints <= 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>残りポイント: {remainingPoints}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={(e) => { e.stopPropagation(); setIsAutoAllocateOpen(true); }} className="text-blue-600 hover:text-blue-700 flex items-center text-sm font-bold transition px-3 py-1 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 mr-2"><Play className="w-4 h-4 mr-1" />Auto</button>
                                    <button onClick={handleReset} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full transition-all" title="Reset Allocation"><RotateCcw className="w-4 h-4" /></button>
                                    {isTalentDesignOpen ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                                </div>
                            </div>

                            {isTalentDesignOpen && (
                                <div className="p-6 pt-0 border-t border-gray-100 bg-gray-50/30">
                                    <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {Object.keys(PROGRESSION_MAP).map((key) => (
                                            <div key={key} className="flex flex-col gap-2 p-2 rounded-lg bg-gray-50/50 border border-gray-100 hover:border-blue-200 transition-colors">
                                                <div className="flex items-center gap-2">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={PROGRESSION_MAP[key].iconPath} alt={PROGRESSION_MAP[key].label} className="w-6 h-6 object-contain opacity-80" onError={(e) => e.currentTarget.style.display = 'none'} />
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider truncate flex-1" title={PROGRESSION_MAP[key].label}>{PROGRESSION_MAP[key].label}</label>
                                                </div>
                                                <div className="flex items-center justify-between bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
                                                    <button onClick={(e) => { e.stopPropagation(); handleAllocationChange(key, String(allocation[key] - 1)); }} className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors active:bg-gray-200 border-r border-gray-100"><Minus className="w-4 h-4" /></button>
                                                    <div className="flex-1 text-center font-mono font-bold text-lg text-gray-800">{allocation[key]}</div>
                                                    <button onClick={(e) => { e.stopPropagation(); handleAllocationChange(key, String(allocation[key] + 1)); }} className="w-10 h-10 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors active:bg-blue-200 border-l border-blue-100"><Plus className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Manager Boost Section */}
                        <div className="bg-white rounded-xl shadow border overflow-hidden transition-all duration-300">
                            <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setIsManagerBoostOpen(!isManagerBoostOpen)}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><TrendingUp className="w-5 h-5" /></div>
                                    <h2 className="text-lg font-bold text-gray-800">
                                        監督補正 & ブースター
                                    </h2>
                                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                                        設定
                                    </span>
                                </div>
                                {isManagerBoostOpen ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                            </div>

                            {isManagerBoostOpen && (
                                <div className="p-6 pt-0 border-t border-gray-100 bg-purple-50/10">
                                    <div className="mt-4 space-y-6">
                                        {/* Phase 17: Unique Booster Display */}
                                        {player.custom_booster?.[0] && (
                                            <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-pink-600 uppercase tracking-wider flex items-center gap-1">
                                                            <Zap className="w-3 h-3" /> 個別ブースター
                                                        </span>
                                                        <label className="flex items-center cursor-pointer">
                                                            <input type="checkbox" checked={isUniqueBoosterActive} onChange={(e) => setIsUniqueBoosterActive(e.target.checked)} className="form-checkbox h-4 w-4 text-purple-600 rounded selection:bg-none" />
                                                        </label>
                                                    </div>
                                                    <div className="flex items-center justify-between bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden w-24">
                                                        <button onClick={() => setActiveUniqueValue(Math.max(0, activeUniqueValue - 1))} className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors active:bg-gray-200 border-r border-gray-100"><Minus className="w-4 h-4" /></button>
                                                        <span className="flex-1 text-center font-mono font-bold text-lg text-gray-800">{activeUniqueValue}</span>
                                                        <button onClick={() => setActiveUniqueValue(Math.min(99, activeUniqueValue + 1))} className="w-8 h-8 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors active:bg-blue-200 border-l border-blue-100"><Plus className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                                <div className={`transition-opacity duration-200 ${!isUniqueBoosterActive ? 'opacity-50' : ''}`}>
                                                    <div className="font-bold text-gray-800">{player.custom_booster[0].name}</div>
                                                    <div className="text-xs text-gray-500 mt-1 truncate">
                                                        {player.custom_booster[0].targets === 'all' ? '全能力' : Array.isArray(player.custom_booster[0].targets) ? player.custom_booster[0].targets.join(', ') : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Phase 17: Additional Booster Selection */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                    追加ブースター (+1)
                                                </label>
                                                <label className="flex items-center cursor-pointer">
                                                    <input type="checkbox" checked={isAdditionalBoosterActive} onChange={(e) => setIsAdditionalBoosterActive(e.target.checked)} className="form-checkbox h-4 w-4 text-purple-600 rounded selection:bg-none" />
                                                </label>
                                            </div>
                                            <select
                                                value={selectedAdditionalBoosterId}
                                                onChange={(e) => setSelectedAdditionalBoosterId(e.target.value)}
                                                className={`w-full p-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-opacity ${!isAdditionalBoosterActive ? 'opacity-50' : ''}`}
                                            >
                                                <option value="">-- なし --</option>
                                                {normalBoosters.map((b) => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="border-t border-purple-100 my-2"></div>

                                        {/* Slider: Team Style Proficiency (Applies to ALL stats) */}
                                        <div className="relative">
                                            <div className="absolute -top-3 right-0">
                                                <label className="flex items-center gap-1 cursor-pointer bg-white px-2 rounded-full border border-gray-200">
                                                    <span className="text-[10px] font-bold text-gray-400">監督補正ON/OFF</span>
                                                    <input type="checkbox" checked={isManagerBoostActive} onChange={(e) => setIsManagerBoostActive(e.target.checked)} className="form-checkbox h-4 w-4 text-purple-600 rounded selection:bg-none" />
                                                </label>
                                            </div>
                                            <div className={`transition-opacity duration-200 ${!isManagerBoostActive ? 'opacity-50 pointer-events-none' : ''}`}>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                                    チームスタイル適正 (85 ~ 89)<span className="text-xs font-normal text-gray-500 ml-2">※全能力値に自動補正</span></label>
                                                <div className="flex items-center gap-4">
                                                    <input type="range" min="85" max="89" step="1" value={managerProficiency} onChange={(e) => setManagerProficiency(Number(e.target.value))} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                                                    <span className="text-xl font-bold font-mono text-purple-600 w-12 text-center">{managerProficiency}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {[0, 1].map((idx) => (
                                                <div key={idx} className={`transition-opacity duration-200 ${!isManagerBoostActive ? 'opacity-50 pointer-events-none' : ''}`}>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">補正 #{idx + 1} (+1)</label>
                                                    <select value={boostedStats[idx]} onChange={(e) => handleBoostStatChange(idx, e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none">
                                                        <option value="" className="text-gray-400">-- なし --</option>
                                                        {ALL_STATS_FLAT.map((item) => (<option key={item.key} value={item.key}>{item.label}</option>))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Ability Stats Section */}
                        <div className="bg-white rounded-xl shadow border p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4 flex items-center gap-2">
                                <Activity className="w-6 h-6 text-blue-600" /> Ability Stats
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {STAT_GROUPS.map((group) => (
                                    <div key={group.title} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                                        <div className="bg-gray-100/50 p-3 border-b border-gray-200 flex items-center gap-2">
                                            {group.icon}<h3 className="font-bold text-gray-700">{group.title}</h3>
                                        </div>
                                        <div className="divide-y divide-gray-100">
                                            {group.items.map((item) => {
                                                const baseValue = player[item.key];
                                                let finalValue: number | null = null;
                                                let proficiencyBoostVal = 0;
                                                let boosterBonusVal = 0;
                                                let totalBoost = 0;

                                                if (typeof baseValue === 'number') {
                                                    const talentVal = calculateTalentStat(item.key, baseValue);

                                                    if (isManagerBoostActive) {
                                                        if (!['weak_foot_usage', 'weak_foot_accuracy', 'form', 'injury_resistance'].includes(item.key)) {
                                                            proficiencyBoostVal = calculateManagerBoost(talentVal, managerProficiency);
                                                        }
                                                        if (boostedStats.includes(item.key)) boosterBonusVal = 1;
                                                    }

                                                    // Phase 17: Boosters
                                                    let uniqueBoosterVal = 0;
                                                    let additionalBoosterVal = 0;

                                                    if (isUniqueBoosterActive && player.custom_booster?.[0]) {
                                                        const unique = player.custom_booster[0];
                                                        if (unique.targets === 'all' || (Array.isArray(unique.targets) && unique.targets.includes(item.key))) {
                                                            uniqueBoosterVal = activeUniqueValue;
                                                        }
                                                    }

                                                    if (isAdditionalBoosterActive && selectedAdditionalBoosterId) {
                                                        const additional = normalBoosters.find(b => b.id === selectedAdditionalBoosterId);
                                                        if (additional && Array.isArray(additional.targets) && additional.targets.includes(item.key)) {
                                                            additionalBoosterVal = 1;
                                                        }
                                                    }

                                                    totalBoost = proficiencyBoostVal + boosterBonusVal + uniqueBoosterVal + additionalBoosterVal;
                                                    finalValue = Math.min(99, talentVal + totalBoost);
                                                }

                                                let valueClass = "text-gray-400";
                                                if (finalValue !== null) {
                                                    if (finalValue >= 90) valueClass = "text-lime-600 font-extrabold";
                                                    else if (finalValue >= 80) valueClass = "text-green-600 font-bold";
                                                    else if (finalValue >= 70) valueClass = "text-amber-500 font-bold";
                                                    else valueClass = "text-red-600 font-bold";
                                                }

                                                return (
                                                    <div key={item.key} onClick={() => handleStatClick(item.key)} className="flex items-center justify-between py-2.5 px-4 hover:bg-white transition-colors cursor-pointer group hover:shadow-sm">
                                                        <span className="text-gray-600 font-medium text-sm group-hover:text-blue-600 transition-colors">{item.label}</span>
                                                        <div className="flex items-center gap-1">
                                                            {totalBoost > 0 && <span className="text-xs bg-cyan-100 text-cyan-700 px-1.5 rounded font-bold mr-1 animate-pulse">+{totalBoost}</span>}
                                                            <span className={`text-lg font-mono tracking-tight ${valueClass} transition-colors duration-300`}>{finalValue !== null ? finalValue : '-'}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Player Skills Section (Phase 17) */}
                        <div className="bg-white rounded-xl shadow border p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4 flex items-center gap-2">
                                <Trophy className="w-6 h-6 text-amber-500" /> 所持スキル
                            </h2>
                            <SkillSelector selectedSkills={player.skills || []} readonly />
                        </div>
                    </div>
                </div>

                {/* Floating Action Panel */}
                {activeCategory && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-blue-200 shadow-[0_-4px_20px_-5px_rgba(0,0,100,0.1)] p-4 pb-8 z-50 animate-in slide-in-from-bottom duration-300">
                        <div className="max-w-xl mx-auto flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow-sm">EDITING</span>
                                    <h3 className="font-bold text-lg text-gray-800">{PROGRESSION_MAP[activeCategory].label}</h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full border ${remainingPoints <= 0 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>残り: {remainingPoints}</span>
                                    <button onClick={() => setActiveCategory(null)} className="p-1 hover:bg-gray-100 rounded-full transition"><X className="w-6 h-6 text-gray-500" /></button>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-xl border border-gray-200">
                                <input type="range" min="0" max={sliderMax} value={allocation[activeCategory]} onChange={(e) => handleAllocationChange(activeCategory, e.target.value)} className="flex-1 h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                <input type="number" min="0" max={sliderMax} value={allocation[activeCategory]} onChange={(e) => handleAllocationChange(activeCategory, e.target.value)} className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-center font-bold text-xl text-blue-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Auto Allocate Modal */}
            <AutoAllocateModal
                isOpen={isAutoAllocateOpen}
                onClose={() => setIsAutoAllocateOpen(false)}
                player={player}
                totalPoints={totalPoints}
                onApply={(newAllocation) => setAllocation(newAllocation)}
                progressionMap={PROGRESSION_MAP}
                statGroups={STAT_GROUPS}
                managerProficiency={managerProficiency}
                boostedStats={boostedStats}
            />
        </div>
    );
}
