import { Metadata, ResolvingMetadata } from 'next';
import { createClient } from '@supabase/supabase-js';

type Props = {
    params: { id: string };
    children: React.ReactNode;
};

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    // read route params
    const id = params.id;

    // fetch data
    const { data: player, error } = await supabase
        .from('players')
        .select('name, card_type, evidence_url')
        .eq('id', id)
        .single();

    if (error || !player) {
        return {
            title: 'eF-Sim | eFootball Simulator',
            description: 'eFootballの選手育成シミュレーター。あなただけの最強ビルドを作ろう！',
        };
    }

    // optionally access and extend (rather than replace) parent metadata
    const previousImages = (await parent).openGraph?.images || [];

    return {
        title: `${player.name} (${player.card_type}) - eF-Sim`,
        description: `eFootball Simulatorで ${player.name} のステータスとおすすめビルドをチェック！`,
        openGraph: {
            title: `${player.name} (${player.card_type}) - eF-Sim`,
            description: `eFootball Simulatorで ${player.name} のステータスとおすすめビルドをチェック！`,
            images: player.evidence_url ? [player.evidence_url, ...previousImages] : previousImages,
        },
        twitter: {
            card: 'summary_large_image',
            title: `${player.name} (${player.card_type}) - eF-Sim`,
            description: `eFootball Simulatorで ${player.name} のステータスとおすすめビルドをチェック！`,
            images: player.evidence_url ? [player.evidence_url] : [],
        },
    };
}

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
