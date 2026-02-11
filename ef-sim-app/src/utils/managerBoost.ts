/**
 * 監督補正 (Manager Boost) 計算ロジック
 * 
 * チームスタイル適正 (Proficiency) と 現在の能力値 (Stat Value) に基づき、
 * 上昇させる能力値 (+0 ~ +3) を計算する。
 * 
 * @param statValue 現在の能力値 (初期値 + タレントポイント配分後)
 * @param proficiency チームスタイル適正 (85 ~ 89)
 * @returns 加算する補正値
 */
export const calculateManagerBoost = (statValue: number, proficiency: number): number => {
    // 範囲外のProficiencyは補正なし (本来ありえないが安全策)
    if (proficiency < 85 || proficiency > 99) return 0;

    // Prof 89
    if (proficiency >= 89) {
        if (statValue >= 84) return 3;
        if (statValue >= 56) return 2;
        if (statValue >= 40) return 1;
        return 0;
    }

    // Prof 88
    if (proficiency === 88) {
        if (statValue >= 85) return 3;
        if (statValue >= 57) return 2;
        if (statValue >= 40) return 1;
        return 0;
    }

    // Prof 87
    if (proficiency === 87) {
        if (statValue >= 88) return 3;
        if (statValue >= 59) return 2;
        if (statValue >= 40) return 1;
        return 0;
    }

    // Prof 86
    if (proficiency === 86) {
        if (statValue >= 89) return 3;
        if (statValue >= 60) return 2;
        if (statValue >= 40) return 1;
        return 0;
    }

    // Prof 85
    if (proficiency === 85) {
        if (statValue >= 93) return 3;
        if (statValue >= 62) return 2;
        if (statValue >= 40) return 1;
        return 0;
    }

    return 0;
};

