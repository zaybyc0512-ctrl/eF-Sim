'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Menu, X, User, LogOut, Settings, Twitter, ExternalLink, Heart, Loader2 } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AuthModal } from './AuthModal';
import { DonationBanner } from './DonationBanner'; // Phase 22

export function GlobalMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [session, setSession] = useState<Session | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null); // Phase 21: User Role

    useEffect(() => {
        setMounted(true);

        const fetchRole = async (uid: string) => {
            const { data } = await supabase.from('user_roles').select('role').eq('user_id', uid).single();
            if (data) setUserRole(data.role);
            else setUserRole(null);
        };

        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSession(session);
            // Phase 21: Fetch User Role
            if (session?.user) {
                await fetchRole(session.user.id);
            }
            setLoading(false);
            console.log('Initial Session:', session);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            if (session?.user) {
                await fetchRole(session.user.id);
            } else {
                setUserRole(null);
            }
            setLoading(false);
            console.log('Auth State Changed:', session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const toggleMenu = () => setIsOpen(!isOpen);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsOpen(false);
    };

    // Get user display info
    const user = session?.user;
    const avatarUrl = user?.user_metadata?.avatar_url;
    const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
    const email = user?.email;

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

                                {loading ? (
                                    <div className="flex justify-center p-4">
                                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                    </div>
                                ) : session ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                                            {avatarUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={avatarUrl} alt={userName} className="w-10 h-10 rounded-full object-cover border border-blue-200" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center shrink-0 font-bold text-blue-600 border border-blue-300">
                                                    {userName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold truncate">{userName}</p>
                                                <p className="text-xs text-blue-500 truncate">{email}</p>
                                            </div>
                                        </div>

                                        {/* Phase 21: Admin Dashboard Link */}
                                        {['admin', 'developer'].includes(userRole || '') && (
                                            <Link href="/admin" onClick={() => setIsOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors shadow-md shadow-gray-400">
                                                <Settings className="w-4 h-4" />
                                                🛠️ 管理者ダッシュボード
                                            </Link>
                                        )}

                                        <Link href="/my-data" onClick={() => setIsOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200">
                                            <User className="w-4 h-4 text-gray-500" />
                                            マイデータ
                                        </Link>

                                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200">
                                            <LogOut className="w-4 h-4" />
                                            Sign Out
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setIsOpen(false);
                                            setIsAuthModalOpen(true);
                                        }}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-md shadow-blue-200"
                                    >
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
                                            href="https://x.com/Xv2UFh3LZzGJAqH"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100 hover:border-gray-300"
                                        >
                                            <Twitter className="w-4 h-4 text-black" />
                                            Official X
                                        </a>
                                        <a
                                            href="https://wick-sns.com/sns/profile/00477145-972e-4882-b38a-c0b01aeadb8b"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100 hover:border-gray-300"
                                        >
                                            {/* Generic Globe icon for Wick as requested, keeping styling consistent with X */}
                                            <div className="w-4 h-4 flex items-center justify-center bg-gray-200 rounded-full text-[10px] font-bold text-gray-600">W</div>
                                            Wick
                                        </a>
                                    </div>
                                </div>

                                {/* Support */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase text-xs tracking-wider border-b pb-2">Support</h3>
                                    <div className="w-full transform hover:scale-[1.02] transition-transform duration-200">
                                        <DonationBanner />
                                    </div>
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

            {/* Auth Modal */}
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        </>
    );
}
