'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { X, Plus, Save, Play, Trash2, ChevronRight, Check } from 'lucide-react';
import { calculateManagerBoost } from '@/utils/managerBoost'; // Not directly used here but good to have if needed

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AutoAllocateModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: any;
    totalPoints: number;
    onApply: (newAllocation: Record<string, number>) => void;
    progressionMap: Record<string, { label: string; keys: string[] }>;
    statGroups: any[];
    managerProficiency: number;
    boostedStats: string[];
    staticBoosterBonuses: Record<string, number>;
}

interface Goal {
    stat: string;
    target: number;
}

interface Preset {
    id: string;
    name: string;
    goals: Goal[];
}

export function AutoAllocateModal({ isOpen, onClose, player, totalPoints, onApply, progressionMap, statGroups, managerProficiency, boostedStats, staticBoosterBonuses }: AutoAllocateModalProps) {
    const [goals, setGoals] = useState<Goal[]>([{ stat: 'speed', target: 90 }]);
    const [presets, setPresets] = useState<Preset[]>([]);
    const [presetName, setPresetName] = useState('');
    const [loading, setLoading] = useState(false);

    // Flatten stats for dropdown
    const allStats = statGroups.flatMap(g => g.items).filter((i: any) =>
        !['weak_foot_usage', 'weak_foot_accuracy', 'form', 'injury_resistance'].includes(i.key)
    );

    useEffect(() => {
        if (isOpen) {
            fetchPresets();
        }
    }, [isOpen]);

    const fetchPresets = async () => {
        const { data, error } = await supabase.from('allocation_presets').select('*').order('created_at', { ascending: false });
        if (data) setPresets(data);
    };

    const addGoal = () => {
        setGoals([...goals, { stat: allStats[0].key, target: 85 }]);
    };

    const removeGoal = (index: number) => {
        setGoals(goals.filter((_, i) => i !== index));
    };

    const updateGoal = (index: number, field: keyof Goal, value: any) => {
        const newGoals = [...goals];
        newGoals[index] = { ...newGoals[index], [field]: value };
        setGoals(newGoals);
    };

    const handleSavePreset = async () => {
        if (!presetName) return alert('プリセット名を入力してください');
        setLoading(true);
        const { error } = await supabase.from('allocation_presets').insert({ name: presetName, goals });
        if (!error) {
            alert('プリセットを保存しました');
            setPresetName('');
            fetchPresets();
        } else {
            console.error(error);
            alert('保存に失敗しました');
        }
        setLoading(false);
    };

    const handleLoadPreset = (preset: Preset) => {
        setGoals(preset.goals);
    };

    const handleDeletePreset = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('削除しますか？')) return;
        await supabase.from('allocation_presets').delete().eq('id', id);
        fetchPresets();
    };

    // Main Logic: Execute Allocation
    const handleExecute = () => {
        let currentAllocation: Record<string, number> = {
            shooting: 0, passing: 0, dribbling: 0, dexterity: 0, lower_body: 0,
            aerial: 0, defending: 0, gk1: 0, gk2: 0, gk3: 0
        };

        let usedCost = 0;

        // Helper to calculate cost for a specific level
        const getCostForLevel = (lvl: number) => Math.floor((lvl - 1) / 4) + 1;

        // Iterate through goals
        for (const goal of goals) {
            const statKey = goal.stat;
            const targetVal = goal.target;
            const baseVal = player[statKey] || 40; // Default fallback

            // Find which category boosts this stat
            const categoryKey = Object.keys(progressionMap).find(k => progressionMap[k].keys.includes(statKey));

            if (!categoryKey) continue;

            let currentLevel = currentAllocation[categoryKey];

            // 修正ロジック: 現在の状態での最終値を計算
            const calculatePredictedStat = (lvl: number) => {
                const talentVal = Math.min(99, baseVal + lvl);
                // チームスタイル補正
                let proficiencyBoostVal = 0;
                if (!['weak_foot_usage', 'weak_foot_accuracy', 'form', 'injury_resistance'].includes(statKey)) {
                    proficiencyBoostVal = calculateManagerBoost(talentVal, managerProficiency);
                }

                // ブースター補正 (事前計算された値を加算)
                const boosterBonusVal = staticBoosterBonuses[statKey] || 0;

                return Math.min(99, talentVal + proficiencyBoostVal + boosterBonusVal);
            };

            let currentStat = calculatePredictedStat(currentLevel);

            if (currentStat >= targetVal) continue; // Already met

            // Try to increase level until target reached or points out
            while (currentStat < targetVal) {
                const nextLevel = currentLevel + 1;
                if (nextLevel > 99) break;

                const cost = getCostForLevel(nextLevel);
                if (usedCost + cost <= totalPoints) {
                    usedCost += cost;
                    currentLevel = nextLevel;
                    currentAllocation[categoryKey] = currentLevel;
                    currentStat = calculatePredictedStat(currentLevel);
                } else {
                    break; // Out of points
                }
            }
        }

        onApply(currentAllocation);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl sticky top-0 z-10">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Play className="w-5 h-5 text-blue-600" />
                        自動割り振り (Auto-Allocate)
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Presets Section */}
                    <section>
                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-3 text-xs tracking-wider">保存済みプリセット</h3>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                            {presets.length === 0 && <p className="text-sm text-gray-400 italic">プリセットがありません</p>}
                            {presets.map(preset => (
                                <div
                                    key={preset.id}
                                    onClick={() => handleLoadPreset(preset)}
                                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer hover:bg-blue-100 hover:border-blue-300 transition shrink-0 group"
                                >
                                    <span className="text-sm font-bold text-blue-700">{preset.name}</span>
                                    <button onClick={(e) => handleDeletePreset(preset.id, e)} className="p-1 hover:bg-red-100 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Goals Editor */}
                    <section className="bg-gray-50/50 rounded-xl border border-gray-100 p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-500" />
                                目標ステータス (Goals)
                            </h3>
                            <button onClick={addGoal} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition">
                                <Plus className="w-3 h-3" /> 目標を追加
                            </button>
                        </div>

                        <div className="space-y-3">
                            {goals.map((goal, idx) => (
                                <div key={idx} className="flex items-center gap-2 animate-in slide-in-from-left duration-200">
                                    <span className="text-xs font-bold text-gray-400 w-6">#{idx + 1}</span>
                                    <select
                                        value={goal.stat}
                                        onChange={(e) => updateGoal(idx, 'stat', e.target.value)}
                                        className="flex-1 border border-gray-300 rounded-md p-2 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        {allStats.map((s: any) => (
                                            <option key={s.key} value={s.key}>{s.label}</option>
                                        ))}
                                    </select>
                                    <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-md p-1 px-2">
                                        <span className="text-xs text-gray-500 font-bold">目標値:</span>
                                        <input
                                            type="number"
                                            value={goal.target}
                                            onChange={(e) => updateGoal(idx, 'target', Number(e.target.value))}
                                            className="w-12 text-center text-sm font-bold text-gray-900 outline-none"
                                            min="40" max="99"
                                        />
                                    </div>
                                    <button onClick={() => removeGoal(idx)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Save Preset Form */}
                        <div className="mt-6 pt-4 border-t border-gray-200 flex gap-2">
                            <input
                                type="text"
                                placeholder="プリセット名を入力 (例: スピードスター)"
                                value={presetName}
                                onChange={(e) => setPresetName(e.target.value)}
                                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button
                                onClick={handleSavePreset}
                                disabled={loading || !presetName}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-sm font-bold rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
                            >
                                <Save className="w-4 h-4" /> 保存
                            </button>
                        </div>
                    </section>
                </div>

                <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3 sticky bottom-0 z-10">
                    <button onClick={onClose} className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition text-sm">
                        キャンセル
                    </button>
                    <button
                        onClick={handleExecute}
                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2 transition text-sm"
                    >
                        <Play className="w-4 h-4" />
                        適用する
                    </button>
                </div>
            </div>
        </div>
    );
}
