import React from 'react';

// ポジション定義 (Row, Col, Label)
// Grid: 3 columns x 7 rows
// Rows:
// 1: LWG, CF, RWG
// 2: ST
// 3: OMF
// 4: LMF, CMF, RMF
// 5: DMF
// 6: LSB, CB, RSB
// 7: GK

type PositionKey = 'LWG' | 'CF' | 'RWG' | 'ST' | 'OMF' | 'LMF' | 'CMF' | 'RMF' | 'DMF' | 'LSB' | 'CB' | 'RSB' | 'GK';

interface PositionMapProps {
    value?: Record<string, number>; // 0: None, 1: Semi, 2: Full
    onChange?: (newValue: Record<string, number>) => void;
    readonly?: boolean;
}

const POSITION_LAYOUT: { key: PositionKey; label: string; row: number; col: number }[] = [
    { key: 'LWG', label: 'LWG', row: 1, col: 1 },
    { key: 'CF', label: 'CF', row: 1, col: 2 },
    { key: 'RWG', label: 'RWG', row: 1, col: 3 },

    { key: 'ST', label: 'ST', row: 2, col: 2 },

    { key: 'OMF', label: 'OMF', row: 3, col: 2 },

    { key: 'LMF', label: 'LMF', row: 4, col: 1 },
    { key: 'CMF', label: 'CMF', row: 4, col: 2 },
    { key: 'RMF', label: 'RMF', row: 4, col: 3 },

    { key: 'DMF', label: 'DMF', row: 5, col: 2 },

    { key: 'LSB', label: 'LSB', row: 6, col: 1 },
    { key: 'CB', label: 'CB', row: 6, col: 2 },
    { key: 'RSB', label: 'RSB', row: 6, col: 3 },

    { key: 'GK', label: 'GK', row: 7, col: 2 },
];

export function PositionMap({ value = {}, onChange, readonly = false }: PositionMapProps) {

    const handleClick = (key: string) => {
        if (readonly || !onChange) return;

        const currentVal = value[key] || 0;
        const nextVal = (currentVal + 1) % 3; // 0 -> 1 -> 2 -> 0

        onChange({
            ...value,
            [key]: nextVal
        });
    };

    const getColorClass = (val: number) => {
        switch (val) {
            case 2: return 'bg-lime-600 text-white border-lime-700 font-bold'; // 本適性
            case 1: return 'bg-lime-200 text-gray-900 border-lime-300 font-medium'; // 準適性
            default: return 'bg-gray-800/80 text-gray-500 border-gray-700 hover:bg-gray-700'; // 適性なし
        }
    };

    return (
        <div className="bg-gray-900 p-4 rounded-lg shadow-inner max-w-[280px] mx-auto border border-gray-700">
            <div
                className="grid grid-cols-3 gap-2"
                style={{ gridTemplateRows: 'repeat(7, 1fr)' }}
            >
                {POSITION_LAYOUT.map((pos) => {
                    const status = value[pos.key] || 0;
                    return (
                        <div
                            key={pos.key}
                            onClick={() => handleClick(pos.key)}
                            className={`
                                flex items-center justify-center text-xs rounded border cursor-pointer select-none
                                transition-all duration-200 h-8 w-full
                                ${getColorClass(status)}
                                ${readonly ? 'cursor-default' : 'active:scale-95'}
                            `}
                            style={{
                                gridRow: pos.row,
                                gridColumn: pos.col
                            }}
                        >
                            {pos.label}
                        </div>
                    );
                })}
            </div>
            {!readonly && (
                <div className="mt-2 flex justify-center gap-4 text-[10px] text-gray-400">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-800 border border-gray-700"></div>なし</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-lime-200 border border-lime-300"></div>準適性</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-lime-600 border border-lime-700"></div>本適性</div>
                </div>
            )}
        </div>
    );
}
