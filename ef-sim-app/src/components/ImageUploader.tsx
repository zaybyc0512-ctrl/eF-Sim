"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { createClient } from '@supabase/supabase-js';
import { analyzeImage, extractCardType } from '@/utils/ocr';
import { normalizeString } from '@/utils/normalization';
import { Loader2, CheckCircle, AlertCircle, Upload } from 'lucide-react';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function ImageUploader() {
    // フォームの状態管理
    const [name, setName] = useState('');
    const [team, setTeam] = useState('');
    const [nationality, setNationality] = useState('');
    const [cardType, setCardType] = useState('');

    // システムの状態管理
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadedPath, setUploadedPath] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'processing' | 'ready' | 'saving' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setStatus('processing');
        setMessage('');

        // プレビュー表示
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        try {
            // 1. 画像アップロード
            const filename = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
            const { data, error: uploadError } = await supabase.storage
                .from('player-images')
                .upload(filename, file);

            if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

            setUploadedPath(data.path);

            // 2. OCR解析 (Full & Regions)
            const result = await analyzeImage(file);
            console.log("OCR Result:", result);

            // 3. データ抽出 & プリセット
            // Card Type
            // 優先順位: 正規表現(extractCardType) > アンカー検索(result.cardTypeText)
            const extractedType = extractCardType(result.fullText);
            const anchorType = result.cardTypeText ? normalizeString(result.cardTypeText) : '';
            setCardType(extractedType || anchorType || '');

            // Name (Normalized)
            // OCR側でクリーニング済みだが、念のため正規化を通す
            if (result.nameText) {
                const normName = normalizeString(result.nameText);
                setName(normName);
            }

            // Nationality (Normalized)
            // アンカー検索結果を正規化してセット
            if (result.nationalityText) {
                const normNationality = normalizeString(result.nationalityText);
                setNationality(normNationality);
            }

            // Team (Normalized)
            // アンカー検索結果を正規化してセット
            if (result.teamText) {
                const normTeam = normalizeString(result.teamText);
                setTeam(normTeam);
            }

            setStatus('ready'); // 入力待ち状態へ

        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setMessage('画像の読み込みに失敗しました。');
        }
    }, []);

    const handleRegister = async () => {
        if (!name || !cardType) {
            alert('選手名とカード種別は必須です。');
            return;
        }
        if (!uploadedPath) return;

        setStatus('saving');

        // 最終正規化 (ユーザーが手入力した場合のため)
        // ここで全ての入力項目に対して normalizeString を適用します
        const finalName = normalizeString(name);
        const finalTeam = normalizeString(team);
        const finalNationality = normalizeString(nationality);
        const finalCardType = normalizeString(cardType);

        // フォーム上の表示も更新しておく
        setName(finalName);
        setTeam(finalTeam);
        setNationality(finalNationality);
        setCardType(finalCardType);

        try {
            // 画像の公開URLを取得
            const { data: { publicUrl } } = supabase.storage
                .from('player-images')
                .getPublicUrl(uploadedPath);

            // 4. データベースへ保存
            const { error } = await supabase
                .from('players')
                .insert({
                    name: finalName,
                    team: finalTeam,
                    nationality: finalNationality, // 新規追加 (カラムがない場合はSupabaseでエラーになるか無視される)
                    card_type: finalCardType,
                    evidence_url: publicUrl,
                });

            if (error) {
                // 重複エラー (Error Code 23505) のハンドリング
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
                setUploadedPath(null);
                setName('');
                setTeam('');
                setNationality('');
                setCardType('');
                setStatus('idle');
                setMessage('');
            }, 3000);

        } catch (err: any) {
            console.error(err);
            setStatus('error');

            // エラーメッセージの日本語化
            let errorMessage = '予期せぬエラーが発生しました。';
            const rawMessage = err.message || '';

            if (rawMessage.includes('nationality') && rawMessage.includes('column')) {
                errorMessage = 'システムエラー: 国籍(nationality)カラムが見つかりません。';
            } else if (rawMessage.includes('重複エラー')) {
                errorMessage = rawMessage; // 既に日本語化済み
            } else if (rawMessage) {
                // その他のエラーも詳細はコンソールに出しつつ、ユーザーには汎用メッセージを表示
                // 必要に応じてここに追加
                errorMessage = `エラー: ${rawMessage}`;
            }

            setMessage(errorMessage);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        multiple: false
    });

    return (
        <div className="space-y-6 max-w-2xl mx-auto text-gray-900">
            {/* ドロップゾーン */}
            <div
                {...getRootProps()}
                className={`
          border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        `}
            >
                <input {...getInputProps()} />
                {status === 'processing' ? (
                    <div className="text-blue-600 animate-pulse font-bold flex flex-col items-center">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <span>解析中... 画像から文字を読んでいます</span>
                    </div>
                ) : (
                    <div>
                        <p className="text-gray-500">
                            ここに画像をドラッグ＆ドロップ<br />
                            <span className="text-xs">（OCRで自動入力します）</span>
                        </p>
                    </div>
                )}
            </div>

            {/* プレビューと入力フォーム */}
            {previewUrl && (
                <div className="bg-white p-6 rounded-lg shadow-md border animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex flex-col md:flex-row gap-6">

                        {/* 画像プレビュー */}
                        <div className="w-full md:w-1/2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">プレビュー</label>
                            <div className="relative aspect-video bg-black rounded border overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="object-contain w-full h-full"
                                />
                            </div>
                        </div>

                        {/* 入力フォーム */}
                        <div className="w-full md:w-1/2 flex flex-col gap-4">

                            {/* 選手名 */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    選手名 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded text-black bg-white"
                                    placeholder="例: リオネル メッシ"
                                />
                                <p className="text-xs text-amber-600 mt-1">※全てのスペースは保存時に削除されます。</p>
                            </div>

                            {/* 国籍・地域 (新規) */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">国籍・地域</label>
                                <input
                                    type="text"
                                    value={nationality}
                                    onChange={(e) => setNationality(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded text-black bg-white"
                                    placeholder="例: アルゼンチン"
                                />
                                <p className="text-xs text-amber-600 mt-1">※全てのスペースは保存時に削除されます。</p>
                            </div>

                            {/* チーム名 */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">所属チーム</label>
                                <input
                                    type="text"
                                    value={team}
                                    onChange={(e) => setTeam(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded text-black bg-white"
                                    placeholder="例: FC バルセロナ"
                                />
                                <p className="text-xs text-amber-600 mt-1">※全てのスペースは保存時に削除されます。</p>
                            </div>

                            {/* カード種別 */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    カード種別 (ID) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={cardType}
                                    onChange={(e) => setCardType(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded text-black bg-white font-mono text-sm"
                                    placeholder="例: Big Time 11 Jan '15"
                                />
                                <p className="text-xs text-amber-600 mt-1">※全てのスペースは保存時に削除されます。</p>
                            </div>

                            {/* 登録ボタン */}
                            <button
                                onClick={handleRegister}
                                disabled={status === 'saving' || status === 'success'}
                                className={`
                                    w-full py-2 px-4 rounded font-bold text-white transition flex justify-center items-center gap-2
                                    ${status === 'saving' ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                                    ${status === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}
                                `}
                            >
                                {status === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
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
                    </div>
                </div>
            )}
        </div>
    );
}