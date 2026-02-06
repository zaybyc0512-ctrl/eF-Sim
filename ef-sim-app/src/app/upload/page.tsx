import React from 'react';
import { ImageUploader } from '@/components/ImageUploader';

export default function UploadPage() {
    return (
        <div className="container mx-auto p-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">New Post (OCR Test)</h1>

            <div className="space-y-4 mb-8">
                <h2 className="text-xl font-semibold">Instructions</h2>
                <ul className="list-disc list-inside text-gray-600">
                    <li>Upload an eFootball player screenshot (e.g., from Player Detail screen).</li>
                    <li>The system will automatically attempt to read the text.</li>
                    <li>We are specifically looking for card types like <strong>"Big Time 11 Jan '15"</strong> in the debug output.</li>
                </ul>
            </div>

            <ImageUploader />
        </div>
    );
}
