import Link from 'next/link';
import { Player } from '@/types/player';

type PlayerCardProps = {
    player: Player;
};

export function PlayerCard({ player }: PlayerCardProps) {
    return (
        <Link
            href={`/players/${player.id}`}
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

                    {/* 簡易ステータス表示 */}
                    {player.offensive_awareness && (
                        <span className="text-xs font-bold text-gray-500">
                            OF: {player.offensive_awareness}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
