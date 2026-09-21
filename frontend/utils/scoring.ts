import { Question, Answer } from '../types';

export interface SubScoreResult {
    earned: number; // 0..max
    max: number;    // == weight soal, diikutkan untuk kemudahan pemanggil
}

/**
 * Skor PGK (complex_multiple_choice).
 * Legacy (answerKey.points tidak ada) atau mode:'strict' -> all-or-nothing seperti sebelumnya:
 * penuh weight hanya jika set indeks yang dipilih persis sama dengan indeks kunci.
 * Mode 'partial' (aktif saat answerKey.points diisi guru): jumlah poin opsi benar yang dipilih,
 * dikurangi penaltyPerWrong untuk tiap opsi salah yang dipilih, clamp ke [0, weight].
 */
export function scorePgk(
    userIndices: number[] | null | undefined,
    answerKey: any,
    weight: number
): SubScoreResult {
    const keyIndices = ((answerKey?.indices as number[]) || []).map(Number);
    const sel = ((userIndices as number[]) || []).map(Number);
    const pointsMap: Record<string, number> | undefined = answerKey?.points;

    const sortedSel = [...sel].sort((a, b) => a - b);
    const sortedKey = [...keyIndices].sort((a, b) => a - b);
    const exactMatch = sortedSel.length === sortedKey.length &&
        sortedSel.every((v, i) => v === sortedKey[i]);

    if (!pointsMap || answerKey?.mode === 'strict') {
        return { earned: exactMatch ? weight : 0, max: weight };
    }

    const penalty = Number(answerKey?.penaltyPerWrong) || 0;
    let earned = 0;
    sel.forEach(i => {
        if (keyIndices.includes(i)) {
            earned += Number(pointsMap[String(i)] ?? 0);
        } else {
            earned -= penalty;
        }
    });
    earned = Math.max(0, Math.min(weight, earned));
    return { earned, max: weight };
}

/**
 * Skor Benar-Salah (true_false, format matriks).
 * Legacy: answerKey adalah bare Record<number,boolean> (tanpa key `tf`) -> proporsional-rata,
 * persis seperti sebelumnya. V2 (answerKey.tf ada) dengan `points` -> jumlah poin baris yang
 * dijawab benar. V2 tanpa `points` (guru belum mengisi poin) -> tetap proporsional-rata.
 */
export function scoreTrueFalse(
    userValue: Record<number, boolean> | null | undefined,
    answerKey: any,
    weight: number
): SubScoreResult {
    const isV2 = !!(answerKey && typeof answerKey === 'object' && answerKey.tf && typeof answerKey.tf === 'object');
    const keyTF: Record<string, boolean> = isV2 ? answerKey.tf : (answerKey || {});
    const pointsMap: Record<string, number> | undefined = isV2 ? answerKey.points : undefined;
    const rowIndices = Object.keys(keyTF);
    if (rowIndices.length === 0) return { earned: 0, max: weight };

    if (!pointsMap) {
        let correct = 0;
        rowIndices.forEach(idx => {
            if ((userValue || {})[Number(idx)] === keyTF[idx]) correct++;
        });
        return { earned: (correct / rowIndices.length) * weight, max: weight };
    }

    let earned = 0;
    rowIndices.forEach(idx => {
        if ((userValue || {})[Number(idx)] === keyTF[idx]) {
            earned += Number(pointsMap[idx] ?? 0);
        }
    });
    return { earned: Math.max(0, Math.min(weight, earned)), max: weight };
}

/**
 * Skor Menjodohkan (matching).
 * Legacy (tidak ada metadata.matchingLeft[i].poin sama sekali) -> proporsional-rata seperti
 * sebelumnya. Jika ada poin pada minimal satu item kiri -> jumlah poin pasangan yang benar
 * (item kiri tanpa poin eksplisit dihitung 0, bukan fallback rata — ini konsisten dengan
 * prinsip opt-in per-item).
 */
export function scoreMatching(
    userPairs: Record<string, string> | null | undefined,
    answerKey: any,
    metadata: { matchingLeft?: { id: string; poin?: number }[] } | undefined,
    weight: number
): SubScoreResult {
    const keyPairs: Record<string, string> = answerKey?.pairs || {};
    const leftIds = Object.keys(keyPairs);
    if (leftIds.length === 0) return { earned: 0, max: weight };

    const poinById = new Map<string, number>();
    (metadata?.matchingLeft || []).forEach(item => {
        if (typeof item.poin === 'number') poinById.set(item.id, item.poin);
    });

    if (poinById.size === 0) {
        let correct = 0;
        leftIds.forEach(l => {
            if ((userPairs || {})[l] === keyPairs[l]) correct++;
        });
        return { earned: (correct / leftIds.length) * weight, max: weight };
    }

    let earned = 0;
    leftIds.forEach(l => {
        if ((userPairs || {})[l] === keyPairs[l]) {
            earned += poinById.get(l) ?? 0;
        }
    });
    return { earned: Math.max(0, Math.min(weight, earned)), max: weight };
}

export const calculateScore = (questions: Question[], answers: Record<number, Answer>): number => {
    let totalScore = 0;
    let totalWeight = 0;

    questions.forEach(q => {
        // Pengecekan eksplisit, bukan falsy — soal berbobot 0 (sengaja) harus tetap
        // dihitung sebagai 0, bukan dipaksa jadi 1 (lihat juga QuestionModal.tsx).
        const weight = q.weight ?? 1;
        const userAnswer = answers[q.id];

        try {
            switch (q.type) {
                case 'multiple_choice':
                    totalWeight += weight;
                    if (userAnswer && userAnswer.value !== null && userAnswer.value !== undefined &&
                        userAnswer.value === q.correctAnswerIndex) {
                        totalScore += weight;
                    }
                    break;

                case 'complex_multiple_choice': {
                    totalWeight += weight;
                    if (userAnswer && userAnswer.value !== null && userAnswer.value !== undefined) {
                        totalScore += scorePgk(userAnswer.value as number[], q.answerKey, weight).earned;
                    }
                    break;
                }

                case 'matching': {
                    totalWeight += weight;
                    if (userAnswer && userAnswer.value !== null && userAnswer.value !== undefined) {
                        totalScore += scoreMatching(userAnswer.value as Record<string, string>, q.answerKey, q.metadata, weight).earned;
                    }
                    break;
                }

                case 'true_false': {
                    totalWeight += weight;
                    if (userAnswer && userAnswer.value !== null && userAnswer.value !== undefined) {
                        totalScore += scoreTrueFalse(userAnswer.value as Record<number, boolean>, q.answerKey, weight).earned;
                    }
                    break;
                }

                case 'essay':
                    // Essay SELALU masuk denominator agar skor tidak inflated saat essay belum dikoreksi.
                    // Sebelum dikoreksi: totalWeight += weight, totalScore += 0 (nilai essay = 0).
                    // Setelah dikoreksi: totalScore += kontribusi sesuai manual_score atau exact match.
                    totalWeight += weight;
                    if (userAnswer?.manual_score !== null && userAnswer?.manual_score !== undefined) {
                        totalScore += (userAnswer.manual_score / 100) * weight;
                    } else if (userAnswer && userAnswer.value !== null && userAnswer.value !== undefined) {
                        const userText = (userAnswer.value as string || '').trim().toLowerCase();
                        const keyText = (q.answerKey?.text as string || '').trim().toLowerCase();
                        if (userText && keyText && userText === keyText) {
                            totalScore += weight;
                        }
                        // else: belum dikoreksi → 0 poin, tapi bobot tetap masuk penyebut
                    }
                    break;
            }
        } catch (e) {
            console.error(`Error scoring question ${q.id}:`, e);
        }
    });

    return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
};
