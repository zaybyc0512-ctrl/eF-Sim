'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, Session } from '@supabase/supabase-js';
import { GlobalMenu } from '@/components/GlobalMenu';
import { PlayerCard } from '@/components/PlayerCard';
import { Player } from '@/types/player';
import { Loader2, Save, User } from 'lucide-react';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MyDataPage() {
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [favorites, setFavorites] = useState<Player[]>([]);
    const [loadingFavorites, setLoadingFavorites] = useState(true);

    useEffect(() => {
        // Auth check
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/');
                return;
            }
            setSession(session);

            // Fetch profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', session.user.id)
                .single();

            if (profile?.username) {
                setUsername(profile.username);
            } else {
                setUsername(session.user.user_metadata.full_name || '');
            }

            setLoading(false);

            // Fetch favorites
            fetchFavorites(session.user.id);
        };

        checkAuth();
    }, [router]);

    const fetchFavorites = async (userId: string) => {
        setLoadingFavorites(true);
        // Join favorites with players
        const { data, error } = await supabase
            .from('favorites')
            .select('player_id, players(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching favorites:', error);
        } else {
            // Extract player data from result
            // @ts-ignore: supabase join type inference can be tricky
            const favoritePlayers = data?.map((item: any) => item.players) || [];
            setFavorites(favoritePlayers);
        }
        setLoadingFavorites(false);
    };

    const handleSaveProfile = async () => {
        if (!session || !username.trim()) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ username, updated_at: new Date().toISOString() })
                .eq('id', session.user.id);

            if (error) throw error;
            alert('プロフィールを保存しました');
        } catch (err) {
            console.error('Error saving profile:', err);
            alert('保存に失敗しました');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <GlobalMenu />
                        <h1 className="text-xl font-bold">マイデータ (準備中)</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Profile Section */}
                <section className="bg-white rounded-xl shadow-sm border p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" />
                        プロフィール設定
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-bold text-gray-700 mb-1">ユーザー名</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="表示名を入力"
                            />
                        </div>
                        <button
                            onClick={handleSaveProfile}
                            disabled={isSaving || !username}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            保存
                        </button>
                    </div>
                </section>

                {/* Favorites Section */}
                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="text-red-500">❤</span> お気に入り選手
                    </h2>

                    {loadingFavorites ? (
                        <div className="py-10 flex justify-center text-gray-400">
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    ) : favorites.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {favorites.map(player => (
                                <PlayerCard key={player.id} player={player} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">
                            まだお気に入りの選手はいません
                        </div>
                    )}
                </section>

            </main>
        </div>
    );
}
