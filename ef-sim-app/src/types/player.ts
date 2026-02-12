export type Player = {
    id: string;
    name: string;
    team: string;
    nationality: string;
    card_type: string;
    evidence_url: string;
    offensive_awareness?: number;
    // 必要に応じて他の能力値を追加
};