"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { analyzeImage, extractCardType } from '@/utils/ocr';

export function ImageUploader() {
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [rawText, setRawText] = useState<string>('');
    const [detectedCardType, setDetectedCardType] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClientComponentClient();

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setUploading(true);
        setAnalyzing(true);
        setError(null);
        setRawText('');
        setDetectedCardType(null);

        // 1. Create a local preview
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        try {
            // 2. Parallel execution: Upload to Storage & Run OCR
            // For a better UX, we can show OCR results even if upload fails, or vice versa.
            // But here we'll await both for simplicity in the 'processing' state.

            // --- Task A: Upload ---
            const filename = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('player-images')
                .upload(filename, file);

            if (uploadError) {
                throw new Error(`Upload failed: ${uploadError.message}`);
            }

            // --- Task B: OCR Analysis ---
            const text = await analyzeImage(file);
            setRawText(text);

            const cardType = extractCardType(text);
            setDetectedCardType(cardType);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Something went wrong');
        } finally {
            setUploading(false);
            setAnalyzing(false);
        }
    }, [supabase]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        multiple: false
    });

    return (
        <div className="space-y-6">

            {/* Drop Zone */}
            <div
                {...getRootProps()}
                className={`
          border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        `}
            >
                <input {...getInputProps()} />
                {uploading || analyzing ? (
                    <div className="text-blue-600 animate-pulse">
                        Processing... (Uploading & OCR)
                    </div>
                ) : (
                    <div>
                        {isDragActive ? (
                            <p className="text-blue-500 font-medium">Drop the image here ...</p>
                        ) : (
                            <p className="text-gray-500">Drag & drop player screenshot here, or click to select</p>
                        )}
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                    Error: {error}
                </div>
            )}

            {/* Results Preview */}
            {previewUrl && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg bg-gray-50/50">

                    {/* Image Preview */}
                    <div className="flex flex-col gap-2">
                        <h3 className="font-semibold text-gray-700">Image Preview</h3>
                        <div className="relative aspect-video bg-black rounded-md overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="object-contain w-full h-full"
                            />
                        </div>
                    </div>

                    {/* OCR Debug Info */}
                    <div className="flex flex-col gap-2">
                        <h3 className="font-semibold text-gray-700">OCR Debug Info</h3>

                        <div className="p-3 bg-white border rounded-md shadow-sm">
                            <span className="text-xs font-bold text-gray-400 uppercase">Detected Card Type</span>
                            <div className="text-lg font-bold text-blue-600">
                                {detectedCardType ? detectedCardType : "Not Found"}
                            </div>
                        </div>

                        <div className="flex-1 p-3 bg-white border rounded-md shadow-sm overflow-auto max-h-60">
                            <span className="text-xs font-bold text-gray-400 uppercase">Raw Text</span>
                            <pre className="text-xs text-gray-600 whitespace-pre-wrap mt-1">
                                {rawText || "Waiting for analysis..."}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
