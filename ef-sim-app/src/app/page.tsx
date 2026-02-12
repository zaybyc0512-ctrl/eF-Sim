'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Search, Plus, User, Database, Loader2, ChevronDown } from 'lucide-react';
import { GlobalMenu } from '@/components/GlobalMenu';
import { PlayerCard } from '@/components/PlayerCard';
import { Player } from '@/types/player';

// Supabase Client Initialization
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PAGE_SIZE = 12;

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // データ取得関数
  const fetchPlayers = async (isLoadMore: boolean = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      let query = supabase
        .from('players')
        .select('*')
        .order('created_at', { ascending: false });

      // 検索フィルタ
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,team.ilike.%${searchTerm}%,nationality.ilike.%${searchTerm}%`);
      }

      // ページネーション範囲指定
      const start = isLoadMore ? players.length : 0;
      const end = start + PAGE_SIZE - 1;
      query = query.range(start, end);

      const { data, error } = await query;

      if (error) throw error;

      const newPlayers = data || [];

      if (isLoadMore) {
        setPlayers((prev) => [...prev, ...newPlayers]);
      } else {
        setPlayers(newPlayers);
      }

      // 次のデータがあるか判定
      if (newPlayers.length < PAGE_SIZE) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

    } catch (error: any) {
      // エラーハンドリング: AbortErrorは無視し、それ以外はログ出力
      if (error.name !== 'AbortError') {
        console.error('Error fetching players:', error);
        if (!isLoadMore) {
          setPlayers([]);
        }
      }
    } finally {
      if (isLoadMore) {
        setIsLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  // 初回ロード時 & 検索語変更時にデータ取得
  useEffect(() => {
    // 検索語がある場合のみデバウンス（遅延）を適用
    if (searchTerm) {
      const timer = setTimeout(() => {
        fetchPlayers(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // 初期ロードまたは検索クリア時は「即座に」実行
      fetchPlayers(false);
    }
  }, [searchTerm]);

  const handleLoadMore = () => {
    fetchPlayers(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">

      {/* Header Area */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* Logo / Title */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <GlobalMenu />
            <div className="flex items-center gap-2">
              <Database className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold hidden sm:block">eF-Sim</h1>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              placeholder="選手名、チーム名、国籍で検索..."
            />
          </div>

          {/* Register Button */}
          <Link
            href="/upload"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition shadow-sm whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">新規登録</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
            <p>データを読み込んでいます...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && players.length === 0 && (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">データが見つかりません</h3>
            <p className="mt-1 text-gray-500">条件を変更するか、新しい選手を登録してください。</p>
            <div className="mt-6">
              <Link href="/upload" className="text-blue-600 hover:underline font-bold">
                + 選手を登録する
              </Link>
            </div>
          </div>
        )}

        {/* Player Grid */}
        {!loading && players.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {players.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="w-full py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      読み込み中...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-5 h-5" />
                      もっと読み込む
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}