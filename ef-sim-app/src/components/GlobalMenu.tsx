'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Menu, X, User, LogOut, Settings, Twitter, ExternalLink, Heart } from 'lucide-react';

export function GlobalMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(true); // 仮の状態: 実際はAuth Context等から取得
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const toggleMenu = () => setIsOpen(!isOpen);

    const handleLogout = () => {
        // ログアウト処理(仮)
        setIsLoggedIn(false);
        alert('Logged out (Demo)');
    };

    return (
        <>
            {/* Hamburger Button */}
            <button
                onClick={toggleMenu}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
                aria-label="Open Menu"
            >
                <Menu className="w-6 h-6" />
            </button>

            {/* Modal Overlay (Portal to body) */}
            {mounted && isOpen && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                >
                    {/* Modal Content */}
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl sticky top-0 z-10">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Menu className="w-5 h-5 text-blue-600" />
                                Main Menu
                            </h2>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Scrollable Content (Grid Layout) */}
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 overflow-y-auto">

                            {/* Left Column: Account */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-500 uppercase text-xs tracking-wider border-b pb-2">Account</h3>
                                {isLoggedIn ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                                            <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center shrink-0">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold truncate">Demo User</p>
                                                <p className="text-xs text-blue-500 truncate">user@example.com</p>
                                            </div>
                                        </div>
                                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200">
                                            <LogOut className="w-4 h-4" />
                                            Sign Out
                                        </button>
                                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100">
                                            <Settings className="w-4 h-4" />
                                            Delete Account
                                        </button>
                                    </div>
                                ) : (
                                    <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-md shadow-blue-200">
                                        <User className="w-4 h-4" />
                                        Sign In / Sign Up
                                    </button>
                                )}
                            </div>

                            {/* Right Column: Community & Support */}
                            <div className="space-y-6">
                                {/* Community */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase text-xs tracking-wider border-b pb-2">Community</h3>
                                    <div className="space-y-2">
                                        <a
                                            href="https://twitter.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100 hover:border-gray-300"
                                        >
                                            <Twitter className="w-4 h-4 text-blue-400" />
                                            Official X (Twitter)
                                        </a>
                                        <a
                                            href="https://discord.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100 hover:border-gray-300"
                                        >
                                            <ExternalLink className="w-4 h-4 text-indigo-500" />
                                            Join Discord
                                        </a>
                                    </div>
                                </div>

                                {/* Support */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase text-xs tracking-wider border-b pb-2">Support</h3>
                                    <a
                                        href="#"
                                        className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-pink-600 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors border border-pink-100 hover:border-pink-200"
                                    >
                                        <Heart className="w-4 h-4 fill-pink-600" />
                                        Donation (Doneru)
                                    </a>
                                </div>
                            </div>

                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t bg-gray-50 text-xs text-center text-gray-400">
                            &copy; 2026 eF-Sim Project
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
