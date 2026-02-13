import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Plus, Save, Trash2, BookOpen, AlertCircle, Settings, X, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SkillSelectorProps {
    selectedSkills?: string[];
    onChange?: (skills: string[]) => void;
    readonly?: boolean;
    session?: any;
}

// Phase 21: Removed Hardcoded Skills. Fetched from DB.
// const NORMAL_SKILLS = [...];
// const SPECIAL_SKILLS = [...];

export function SkillSelector({ selectedSkills = [], onChange, readonly = false, session }: SkillSelectorProps) {

    // Phase 19: Skill Presets State
    const [skillPresets, setSkillPresets] = useState<any[]>([]);
    const [selectedPresetId, setSelectedPresetId] = useState<string>('');

    // Phase 21: DB Skills State
    const [normalSkills, setNormalSkills] = useState<string[]>([]);
    const [specialSkills, setSpecialSkills] = useState<string[]>([]);

    // Modal State
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [editingPresetSkills, setEditingPresetSkills] = useState<string[]>([]);
    const [newPresetName, setNewPresetName] = useState('');
    const [isSavingPreset, setIsSavingPreset] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchSkillsFromDB(); // Phase 21
        if (session?.user) {
            fetchPresets();
        }
    }, [session]);

    // Phase 21: Fetch Skills from DB
    const fetchSkillsFromDB = async () => {
        const { data, error } = await supabase.from('skills').select('name, type').order('name');
        if (data) {
            const n = data.filter((s: any) => s.type === 'normal').map((s: any) => s.name);
            const s = data.filter((s: any) => s.type === 'special').map((s: any) => s.name);
            setNormalSkills(n);
            setSpecialSkills(s);
        } else if (error) {
            console.error('Failed to fetch skills:', error);
        }
    };

    // Initialize editing skills when modal opens
    useEffect(() => {
        if (isManageModalOpen) {
            setEditingPresetSkills([...selectedSkills]);
            setNewPresetName('');
        }
    }, [isManageModalOpen]); // We don't include selectedSkills to avoid reset while editing if props change

    const fetchPresets = async () => {
        if (!session?.user) return;
        const { data } = await supabase
            .from('user_skill_presets')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });
        if (data) setSkillPresets(data);
    };

    const handleSavePreset = async () => {
        if (!newPresetName.trim()) return alert('プリセット名を入力してください');
        if (!session?.user) return;

        setIsSavingPreset(true);
        const { error } = await supabase.from('user_skill_presets').insert({
            user_id: session.user.id,
            preset_name: newPresetName,
            skills: editingPresetSkills
        });

        if (!error) {
            alert('スキルプリセットを保存しました');
            setNewPresetName('');
            fetchPresets();
        } else {
            console.error(error);
            alert('保存に失敗しました');
        }
        setIsSavingPreset(false);
    };

    const handleDeletePreset = async (id: string) => {
        if (!confirm('このプリセットを削除しますか？')) return;
        const { error } = await supabase.from('user_skill_presets').delete().eq('id', id);
        if (!error) {
            fetchPresets();
            if (selectedPresetId === id) setSelectedPresetId('');
        }
    };

    const handleLoadPreset = (presetId: string) => {
        setSelectedPresetId(presetId);
        const preset = skillPresets.find(p => p.id === presetId);
        if (preset) {
            if (isManageModalOpen) {
                // If in modal, load into editing state
                setEditingPresetSkills(preset.skills);
            } else if (onChange && !readonly) {
                // If inline and editable, apply to component
                onChange(preset.skills);
            }
        }
    };

    const toggleSkill = (skill: string) => {
        if (readonly || !onChange) return;

        if (selectedSkills.includes(skill)) {
            onChange(selectedSkills.filter(s => s !== skill));
        } else {
            onChange([...selectedSkills, skill]);
        }
    };

    const toggleEditingSkill = (skill: string) => {
        if (editingPresetSkills.includes(skill)) {
            setEditingPresetSkills(editingPresetSkills.filter(s => s !== skill));
        } else {
            setEditingPresetSkills([...editingPresetSkills, skill]);
        }
    };

    // Calculate missing skills for comparison (Readonly mode)
    const activePreset = skillPresets.find(p => p.id === selectedPresetId);
    const missingSkills = activePreset ? activePreset.skills.filter((s: string) => !selectedSkills.includes(s)) : [];

    return (
        <div className="space-y-6">

            {/* Phase 19: Skill Preset Manager Section */}
            {session && (
                <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-100 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-amber-600" />
                            <h3 className="text-sm font-bold text-amber-800">スキルプリセット</h3>
                        </div>
                        <button
                            onClick={() => setIsManageModalOpen(true)}
                            className="text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                        >
                            <Settings className="w-3 h-3" /> 管理 / 新規作成
                        </button>
                    </div>

                    {readonly ? (
                        /* Readonly Mode: Select & Compare */
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedPresetId}
                                    onChange={(e) => setSelectedPresetId(e.target.value)}
                                    className="flex-1 p-2 text-sm border border-amber-200 rounded-md bg-white focus:ring-2 focus:ring-amber-500 outline-none text-gray-900"
                                >
                                    <option value="">比較対象のプリセットを選択...</option>
                                    {skillPresets.map(p => (
                                        <option key={p.id} value={p.id}>{p.preset_name}</option>
                                    ))}
                                </select>
                            </div>
                            {selectedPresetId && (
                                <div className="text-sm">
                                    {missingSkills.length > 0 ? (
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded flex items-center gap-1 border border-red-100">
                                                <AlertCircle className="w-3 h-3" /> 未所持スキル:
                                            </span>
                                            {missingSkills.map((s: string) => (
                                                <span key={s} className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold border border-red-200">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-green-600 text-xs font-bold flex items-center gap-1 bg-green-50 px-2 py-1 rounded border border-green-100 inline-block">
                                            <Check className="w-3 h-3" /> 全て習得済みです
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Editable Mode: Inline Load (Save is now in modal too, but we keep load here for convenience?)
                           Actually, user might want to Save quickly too. 
                           Since I added "Manage" button, maybe I can simplify this?
                           But sticking to requests: "Text color fix" + "Modal". 
                           Let's keep the existing "Editable Mode" UI but fix styling if needed, or simply let the Modal handle "Advanced Management"?
                           I'll leave the "Editable Mode" UI (Lines 158-200 in original) effectively replaced or simplified? 
                           Wait, if I have the Modal, do I NEED the inline save/load form?
                           The prompt said "return内にあった編集用UIを...移設・整理するイメージ".
                           This implies REMOVING it from inline and using the modal.
                           If I remove it, the interface is cleaner.
                           Let's try to remove the confusing inline form and rely on the Modal for Saving Presets.
                           Loading Presets: We still need a way to LOAD a preset into the current edit session.
                           So inline "Load Preset" dropdown or list is useful.
                        */
                        // Simplified Inline for Editable: Just Load.
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-amber-700 font-bold">読込:</span>
                                <select
                                    className="flex-1 p-1.5 text-xs border border-amber-200 rounded bg-white text-gray-900"
                                    onChange={(e) => {
                                        if (e.target.value) handleLoadPreset(e.target.value);
                                    }}
                                    value=""
                                >
                                    <option value="">プリセットから読み込む...</option>
                                    {skillPresets.map(p => (
                                        <option key={p.id} value={p.id}>{p.preset_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* selectedSkills count */}
            {!readonly && (
                <div className="text-sm text-gray-500 mb-2">
                    選択中: {selectedSkills.length} 個
                </div>
            )}

            {/* Readonly Mode: List only selected skills */}
            {readonly && (
                <div className="flex flex-wrap gap-2">
                    {selectedSkills.length === 0 && <div className="text-gray-400 text-sm">スキルなし</div>}
                    {selectedSkills.map(skill => {
                        const isSpecial = specialSkills.includes(skill); // Phase 21: check against state
                        // Highlight if matched with preset in compare mode
                        const isPresetMatch = selectedPresetId && activePreset?.skills.includes(skill);

                        return (
                            <span
                                key={skill}
                                className={`
                                    px-2 py-1 rounded text-xs font-bold border flex items-center gap-1
                                    ${isPresetMatch ? 'ring-2 ring-green-400 ring-offset-1' : ''}
                                    ${isSpecial
                                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                    }
                                `}
                            >
                                {isPresetMatch && <Check className="w-3 h-3 text-green-600" />}
                                {skill}
                            </span>
                        );
                    })}
                </div>
            )}

            {/* Editable Mode: Full Selector (Inline) */}
            {!readonly && (
                <>
                    {/* Special Skills */}
                    <div>
                        <h4 className="text-xs font-bold text-amber-600 mb-2 border-b border-amber-200 pb-1">特殊スキル (Special)</h4>
                        <div className="flex flex-wrap gap-2">
                            {specialSkills.map(skill => { // Phase 21
                                const isSelected = selectedSkills.includes(skill);
                                return (
                                    <button
                                        key={skill}
                                        onClick={() => toggleSkill(skill)}
                                        className={`
                                            px-3 py-1.5 rounded-full text-xs transition-all border
                                            ${isSelected
                                                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-amber-50'
                                            }
                                        `}
                                    >
                                        {skill}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Normal Skills */}
                    <div className="mt-4">
                        <h4 className="text-xs font-bold text-blue-600 mb-2 border-b border-blue-200 pb-1">通常スキル (Normal)</h4>
                        <div className="flex flex-wrap gap-2">
                            {normalSkills.map(skill => { // Phase 21
                                const isSelected = selectedSkills.includes(skill);
                                return (
                                    <button
                                        key={skill}
                                        onClick={() => toggleSkill(skill)}
                                        className={`
                                            px-3 py-1.5 rounded-full text-xs transition-all border flex items-center gap-1
                                            ${isSelected
                                                ? 'bg-blue-500 text-white border-blue-600 shadow-sm'
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-blue-50'
                                            }
                                        `}
                                    >
                                        {isSelected && <Check className="w-3 h-3" />}
                                        {skill}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* Manage Modal */}
            {mounted && isManageModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsManageModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Settings className="w-5 h-5 text-gray-500" />
                                スキルプリセット管理
                            </h2>
                            <button onClick={() => setIsManageModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left: Editor */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-gray-700">プリセット内容の編集</h3>
                                        <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                            選択中: {editingPresetSkills.length}
                                        </span>
                                    </div>

                                    {/* Special Skills */}
                                    <div>
                                        <h4 className="text-xs font-bold text-amber-600 mb-2">特殊スキル</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {specialSkills.map(skill => ( // Phase 21
                                                <button
                                                    key={skill}
                                                    onClick={() => toggleEditingSkill(skill)}
                                                    className={`px-3 py-1.5 rounded-full text-xs transition-all border ${editingPresetSkills.includes(skill)
                                                        ? 'bg-amber-500 text-white border-amber-600'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {skill}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Normal Skills */}
                                    <div>
                                        <h4 className="text-xs font-bold text-blue-600 mb-2">通常スキル</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {normalSkills.map(skill => ( // Phase 21
                                                <button
                                                    key={skill}
                                                    onClick={() => toggleEditingSkill(skill)}
                                                    className={`px-3 py-1.5 rounded-full text-xs transition-all border ${editingPresetSkills.includes(skill)
                                                        ? 'bg-blue-500 text-white border-blue-600'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {skill}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Save & List */}
                                <div className="space-y-6 border-l pl-0 lg:pl-6 pt-6 lg:pt-0 border-gray-100">
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-gray-700">新規保存</h3>
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                placeholder="プリセット名"
                                                value={newPresetName}
                                                onChange={(e) => setNewPresetName(e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-amber-500 outline-none text-gray-900"
                                            />
                                            <button
                                                onClick={handleSavePreset}
                                                disabled={isSavingPreset || !newPresetName}
                                                className="w-full py-2 bg-amber-600 text-white font-bold rounded hover:bg-amber-700 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                                            >
                                                <Save className="w-4 h-4" /> 保存
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="font-bold text-gray-700">保存済みリスト</h3>
                                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                            {skillPresets.length === 0 && <p className="text-xs text-gray-400">プリセットはありません</p>}
                                            {skillPresets.map(preset => (
                                                <div key={preset.id} className="group bg-white border border-gray-200 rounded p-2 shadow-sm hover:border-amber-300 transition flex justify-between items-center">
                                                    <div
                                                        className="cursor-pointer flex-1"
                                                        onClick={() => handleLoadPreset(preset.id)}
                                                    >
                                                        <div className="text-sm font-bold text-gray-800">{preset.preset_name}</div>
                                                        <div className="text-xs text-gray-500">{preset.skills.length} skills</div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeletePreset(preset.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100">
                                        <button
                                            onClick={() => setEditingPresetSkills([])}
                                            className="w-full py-2 border border-gray-300 text-gray-600 font-bold rounded hover:bg-gray-50 text-sm flex items-center justify-center gap-2"
                                        >
                                            <RotateCcw className="w-4 h-4" /> 選択をリセット
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
