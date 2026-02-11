"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { createClient } from '@supabase/supabase-js';
import Cropper from 'react-easy-crop'; // Phase 10
import { analyzeImage, extractCardType, analyzeStatsImages } from '@/utils/ocr';
import getCroppedImg from '@/utils/canvasUtils'; // Phase 10
import { normalizeString } from '@/utils/normalization';
import { Loader2, CheckCircle, AlertCircle, Upload, ChevronDown, ChevronUp, Crop as CropIcon, X, Minus, Plus } from 'lucide-react'; // アイコン追加
import { PositionMap } from '@/components/PositionMap'; // Phase 17
import { SkillSelector } from '@/components/SkillSelector'; // Phase 17

// 共通ステッパーコンポーネント (長押し連続入力対応)
const NumberStepper = ({
    value,
    onChange,
    min = 0,
    max = 99
}: {
    value: number | string,
    onChange: (val: string) => void,
    min?: number,
    max?: number
}) => {
    const valueRef = useRef(value);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 常に最新のvalueをRefに保持 (setInterval内での古いstate参照を防ぐため)
    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    const stopAction = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
    };

    const startAction = (direction: 1 | -1) => {
        // 最初の1クリック分を即座に実行
        const current = Number(valueRef.current) || min;
        const next = current + direction;
        if (next >= min && next <= max) onChange(String(next));

        // 長押し判定 (400ms後に連続入力開始)
        timeoutRef.current = setTimeout(() => {
            intervalRef.current = setInterval(() => {
                const currentVal = Number(valueRef.current) || min;
                const nextVal = currentVal + direction;
                if (nextVal >= min && nextVal <= max) {
                    onChange(String(nextVal));
                } else {
                    stopAction(); // 限界値に達したら止める
                }
            }, 50); // 50ms間隔で連続入力
        }, 400);
    };

    // クリーンアップ
    useEffect(() => {
        return () => stopAction();
    }, []);

    return (
        <div className="flex items-center justify-between bg-white rounded-md border border-gray-300 shadow-sm overflow-hidden h-10 w-32 shrink-0">
            <button
                type="button"
                onMouseDown={() => startAction(-1)}
                onMouseUp={stopAction}
                onMouseLeave={stopAction}
                onTouchStart={() => startAction(-1)}
                onTouchEnd={stopAction}
                className="w-10 h-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors active:bg-gray-200 border-r border-gray-200 select-none"
            >
                <Minus className="w-4 h-4 pointer-events-none" />
            </button>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 w-full text-center font-mono font-bold text-gray-800 outline-none p-0 text-sm appearance-none"
                min={min}
                max={max}
            />
            <button
                type="button"
                onMouseDown={() => startAction(1)}
                onMouseUp={stopAction}
                onMouseLeave={stopAction}
                onTouchStart={() => startAction(1)}
                onTouchEnd={stopAction}
                className="w-10 h-full flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors active:bg-blue-200 border-l border-blue-200 select-none"
            >
                <Plus className="w-4 h-4 pointer-events-none" />
            </button>
        </div>
    );
};

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * UI表示用の能力値リスト (STAT_MAPの逆引き + グループ化用)
 */
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
    // Phase 17: Removed 'Other' group (moved to Profile inputs)
];

// Phase 17: Booster Type Definition
type Booster = {
    id: string;
    name: string;
    type: 'normal' | 'special' | 'squad_link';
    targets: string[] | 'all';
    default_value: number;
};

export function ImageUploader() {
    // フォームの状態管理
    const [name, setName] = useState('');
    const [team, setTeam] = useState('');
    const [nationality, setNationality] = useState('');
    const [cardType, setCardType] = useState('');
    const [maxLevel, setMaxLevel] = useState<number | string>(''); // Phase 13.5

    // Phase 17: Booster States
    const [boosters, setBoosters] = useState<Booster[]>([]);
    const [selectedBoosterId, setSelectedBoosterId] = useState<string>('');
    const [customBoosterName, setCustomBoosterName] = useState('');
    const [customBoosterTargets, setCustomBoosterTargets] = useState<string[]>([]); // Phase 17: Changed to array
    const [customBoosterValue, setCustomBoosterValue] = useState(0);

    // Phase 17: Profile Fields
    const [height, setHeight] = useState<number | string>('');
    const [age, setAge] = useState<number | string>('');
    const [dominantFoot, setDominantFoot] = useState('右足');
    const [playstyle, setPlaystyle] = useState('なし');
    const [weakFootUsage, setWeakFootUsage] = useState('普通');
    const [weakFootAccuracy, setWeakFootAccuracy] = useState('普通');
    const [form, setForm] = useState('普通');
    const [injuryResistance, setInjuryResistance] = useState('通常');

    // Phase 17: Complex UI States
    const [positions, setPositions] = useState<Record<string, number>>({});
    const [skills, setSkills] = useState<string[]>([]);
    const [presetList, setPresetList] = useState<any[]>([]); // Added for useEffect

    // Accordion State
    const [openSection, setOpenSection] = useState<string>('basic');
    const toggleSection = (section: string) => setOpenSection(prev => prev === section ? '' : section);

    // 能力値の状態管理 (Record<string, string | number>)
    const [stats, setStats] = useState<Record<string, string | number>>({});

    // システムの状態管理
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'processing' | 'ready' | 'saving' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    // UI制御
    const [showStats, setShowStats] = useState(true);

    // Cropper State (Phase 10)
    const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null); // 切り抜き前の元画像URL
    const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null); // 切り抜き後のBlob
    const [isCropping, setIsCropping] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleCropConfirm = async () => {
        if (!originalImageSrc || !croppedAreaPixels) return;
        try {
            const croppedBlob = await getCroppedImg(originalImageSrc, croppedAreaPixels);
            if (croppedBlob) {
                setCroppedImageBlob(croppedBlob);
                const objectUrl = URL.createObjectURL(croppedBlob);
                setPreviewUrl(objectUrl); // プレビューを切り抜き後のものに更新
                setIsCropping(false);
            }
        } catch (e) {
            console.error(e);
            setMessage('画像の切り抜きに失敗しました。');
        }
    };


    // メイン画像Dropzone
    const onDropMain = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setStatus('processing');
        setMessage('');

        // 1. 画像読み込み & OCR開始
        const objectUrl = URL.createObjectURL(file);
        setOriginalImageSrc(objectUrl); // 元画像を保存
        setPreviewUrl(objectUrl); // 一旦プレビュー表示

        // 切り抜きモーダルをオープン
        setIsCropping(true);

        try {
            // NOTE: ここではまだアップロードしない (Phase 10)
            // OCRは元画像に対して実行
            const result = await analyzeImage(file);
            console.log("OCR Result:", result);

            // データ抽出 & プリセット
            const extractedType = extractCardType(result.fullText);
            const anchorType = result.cardTypeText ? normalizeString(result.cardTypeText) : '';
            setCardType(extractedType || anchorType || '');

            if (result.nameText) setName(normalizeString(result.nameText));
            if (result.nationalityText) setNationality(normalizeString(result.nationalityText));
            if (result.teamText) setTeam(normalizeString(result.teamText));

            setStatus('ready');

        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setMessage('画像の読み込み・OCR解析に失敗しました。');
        }
    }, []);

    // 能力値画像Dropzone
    const onDropStats = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        setStatus('processing');
        setMessage('能力値画像を解析中...');

        try {
            const detectedStats = await analyzeStatsImages(acceptedFiles);
            console.log("Detected Stats:", detectedStats);
            setStats(prev => ({ ...prev, ...detectedStats }));

            setStatus('ready');
            setMessage('能力値の読み取りが完了しました。');
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setMessage('能力値画像の読み取りに失敗しました。');
        }
    }, []);

    // Phase 17: 初期データロード (Presets & Boosters)
    useEffect(() => {
        const fetchInitialData = async () => {
            // Allocations
            const { data: presetData } = await supabase
                .from('allocation_presets')
                .select('*')
                .order('created_at', { ascending: false });
            if (presetData) setPresetList(presetData);

            // Boosters
            const { data: boosterData } = await supabase
                .from('boosters')
                .select('*')
                .order('type', { ascending: false }) // Special -> Normal -> Link
                .order('name');
            if (boosterData) setBoosters(boosterData as Booster[]);
        };
        fetchInitialData();
    }, []);

    const handleRegister = async () => {
        if (!name || !cardType) {
            alert('選手名とカード種別は必須です。');
            return;
        }
        if (!croppedImageBlob) {
            alert('画像がアップロードされていません。');
            return;
        }

        setStatus('saving');

        const finalName = normalizeString(name);
        const finalTeam = normalizeString(team);
        const finalNationality = normalizeString(nationality);
        const finalCardType = normalizeString(cardType);

        setName(finalName);
        setTeam(finalTeam);
        setNationality(finalNationality);
        setCardType(finalCardType);

        // Phase 17: Construct custom_booster JSON
        let finalCustomBooster: any[] = [];
        if (selectedBoosterId) {
            const targetsArray = customBoosterTargets.includes('all') ? 'all' : customBoosterTargets;

            finalCustomBooster = [{
                name: customBoosterName,
                targets: targetsArray,
                value: customBoosterValue
            }];
        }

        try {
            // 2. 切り抜いたBlobをアップロード (Phase 10)
            // 日本語を避け、安全なファイル名にする
            const filename = `${Date.now()}_cropped_icon.webp`;

            const { data, error: uploadError } = await supabase.storage
                .from('player-images')
                .upload(filename, croppedImageBlob, {
                    contentType: 'image/webp'
                });

            if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

            const { data: { publicUrl } } = supabase.storage
                .from('player-images')
                .getPublicUrl(data.path);

            // 4. データベースへ保存
            const { error } = await supabase
                .from('players')
                .insert({
                    name: finalName,
                    team: finalTeam,
                    nationality: finalNationality,
                    card_type: finalCardType,
                    evidence_url: publicUrl, // 切り抜き画像のURL
                    max_level: Number(maxLevel) || 1, // Phase 13.5
                    // Phase 17: New Profile Fields
                    height: Number(height) || null,
                    age: Number(age) || null,
                    dominant_foot: dominantFoot,
                    playstyle: playstyle,
                    weak_foot_usage: weakFootUsage,
                    weak_foot_accuracy: weakFootAccuracy,
                    form: form,
                    injury_resistance: injuryResistance,
                    positions: positions,
                    skills: skills,
                    custom_booster: finalCustomBooster, // Phase 17: Unique Booster
                    ...Object.fromEntries(
                        Object.entries(stats).map(([k, v]) => [k, v === '' ? null : Number(v)])
                    )
                });

            if (error) {
                if (error.code === '23505') {
                    throw new Error('このカードは既に登録されています！(重複エラー)');
                }
                throw error;
            }

            setStatus('success');
            setMessage('登録が完了しました！');

            // フォームリセット
            setTimeout(() => {
                setPreviewUrl(null);
                setOriginalImageSrc(null);
                setCroppedImageBlob(null);
                setIsCropping(false);
                setName('');
                setTeam('');
                setNationality('');
                setCardType('');
                // Phase 17 Reset
                setHeight('');
                setAge('');
                setDominantFoot('右足');
                setPlaystyle('なし');
                setWeakFootUsage('普通');
                setWeakFootAccuracy('普通');
                setForm('普通');
                setInjuryResistance('通常');
                setPositions({});
                setSkills([]);
                setStats({});
                setStatus('idle');
                setMessage('');
            }, 3000);

        } catch (err: any) {
            console.error(err);
            setStatus('error');

            let errorMessage = '予期せぬエラーが発生しました。';
            const rawMessage = err.message || '';

            if (rawMessage.includes('nationality') && rawMessage.includes('column')) {
                errorMessage = 'システムエラー: 国籍(nationality)カラムが見つかりません。';
            } else if (rawMessage.includes('重複エラー')) {
                errorMessage = rawMessage;
            } else if (rawMessage) {
                errorMessage = `エラー: ${rawMessage}`;
            }

            setMessage(errorMessage);
        }
    };

    const { getRootProps: getRootPropsMain, getInputProps: getInputPropsMain, isDragActive: isDragActiveMain } = useDropzone({
        onDrop: onDropMain,
        accept: { 'image/*': [] },
        multiple: false
    });

    const { getRootProps: getRootPropsStats, getInputProps: getInputPropsStats, isDragActive: isDragActiveStats } = useDropzone({
        onDrop: onDropStats,
        accept: { 'image/*': [] },
        multiple: true
    });

    const inputClass = "w-full p-2 border border-gray-300 rounded text-black bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition";

    return (
        <div className="space-y-8 max-w-4xl mx-auto text-gray-900 pb-20 relative">

            {/* 切り抜きモーダル */}
            {isCropping && originalImageSrc && (
                <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-4 w-full max-w-2xl h-[80vh] flex flex-col relative">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <CropIcon className="w-5 h-5" />
                                アイコン用に画像を切り抜き
                            </h3>
                            <button onClick={() => setIsCropping(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="relative flex-1 bg-gray-100 rounded overflow-hidden">
                            <Cropper
                                image={originalImageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1} // 1:1 正方形
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                            />
                        </div>

                        <div className="mt-4 flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">ズーム</span>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="flex-1"
                                />
                            </div>
                            <button
                                onClick={handleCropConfirm}
                                className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
                            >
                                切り抜きを確定
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* メイン: 基本情報画像ドロップゾーン */}
            <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                    <Upload className="w-6 h-6" />
                    1. 基本情報画像のアップロード
                </h2>
                <div
                    {...getRootPropsMain()}
                    className={`
            border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
            ${isDragActiveMain ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            `}
                >
                    <input {...getInputPropsMain()} />
                    {status === 'processing' && !previewUrl ? (
                        <div className="text-blue-600 animate-pulse font-bold flex flex-col items-center">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <span>解析中... 画像から文字を読んでいます</span>
                        </div>
                    ) : (
                        <div>
                            <p className="text-gray-500">
                                選手カード画像をここにドロップ<br />
                                <span className="text-xs">（名前、チーム、カード種別を自動入力）</span>
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* プレビューと入力フォーム */}
            {previewUrl && (
                <div className="bg-white p-6 rounded-lg shadow-md border animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex flex-col md:flex-row gap-6 mb-8">
                        {/* 画像プレビュー */}
                        <div className="w-full md:w-1/3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                アイコンプレビュー
                                <button
                                    onClick={() => { setIsCropping(true); }}
                                    className="ml-2 text-xs text-blue-600 underline"
                                >
                                    (再編集)
                                </button>
                            </label>
                            {/* アスペクト比修正: 正方形で見せる */}
                            <div className="relative aspect-square bg-gray-100 rounded border overflow-hidden flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="object-contain w-full h-full"
                                />
                            </div>
                        </div>

                        {/* 基本情報フォーム */}
                        {/* Accordion Form Container */}
                        <div className="w-full md:w-2/3 space-y-4">

                            {/* Group 1: Basic Info */}
                            <div className="border rounded-lg overflow-hidden bg-white">
                                <button
                                    onClick={() => toggleSection('basic')}
                                    className="w-full p-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition"
                                >
                                    <h3 className="font-bold text-gray-800">1. 基本情報 (Basic Info)</h3>
                                    {openSection === 'basic' ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                                </button>

                                {openSection === 'basic' && (
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 fade-in duration-200">
                                        {/* 選手名 */}
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                                選手名 <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className={inputClass}
                                                placeholder="例: リオネル メッシ"
                                            />
                                            <div className="mt-1.5 flex items-start gap-1 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                                                <span className="shrink-0 leading-tight">⚠️</span>
                                                <p className="leading-tight">
                                                    <strong>ご注意:</strong> 「バ」や「パ」などの濁音・半濁音が正しく読み取れない場合があります。登録前に必ず選手名をご確認ください。
                                                </p>
                                            </div>
                                        </div>

                                        {/* 所属チーム */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">所属チーム</label>
                                            <input
                                                type="text"
                                                value={team}
                                                onChange={(e) => setTeam(e.target.value)}
                                                className={inputClass}
                                                placeholder="例: FC バルセロナ"
                                            />
                                        </div>

                                        {/* 国籍・地域 */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">国籍・地域</label>
                                            <input
                                                type="text"
                                                value={nationality}
                                                onChange={(e) => setNationality(e.target.value)}
                                                className={inputClass}
                                                placeholder="例: アルゼンチン"
                                            />
                                        </div>

                                        {/* カード種別 */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                                カード種別 <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={cardType}
                                                onChange={(e) => setCardType(e.target.value)}
                                                className={`${inputClass} font-mono text-sm`}
                                                placeholder="例: Big Time"
                                            />
                                        </div>

                                        {/* 最大レベル */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                                最大レベル <span className="text-red-500">*</span>
                                            </label>
                                            <NumberStepper
                                                value={maxLevel}
                                                onChange={(val) => setMaxLevel(val)}
                                                min={1}
                                                max={100}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Group 2: Profile Details */}
                            <div className="border rounded-lg overflow-hidden bg-white">
                                <button
                                    onClick={() => toggleSection('profile')}
                                    className="w-full p-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition"
                                >
                                    <h3 className="font-bold text-gray-800">2. プロフィール詳細 (Profile)</h3>
                                    {openSection === 'profile' ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                                </button>

                                {openSection === 'profile' && (
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 fade-in duration-200">
                                        {/* 身長 / 年齢 */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">身長 (cm)</label>
                                            <NumberStepper
                                                value={height}
                                                onChange={(val) => setHeight(val)}
                                                min={140}
                                                max={220}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">年齢</label>
                                            <NumberStepper
                                                value={age}
                                                onChange={(val) => setAge(val)}
                                                min={15}
                                                max={50}
                                            />
                                        </div>

                                        {/* 利き足 */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">利き足</label>
                                            <select
                                                value={dominantFoot}
                                                onChange={(e) => setDominantFoot(e.target.value)}
                                                className={inputClass}
                                            >
                                                <option value="右足">右足</option>
                                                <option value="左足">左足</option>
                                            </select>
                                        </div>

                                        {/* プレイスタイル */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">プレイスタイル</label>
                                            <select
                                                value={playstyle}
                                                onChange={(e) => setPlaystyle(e.target.value)}
                                                className={inputClass}
                                            >
                                                {['ラインブレイカー', 'デコイラン', 'ボックスストライカー', 'ターゲットマン', 'リンクフォワード', 'チャンスメイカー', 'ウイングストライカー', 'インサイドレシーバー', 'クロサー', 'ナンバー10', '2列目からの飛び出し', 'ボックストゥボックス', 'アンカー', 'ハードプレス', 'プレーメイカー', 'ビルドアップ', 'オーバーラップ', '攻撃的サイドバック', '守備的サイドバック', 'インナーラップサイドバック', '攻撃的GK', '守備的GK', 'なし'].map(p => (
                                                    <option key={p} value={p}>{p}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* 逆足頻度 / 精度 */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">逆足頻度</label>
                                            <select
                                                value={weakFootUsage}
                                                onChange={(e) => setWeakFootUsage(e.target.value)}
                                                className={inputClass}
                                            >
                                                {['やや低い', '普通', '高い', '最高'].map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">逆足精度</label>
                                            <select
                                                value={weakFootAccuracy}
                                                onChange={(e) => setWeakFootAccuracy(e.target.value)}
                                                className={inputClass}
                                            >
                                                {['やや低い', '普通', '高い', '最高'].map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>

                                        {/* コンディション / 怪我耐性 */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">コンディションの波</label>
                                            <select
                                                value={form}
                                                onChange={(e) => setForm(e.target.value)}
                                                className={inputClass}
                                            >
                                                {['小さい', '普通', '大きい'].map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">怪我耐性</label>
                                            <select
                                                value={injuryResistance}
                                                onChange={(e) => setInjuryResistance(e.target.value)}
                                                className={inputClass}
                                            >
                                                {['低い', '通常', '高い'].map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Group 3: Advanced */}
                            <div className="border rounded-lg overflow-hidden bg-white">
                                <button
                                    onClick={() => toggleSection('advanced')}
                                    className="w-full p-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition"
                                >
                                    <h3 className="font-bold text-gray-800">3. 適正・スキル・ブースター (Advanced)</h3>
                                    {openSection === 'advanced' ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                                </button>
                                {openSection === 'advanced' && (
                                    <div className="p-6 space-y-8 animate-in slide-in-from-top-2 fade-in duration-200">

                                        {/* Position Map */}
                                        <div>
                                            <h4 className="font-bold text-gray-700 mb-3 border-b pb-1">ポジション適性</h4>
                                            <p className="text-xs text-gray-500 mb-2">クリックで切り替え: なし(黒) → 準適性(薄緑) → 本適性(濃緑)</p>
                                            <PositionMap
                                                value={positions}
                                                onChange={setPositions}
                                            />
                                        </div>

                                        {/* Skill Selector */}
                                        <div>
                                            <h4 className="font-bold text-gray-700 mb-3 border-b pb-1">所持スキル</h4>
                                            <SkillSelector
                                                selectedSkills={skills}
                                                onChange={setSkills}
                                            />
                                        </div>

                                        {/* Phase 17: Unique Booster UI */}
                                        <div>
                                            <h4 className="font-bold text-gray-700 mb-3 border-b pb-1 mt-6">個別ブースター (Unique Booster)</h4>
                                            <select
                                                value={selectedBoosterId}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setSelectedBoosterId(val);
                                                    if (val && val !== 'custom') {
                                                        const b = boosters.find(b => b.id === val);
                                                        if (b) {
                                                            setCustomBoosterName(b.name);
                                                            setCustomBoosterTargets(b.targets === 'all' ? ['all'] : Array.isArray(b.targets) ? b.targets : []);
                                                            setCustomBoosterValue(b.default_value);
                                                        }
                                                    } else {
                                                        setCustomBoosterName('');
                                                        setCustomBoosterTargets([]);
                                                        setCustomBoosterValue(0);
                                                    }
                                                }}
                                                className={inputClass}
                                            >
                                                <option value="">-- なし --</option>
                                                {boosters.map(b => (
                                                    <option key={b.id} value={b.id}>
                                                        [{b.type === 'normal' ? 'N' : b.type === 'special' ? 'S' : 'L'}] {b.name}
                                                    </option>
                                                ))}
                                                <option value="custom">-- カスタム入力 --</option>
                                            </select>

                                            {selectedBoosterId && (
                                                <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-purple-700 mb-1">ブースター名</label>
                                                        <input type="text" value={customBoosterName} onChange={(e) => setCustomBoosterName(e.target.value)} className={inputClass} disabled={selectedBoosterId !== 'custom'} placeholder="例: 神の子" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className="block text-xs font-bold text-purple-700">対象能力</label>
                                                            <button
                                                                type="button"
                                                                disabled={selectedBoosterId !== 'custom'}
                                                                onClick={() => {
                                                                    if (customBoosterTargets.includes('all')) {
                                                                        setCustomBoosterTargets([]);
                                                                    } else {
                                                                        setCustomBoosterTargets(['all']);
                                                                    }
                                                                }}
                                                                className={`text-xs px-2 py-1 rounded border ${customBoosterTargets.includes('all')
                                                                    ? 'bg-purple-600 text-white border-purple-600'
                                                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                                                    } transition disabled:opacity-50`}
                                                            >
                                                                全能力 (All)
                                                            </button>
                                                        </div>

                                                        {customBoosterTargets.includes('all') ? (
                                                            <div className="p-3 bg-purple-100/50 rounded-lg border border-purple-100 text-center">
                                                                <span className="text-sm font-bold text-purple-800">全能力値が対象です</span>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 bg-white rounded border border-gray-200">
                                                                {STAT_GROUPS.flatMap(g => g.items).map(item => (
                                                                    <label key={item.key} className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer transition ${customBoosterTargets.includes(item.key) ? 'bg-purple-100 text-purple-900 font-bold' : 'hover:bg-gray-50 text-gray-700'}`}>
                                                                        <input
                                                                            type="checkbox"
                                                                            disabled={selectedBoosterId !== 'custom'}
                                                                            checked={customBoosterTargets.includes(item.key)}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setCustomBoosterTargets([...customBoosterTargets, item.key]);
                                                                                } else {
                                                                                    setCustomBoosterTargets(customBoosterTargets.filter(t => t !== item.key));
                                                                                }
                                                                            }}
                                                                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                                        />
                                                                        {item.label}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-purple-700 mb-1">補正値</label>
                                                        <NumberStepper value={customBoosterValue} onChange={(val) => setCustomBoosterValue(Number(val))} min={0} max={10} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <p className="text-xs text-amber-600 mt-2 px-1">※全てのスペースは保存時に削除されます。</p>
                        </div>
                    </div>

                    {/* 能力値セクション */}
                    <div className="border-t pt-6">
                        <button
                            onClick={() => setShowStats(!showStats)}
                            className="flex items-center justify-between w-full text-left mb-4"
                        >
                            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                                <span>2. 能力値 (画像読み取り / 手動入力)</span>
                            </h2>
                            {showStats ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                        </button>

                        {showStats && (
                            <div className="animate-in slide-in-from-top-2 fade-in">
                                {/* 注意書き: タレントデザイン画面推奨 */}
                                <div className="bg-red-50 p-3 rounded mb-4 text-sm text-red-700 font-bold border border-red-200 flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <div>
                                        ⚠️ 重要: タレントポイントを全く振り分けていない「タレントデザイン」画面の画像を使用してください。<br />
                                        <span className="font-normal text-xs text-red-600">（補正がかかっていると正しい初期値が登録できません）</span>
                                    </div>
                                </div>

                                {/* 能力値画像ドロップゾーン */}
                                <div
                                    {...getRootPropsStats()}
                                    className={`
                                        border-2 border-dashed rounded-lg p-6 mb-6 text-center cursor-pointer transition-colors
                                        ${isDragActiveStats ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'}
                                    `}
                                >
                                    <input {...getInputPropsStats()} />
                                    {status === 'processing' && previewUrl ? ( // previewUrlがある＝メイン処理済み、ここでprocessingならStats処理中
                                        <div className="text-green-600 animate-pulse font-bold flex flex-col items-center">
                                            <Loader2 className="w-6 h-6 animate-spin mb-2" />
                                            <span>能力値を解析中...</span>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">
                                            能力値の画像をここにドロップ（複数枚可）<br />
                                            <span className="text-xs">スクロールが必要な場合は複数枚アップロードしてください</span>
                                        </p>
                                    )}
                                </div>

                                {/* 能力値入力グリッド */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {STAT_GROUPS.map((group) => (
                                        <div key={group.title} className="bg-gray-50 p-4 rounded border">
                                            <h4 className="font-bold text-gray-700 mb-3 border-b pb-1 text-center">{group.title}</h4>
                                            <div className="space-y-3">
                                                {group.items.map((item) => (
                                                    <div key={item.key} className="flex items-center justify-between">
                                                        <label className="text-sm text-gray-600">{item.label}</label>
                                                        <NumberStepper
                                                            value={stats[item.key] ?? ''}
                                                            onChange={(val) => setStats({ ...stats, [item.key]: val })}
                                                            min={40}
                                                            max={103}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 登録アクション */}
                    <div className="mt-8 flex flex-col items-center gap-4">
                        <button
                            onClick={handleRegister}
                            disabled={status === 'saving' || status === 'success'}
                            className={`
                                w-full max-w-md py-3 px-6 rounded-lg font-bold text-white transition flex justify-center items-center gap-2 shadow-lg
                                ${status === 'saving' ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                                ${status === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}
                            `}
                        >
                            {status === 'saving' && <Loader2 className="w-5 h-5 animate-spin" />}
                            {status === 'saving' ? '保存中...' : status === 'success' ? '登録完了！' : '決定して登録'}
                        </button>

                        {/* メッセージ表示エリア */}
                        {message && (
                            <div className={`p-3 rounded text-sm flex items-center gap-2 ${status === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {status === 'success' && <CheckCircle className="w-4 h-4" />}
                                {status === 'error' && <AlertCircle className="w-4 h-4" />}
                                {message}
                            </div>
                        )}
                    </div>
                </div >
            )
            }
        </div >
    );
}