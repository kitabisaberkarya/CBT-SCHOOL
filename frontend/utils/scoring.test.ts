import { describe, it, expect } from 'vitest';
import { scorePgk, scoreTrueFalse, scoreMatching, calculateScore } from './scoring';
import type { Question, Answer } from '../types';

const baseQuestion = (overrides: Partial<Question>): Question => ({
    id: 1,
    type: 'multiple_choice',
    question: 'q',
    options: [],
    correctAnswerIndex: 0,
    answerKey: null,
    difficulty: 'Medium',
    weight: 4,
    ...overrides,
});

describe('scorePgk', () => {
    it('legacy: exact match of indices -> full weight', () => {
        const r = scorePgk([0, 2], { indices: [0, 2] }, 4);
        expect(r).toEqual({ earned: 4, max: 4 });
    });

    it('legacy: partial/wrong selection -> 0', () => {
        const r = scorePgk([0], { indices: [0, 2] }, 4);
        expect(r.earned).toBe(0);
    });

    it('legacy: empty userIndices -> 0', () => {
        const r = scorePgk([], { indices: [0, 2] }, 4);
        expect(r.earned).toBe(0);
    });

    it('partial mode: all correct selected, none wrong -> sum of their points', () => {
        const r = scorePgk([0, 2], { indices: [0, 2], points: { '0': 2, '2': 1.5 } }, 4);
        expect(r.earned).toBe(3.5);
    });

    it('partial mode: one correct missed, none wrong -> only selected correct points', () => {
        const r = scorePgk([0], { indices: [0, 2], points: { '0': 2, '2': 1.5 } }, 4);
        expect(r.earned).toBe(2);
    });

    it('partial mode: one wrong selected -> penalty subtracted, clamped at 0', () => {
        const r = scorePgk([1], { indices: [0, 2], points: { '0': 2, '2': 1.5 }, penaltyPerWrong: 5 }, 4);
        expect(r.earned).toBe(0);
    });

    it('partial mode: poin sum exceeds weight -> clamped to weight', () => {
        const r = scorePgk([0, 2], { indices: [0, 2], points: { '0': 3, '2': 3 } }, 4);
        expect(r.earned).toBe(4);
    });

    it('strict mode with points present: partial selection still yields 0', () => {
        const r = scorePgk([0], { indices: [0, 2], points: { '0': 2, '2': 2 }, mode: 'strict' }, 4);
        expect(r.earned).toBe(0);
    });
});

describe('scoreTrueFalse', () => {
    it('legacy bare object: 2/3 rows correct -> (2/3)*weight', () => {
        const r = scoreTrueFalse({ 0: true, 1: false, 2: true }, { 0: true, 1: true, 2: true }, 3);
        expect(r.earned).toBeCloseTo(2);
    });

    it('v2 wrapper: 2 of 3 rows correct with unequal poin -> sum of poin for correct rows', () => {
        const r = scoreTrueFalse(
            { 0: true, 1: false, 2: true },
            { tf: { 0: true, 1: true, 2: true }, points: { '0': 1, '1': 2, '2': 1.5 } },
            4.5
        );
        expect(r.earned).toBe(2.5);
    });

    it('v2 wrapper with points, no student answer -> 0', () => {
        const r = scoreTrueFalse(undefined, { tf: { 0: true }, points: { '0': 1 } }, 1);
        expect(r.earned).toBe(0);
    });

    it('v2 wrapper without points -> falls back to legacy equal-share', () => {
        const r = scoreTrueFalse({ 0: true, 1: true }, { tf: { 0: true, 1: false } }, 2);
        expect(r.earned).toBe(1);
    });
});

describe('scoreMatching', () => {
    const pairs = { L1: 'R1', L2: 'R2', L3: 'R3', L4: 'R4' };

    it('legacy (no poin on matchingLeft): 2/4 pairs correct -> (2/4)*weight', () => {
        const r = scoreMatching({ L1: 'R1', L2: 'R2', L3: 'Rx', L4: 'Ry' }, { pairs }, undefined, 4);
        expect(r.earned).toBe(2);
    });

    it('poin present: 2 of 4 pairs correct with unequal poin -> sum of poin for correct pairs', () => {
        const metadata = { matchingLeft: [{ id: 'L1', poin: 1 }, { id: 'L2', poin: 2 }, { id: 'L3', poin: 1 }, { id: 'L4', poin: 1 }] };
        const r = scoreMatching({ L1: 'R1', L2: 'R2', L3: 'Rx', L4: 'Ry' }, { pairs }, metadata, 5);
        expect(r.earned).toBe(3);
    });

    it('poin present but no student answer -> 0', () => {
        const metadata = { matchingLeft: [{ id: 'L1', poin: 1 }] };
        const r = scoreMatching(undefined, { pairs: { L1: 'R1' } }, metadata, 1);
        expect(r.earned).toBe(0);
    });

    it('mixed: only some matchingLeft items have poin -> others contribute 0 even if matched', () => {
        const metadata = { matchingLeft: [{ id: 'L1', poin: 2 }] }; // L2/L3/L4 have no poin entry
        const r = scoreMatching({ L1: 'R1', L2: 'R2', L3: 'R3', L4: 'R4' }, { pairs }, metadata, 10);
        expect(r.earned).toBe(2);
    });
});

describe('calculateScore integration (regression guard for legacy questions)', () => {
    it('mixed legacy PGK/TF/Matching questions score identically to pre-feature behavior', () => {
        const questions: Question[] = [
            baseQuestion({ id: 1, type: 'complex_multiple_choice', weight: 4, answerKey: { indices: [0, 1] } }),
            baseQuestion({ id: 2, type: 'true_false', weight: 3, answerKey: { 0: true, 1: false, 2: true } }),
            baseQuestion({ id: 3, type: 'matching', weight: 4, answerKey: { pairs: { L1: 'R1', L2: 'R2' } } }),
        ];
        const answers: Record<number, Answer> = {
            1: { value: [0, 1], unsure: false },       // exact match -> full 4
            2: { value: { 0: true, 1: false, 2: false }, unsure: false }, // 2/3 correct -> 2
            3: { value: { L1: 'R1', L2: 'Rx' }, unsure: false },          // 1/2 correct -> 2
        };
        // total earned = 4 + 2 + 2 = 8, total weight = 11 -> round(8/11*100) = 73
        expect(calculateScore(questions, answers)).toBe(Math.round((8 / 11) * 100));
    });

    it('same mix with new poin fields reflects weighted partial credit', () => {
        const questions: Question[] = [
            baseQuestion({ id: 1, type: 'complex_multiple_choice', weight: 4, answerKey: { indices: [0, 1], points: { '0': 2, '1': 2 } } }),
            baseQuestion({
                id: 2, type: 'true_false', weight: 4,
                answerKey: { tf: { 0: true, 1: false, 2: true }, points: { '0': 1, '1': 1, '2': 2 } },
            }),
            baseQuestion({
                id: 3, type: 'matching', weight: 3,
                answerKey: { pairs: { L1: 'R1', L2: 'R2' } },
                metadata: { matchingLeft: [{ id: 'L1', content: 'a', poin: 2 }, { id: 'L2', content: 'b', poin: 1 }] },
            }),
        ];
        const answers: Record<number, Answer> = {
            1: { value: [0], unsure: false },                              // only first correct opt -> 2
            2: { value: { 0: true, 1: false, 2: false }, unsure: false },  // rows 0,1 correct -> 1+1=2
            3: { value: { L1: 'R1', L2: 'Rx' }, unsure: false },           // L1 correct -> 2
        };
        // total earned = 2 + 2 + 2 = 6, total weight = 11 -> round(6/11*100) = 55
        expect(calculateScore(questions, answers)).toBe(Math.round((6 / 11) * 100));
    });
});
