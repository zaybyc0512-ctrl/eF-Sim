'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Search, Plus, User, Database, Loader2, ChevronDown } from 'lucide-react';
import { GlobalMenu } from '@/components/GlobalMenu';
import { PlayerCard } from '@/components/PlayerCard';
import { Player } from '@/types/player';

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

  // 通信キャンセル用のコントローラーを保持
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPlayers = async (isLoadMore: boolean = false) => {
    // 既存の通信があればキャンセルする
    if (!isLoadMore && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 新しいコントローラーを作成
    const controller = new AbortController();
    if (!isLoadMore) {
      abortControllerRef.current = controller;
    }

    // ローディング状態の更新
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

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,team.ilike.%${searchTerm}%,nationality.ilike.%${searchTerm}%`);
      }

      const start = isLoadMore ? players.length : 0;
      const end = start + PAGE_SIZE - 1;
      query = query.range(start, end);

      // fetch実行
      const { data, error } = await query;

      // 通信完了後、この処理が既にキャンセルされていたらここで終了
      // (Reactのstate更新を行わない)
      if (!isLoadMore && controller.signal.aborted) {
        return;
      }

      if (error) {
        // AbortErrorに近いエラーコードなら無視
        if (error.code === '20' || error.message?.includes('aborted')) return;
        throw error;
      }

      const newPlayers = data || [];

      if (isLoadMore) {
        setPlayers((prev) => [...prev, ...newPlayers]);
      } else {
        setPlayers(newPlayers);
      }

      setHasMore(newPlayers.length >= PAGE_SIZE);

    } catch (error: any) {
      // AbortErrorはログに出さず、何もしない
      const isAbort = error.name === 'AbortError' || error.message?.includes('aborted');

      if (!isAbort) {
        console.error('Error fetching players:', error);
        // 検索時のみ、エラーならリストを空にする（必要に応じて変更可）
        if (!isLoadMore) setPlayers([]);
      }
    } finally {
      // キャンセルされていない場合のみローディングを解除
      if (isLoadMore || (abortControllerRef.current === controller)) {
        if (isLoadMore) setIsLoadingMore(false);
        else setLoading(false);
      }
    }
  };

  useEffect(() => {
    // 検索語がある場合はデバウンス、なければ即時実行
    const timer = setTimeout(() => {
      fetchPlayers(false);
    }, searchTerm ? 500 : 0);

    // クリーンアップ関数: コンポーネントのアンマウント時や再実行時に通信をキャンセル
    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleLoadMore = () => {
    fetchPlayers(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-shrink-0">
            <GlobalMenu />
            <div className="flex items-center gap-2">
              <Database className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold hidden sm:block">eF-Sim</h1>
            </div>
          </div>
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
          <Link href="/upload" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition shadow-sm whitespace-nowrap">
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">新規登録</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
            <p>データを読み込んでいます...</p>
          </div>
        )}

        {!loading && players.length === 0 && (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">データが見つかりません</h3>
            <div className="mt-6"><Link href="/upload" className="text-blue-600 hover:underline font-bold">+ 選手を登録する</Link></div>
          </div>
        )}

        {!loading && players.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {players.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="w-full py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoadingMore ? <><Loader2 className="w-5 h-5 animate-spin" /> 読み込み中...</> : <><ChevronDown className="w-5 h-5" /> もっと読み込む</>}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}