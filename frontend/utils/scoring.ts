import { Question, Answer } from '../types';

export const calculateScore = (questions: Question[], answers: Record<number, Answer>): number => {
    let totalScore = 0;
    let totalWeight = 0;

    questions.forEach(q => {
        const weight = q.weight || 1;
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
                        const userIndices = (userAnswer.value as number[] || []).sort();
                        const keyIndices = (q.answerKey?.indices as number[] || []).sort();
                        if (userIndices.length === keyIndices.length &&
                            userIndices.every((val, index) => val === keyIndices[index])) {
                            totalScore += weight;
                        }
                    }
                    break;
                }

                case 'matching': {
                    totalWeight += weight;
                    if (userAnswer && userAnswer.value !== null && userAnswer.value !== undefined) {
                        const userPairs = userAnswer.value as Record<string, string> || {};
                        const keyPairs = q.answerKey?.pairs as Record<string, string> || {};
                        const totalPairs = Object.keys(keyPairs).length;
                        if (totalPairs > 0) {
                            let correctCount = 0;
                            Object.entries(keyPairs).forEach(([left, right]) => {
                                if (userPairs[left] === right) correctCount++;
                            });
                            totalScore += (correctCount / totalPairs) * weight;
                        }
                    }
                    break;
                }

                case 'true_false': {
                    totalWeight += weight;
                    if (userAnswer && userAnswer.value !== null && userAnswer.value !== undefined) {
                        const userTF = userAnswer.value as Record<number, boolean> || {};
                        const keyTF = q.answerKey as Record<number, boolean> || {};
                        const totalItems = Object.keys(keyTF).length;
                        if (totalItems > 0) {
                            let correctCount = 0;
                            Object.entries(keyTF).forEach(([idx, val]) => {
                                if (userTF[Number(idx)] === val) correctCount++;
                            });
                            totalScore += (correctCount / totalItems) * weight;
                        }
                    }
                    break;
                }

                case 'essay':
                    // Essay HANYA masuk denominator jika sudah dinilai manual atau cocok persis.
                    // Essay yang belum dikoreksi (manual_score kosong, jawaban tidak cocok persis)
                    // dikecualikan dari pembagi agar tidak menurunkan nilai soal lain.
                    if (userAnswer?.manual_score !== null && userAnswer?.manual_score !== undefined) {
                        totalWeight += weight;
                        totalScore += (userAnswer.manual_score / 100) * weight;
                    } else if (userAnswer && userAnswer.value !== null && userAnswer.value !== undefined) {
                        const userText = (userAnswer.value as string || '').trim().toLowerCase();
                        const keyText = (q.answerKey?.text as string || '').trim().toLowerCase();
                        if (userText && keyText && userText === keyText) {
                            totalWeight += weight;
                            totalScore += weight;
                        }
                        // else: belum dikoreksi → skip, tidak pengaruhi nilai
                    }
                    break;
            }
        } catch (e) {
            console.error(`Error scoring question ${q.id}:`, e);
        }
    });

    return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
};
