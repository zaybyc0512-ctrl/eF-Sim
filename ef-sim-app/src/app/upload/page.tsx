'use client';

import { ImageUploader } from '@/components/ImageUploader';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function UploadPage() {
    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">

                {/* Back Button */}
                <div className="mb-6">
                    <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 transition">
                        <ArrowLeft className="w-5 h-5 mr-1" />
                        トップページに戻る
                    </Link>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900">
                        新規選手登録
                    </h1>
                    <p className="mt-2 text-gray-500">
                        スクリーンショットをアップロードして能力値を自動入力します
                    </p>
                </div>

                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <ImageUploader />
                </div>
            </div>
        </div>
    );
}
