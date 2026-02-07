"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { createClient } from '@supabase/supabase-js';
import { analyzeImage, extractCardType } from '@/utils/ocr';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function ImageUploader() {
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [cardTypeInput, setCardTypeInput] = useState<string>('');
    const [status, setStatus] = useState<string>('idle');

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setStatus('processing');
        setCardTypeInput('');

        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        try {
            // 画像アップロード
            const filename = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabase.storage
                .from('player-images')
                .upload(filename, file);

            if (uploadError) throw uploadError;

            // OCR解析
            const text = await analyzeImage(file);
            console.log("Raw OCR Text:", text);

            // 抽出ロジック
            const extracted = extractCardType(text);
            if (extracted) {
                setCardTypeInput(extracted);
            } else {
                setCardTypeInput(text.replace(/[\r\n]+/g, ' ').trim());
            }

            setStatus('done');

        } catch (err: any) {
            console.error(err);
            setStatus('error');
        } finally {
            setUploading(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        multiple: false
    });

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div
                {...getRootProps()}
                className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        `}
            >
                <input {...getInputProps()} />
                {status === 'processing' ? (
                    <div className="text-blue-600 animate-pulse font-bold">
                        解析中...
                    </div>
                ) : (
                    <div>
                        <p className="text-gray-500">
                            画像をドラッグ＆ドロップ<br />
                            <span className="text-xs">（OCR後に手動修正できます）</span>
                        </p>
                    </div>
                )}
            </div>

            {previewUrl && (
                <div className="bg-white p-6 rounded-lg shadow-md border">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="w-full md:w-1/2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">プレビュー</label>
                            <div className="relative aspect-video bg-black rounded border overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={previewUrl} alt="Preview" className="object-contain w-full h-full" />
                            </div>
                        </div>

                        <div className="w-full md:w-1/2 flex flex-col justify-center">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                選手カード種別 (ID)
                            </label>
                            <input
                                type="text"
                                value={cardTypeInput}
                                onChange={(e) => setCardTypeInput(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-bold"
                            />
                            <button
                                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
                                onClick={() => alert(`登録データ: ${cardTypeInput}`)}
                            >
                                登録する
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}