'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Search, Plus, User, Database, Loader2 } from 'lucide-react';

// Supabase Client Initialization
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * プレイヤーデータの型定義
 */
type Player = {
  id: string;
  name: string;
  team: string;
  nationality: string;
  card_type: string;
  evidence_url: string;
  offensive_awareness?: number;
  // 他の能力値は表示用には必須ではないので省略可、必要に応じて追加
};

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // データ取得関数
  const fetchPlayers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('players')
        .select('*')
        .order('created_at', { ascending: false });

      // 検索フィルタ
      if (searchTerm) {
        // name, team, nationality のいずれかに部分一致
        query = query.or(`name.ilike.%${searchTerm}%,team.ilike.%${searchTerm}%,nationality.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初回ロード時 & 検索語変更時にデータ取得
  // デバウンス処理を入れるとより良いが、今回はシンプルにuseEffectで監視
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPlayers();
    }, 300); // 簡易デバウンス
    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">

      {/* Header Area */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* Logo / Title */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Database className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold hidden sm:block">eF-Sim</h1>
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
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {players.map((player) => (
              <Link
                href={`/players/${player.id}`}
                key={player.id}
                className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow duration-200 overflow-hidden group cursor-pointer flex flex-col"
              >
                {/* Image Area (Square) */}
                <div className="relative aspect-square bg-gray-100 border-b">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={player.evidence_url || '/placeholder.png'}
                    alt={player.name}
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Nationality Badge (Overlay) */}
                  {player.nationality && (
                    <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                      {player.nationality}
                    </span>
                  )}
                </div>

                {/* Info Area */}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-gray-900 line-clamp-1 mb-1" title={player.name}>
                    {player.name}
                  </h3>

                  <p className="text-sm text-gray-600 line-clamp-1 mb-2" title={player.team}>
                    {player.team || 'No Team'}
                  </p>

                  {/* Badge / Stats Preview */}
                  <div className="mt-auto pt-3 border-t flex items-center justify-between">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                      {player.card_type}
                    </span>

                    {/* 簡易ステータス表示 (オフェンスセンスがあれば表示してみる) */}
                    {player.offensive_awareness && (
                      <span className="text-xs font-bold text-gray-500">
                        OF: {player.offensive_awareness}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
