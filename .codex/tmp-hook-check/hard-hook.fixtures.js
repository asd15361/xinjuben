"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HARD_HOOK_REGRESSION_FIXTURES = void 0;
exports.HARD_HOOK_REGRESSION_FIXTURES = [
    {
        name: 'action_result_landed',
        line: '△ 刀锋已经抵住她喉咙，门外脚步声扑到眼前。',
        expected: true,
        note: '动作结果已发生，危机压到具体对象。'
    },
    {
        name: 'dialogue_pressure_deadline',
        line: '陆沉：孩子已经在我手里，你今晚不交出来，下一个就是她娘。',
        expected: true,
        note: '对白明确给出已发生结果、目标对象和时限压力。'
    },
    {
        name: 'dialogue_direct_threat',
        line: '陆沉：别动，你娘的命现在就在我手里。',
        expected: true,
        note: '直接威胁成立，压力明确压到具体对象。'
    },
    {
        name: 'soft_exposition',
        line: '陆沉：真相我以后慢慢告诉你。',
        expected: false,
        note: '只有信息悬念，没有已发生后果或当场压迫。'
    },
    {
        name: 'soft_mood_tail',
        line: '△ 他站在门口，心里一沉。',
        expected: false,
        note: '只有情绪和姿态，没有结果落地。'
    },
    {
        name: 'soft_marker_only',
        line: '△ 黑影逼近门口，要来了。',
        expected: false,
        note: '只有 marker 和逼近姿态，没有结果已发生。'
    }
];
