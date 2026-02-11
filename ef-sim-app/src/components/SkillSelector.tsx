import React from 'react';
import { Check, Plus } from 'lucide-react';

interface SkillSelectorProps {
    selectedSkills?: string[];
    onChange?: (skills: string[]) => void;
    readonly?: boolean;
}

const NORMAL_SKILLS = [
    'シザース', 'ダブルタッチ', 'エラシコ', 'ルーレット', 'シャペウ', 'エッジターン', '軸裏ターン', '軸足当て', '足裏コントロール',
    'ヘッダー', 'コントロールカーブ', 'コントロールループ', '無回転シュート', 'ドロップシュート', 'ライジングシュート', 'ミドルシュート',
    'アクロバティックシュート', 'ヒールトリック', 'ワンタッチシュート', 'ワンタッチパス', 'スルーパス', 'バックスピンロブ',
    'ピンポイントクロス', 'アウトスピンキック', 'ラボーナ', 'ノールックパス', '低弾道ロブ', '低弾道パントキック', '高弾道パントキック',
    'ロングスロー', 'GKロングスロー', 'PKキッカー', 'PKストッパー', 'マリーシア', 'マンマーク', 'チェイシング', 'インターセプト',
    'ブロッカー', 'エアバトル', 'スライディングタックル', 'アクロバティッククリア', 'キャプテンシー', 'スーパーサブ', '闘争心'
];

const SPECIAL_SKILLS = [
    'モメンタムドリブル', 'アクセルバースト', 'マグネットフィート', 'バレッドヘッド', 'ブリッツカーブ', 'ロースクリーマー',
    'フェノミナルフィニッシュ', 'ウィルパワー', 'エッジクロス', 'ゲームチェンジパス', 'ビジョナリーパス', 'フェノミナルパス',
    'GKディレクティングディフェンス', 'GKスピリットロア', 'ロングリーチタックル', 'フォートレス', 'エアリアルフォート'
];

export function SkillSelector({ selectedSkills = [], onChange, readonly = false }: SkillSelectorProps) {

    const toggleSkill = (skill: string) => {
        if (readonly || !onChange) return;

        if (selectedSkills.includes(skill)) {
            onChange(selectedSkills.filter(s => s !== skill));
        } else {
            onChange([...selectedSkills, skill]);
        }
    };

    // readonlyモード: 選択されたスキルのみ表示
    if (readonly) {
        if (selectedSkills.length === 0) return <div className="text-gray-400 text-sm">スキルなし</div>;

        return (
            <div className="flex flex-wrap gap-2">
                {selectedSkills.map(skill => {
                    const isSpecial = SPECIAL_SKILLS.includes(skill);
                    return (
                        <span
                            key={skill}
                            className={`
                                px-2 py-1 rounded text-xs font-bold border
                                ${isSpecial
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }
                            `}
                        >
                            {skill}
                        </span>
                    );
                })}
            </div>
        );
    }

    // 編集モード
    return (
        <div className="space-y-6">
            {/* selectedSkills count */}
            <div className="text-sm text-gray-500 mb-2">
                選択中: {selectedSkills.length} 個
            </div>

            {/* Special Skills */}
            <div>
                <h4 className="text-xs font-bold text-amber-600 mb-2 border-b border-amber-200 pb-1">特殊スキル (Special)</h4>
                <div className="flex flex-wrap gap-2">
                    {SPECIAL_SKILLS.map(skill => {
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
            <div>
                <h4 className="text-xs font-bold text-blue-600 mb-2 border-b border-blue-200 pb-1">通常スキル (Normal)</h4>
                <div className="flex flex-wrap gap-2">
                    {NORMAL_SKILLS.map(skill => {
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
        </div>
    );
}
