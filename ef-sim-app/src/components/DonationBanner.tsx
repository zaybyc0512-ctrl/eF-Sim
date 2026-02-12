'use client';

import { Smile } from 'lucide-react';

export function DonationBanner() {
    return (
        <a
            href="https://doneru.jp/takoyakiii"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between bg-black text-white p-4 rounded-xl shadow-lg hover:opacity-90 transition-opacity group w-full max-w-sm mx-auto sm:max-w-none"
        >
            {/* Left Side: Text */}
            <div className="flex flex-col">
                <span className="font-black text-3xl tracking-tighter leading-none italic">DONATE</span>
                <span className="font-bold text-2xl leading-none mt-1">どねる！</span>
            </div>

            {/* Right Side: Icon Graphic */}
            <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="absolute inset-0 bg-purple-600 rounded-full animate-pulse opacity-20"></div>
                <div className="relative bg-purple-600 w-12 h-12 rounded-full flex items-center justify-center border-2 border-purple-400 shadow-inner">
                    <Smile className="w-8 h-8 text-yellow-400 fill-yellow-400 rotate-12 group-hover:rotate-0 transition-transform duration-300" />
                </div>
            </div>
        </a>
    );
}
