"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasConcreteHardHook = hasConcreteHardHook;
exports.pickHardHookWindow = pickHardHookWindow;
const HARD_HOOK_EVENT_MARKERS = [
    '撞开',
    '踹响',
    '断裂',
    '巨响',
    '亮起',
    '亮了',
    '扑来',
    '抓来',
    '扑向',
    '扑上',
    '扑出',
    '冲来',
    '冲过来',
    '冲进来',
    '堵住',
    '堵死',
    '围住',
    '围拢',
    '抓住',
    '扣住',
    '攥住',
    '攥紧',
    '抓向',
    '抓到',
    '触到',
    '抓下',
    '直抓',
    '带走',
    '拖倒',
    '拽向',
    '拖向',
    '拖走',
    '拖入',
    '拉向',
    '拉入',
    '抵住',
    '提起',
    '挟住',
    '掐住',
    '收紧',
    '掐紧',
    '搭在',
    '搭上',
    '吞没',
    '扑倒',
    '直扑',
    '劈落',
    '跌向',
    '砸向',
    '刺向',
    '直刺',
    '拍下',
    '拍碎',
    '笼罩',
    '踩住',
    '按在',
    '包抄',
    '退路已断',
    '举刀',
    '扒住',
    '缠住',
    '缠上',
    '缠紧',
    '勒住',
    '洞开',
    '涌出',
    '涌来',
    '闯进',
    '爬出',
    '提离',
    '钉在',
    '来了'
];
const HARD_HOOK_THREAT_MARKERS = [
    '别动',
    '站住',
    '交出来',
    '拿什么来换',
    '拿来换',
    '来换她',
    '逃不掉',
    '抓到',
    '再不出来',
    '下一个就是',
    '不交',
    '陪葬',
    '抢过来',
    '都留下'
];
const HARD_HOOK_URGENCY_MARKERS = [
    '现在',
    '立刻',
    '今晚',
    '马上',
    '再不',
    '否则',
    '这就',
    '下一秒',
    '来不及',
    '只剩',
    '天亮前',
    '今夜'
];
const HARD_HOOK_RESULT_MARKERS = [
    '已经',
    '当场',
    '眼前',
    '门外',
    '门口',
    '身后',
    '血',
    '退路',
    '尸体',
    '证据',
    '活口',
    '钥匙',
    '名单',
    '账本'
];
const WEAK_HOOK_PATTERNS = [
    /(只剩|只看见|回荡|残影|恢复平静|仿佛什么都没发生)/,
    /(看向|盯住|锁定|指向|笑了|伸出手|逼近|要来了)/,
    /(刚露头|刚出现|刚冒出|搭上井沿|抓住门框)/,
    /(以后再说|慢慢告诉你|总会知道|迟早知道)/
];
const ACTION_RESULT_PATTERNS = [
    /(门|窗|柜|链|锁)[^，。；！？\n]{0,6}(被|已)?(撞开|踹开|洞开|断裂|崩开|锁死)/,
    /(刀|枪|绳|手|胳膊|人|黑影|怪物|妖物)[^，。；！？\n]{0,8}(已经|当场|直接)?(抵住|缠住|勒住|抓住|扑到|拖走|堵住|围住|按在|钉在|掐住)/,
    /(已经|当场|直接|立刻)[^，。；！？\n]{0,8}(抓|拖|扑|撞|抵|缠|勒|掐|按|堵|围|提|带|拉|刺|钉|亮)/,
    /(退路|门口|门外|身后)[^，。；！？\n]{0,8}(断了|堵死了|围住了|来了|站满了)/
];
const DIRECT_THREAT_PATTERNS = [
    /(交出来|别动|站住|逃不掉|下一个就是|都留下|陪葬)/,
    /(现在|立刻|今晚|再不)[^，。；！？\n]{0,10}(交|滚|死|跪|放|拿|出来|还)/,
    /(不交)[^，。；！？\n]{0,8}(就|那就|你就|她就|他就)/,
    /(拿什么来换|来换她|来换他|来换你)/,
    /(下一个就是)[^，。；！？\n]{0,6}(你|她|他|孩子|你娘|她娘|他娘)/
];
const PRESSURE_ON_TARGET_PATTERNS = [
    /(你|他|她|孩子|你娘|她娘|他娘|命|喉咙|脖子|手腕)[^，。；！？\n]{0,8}(交出来|留下|逃不掉|保不住|活不过|来换|陪葬|抵住|勒住|掐住|带走|拖走)/,
    /(刀|枪|绳|手)[^，。；！？\n]{0,8}(抵住|架住|勒住|掐住|按住)/,
    /(门|窗|车|退路)[^，。；！？\n]{0,8}(堵住|锁死|围住|断了)/,
    /(孩子|人|命)[^，。；！？\n]{0,8}(在我手里|就在我手里|已经没了|先死|先走)/
];
const DIALOGUE_RESULT_PATTERNS = [
    /(人|孩子|东西|证据|钥匙|账本|命)[^，。；！？\n]{0,8}(已经在我手里|已经到手|就在我手里)/,
    /(门外|门口|身后)[^，。；！？\n]{0,8}(已经来了|已经到了|已经站满了)/,
    /(下一个就是)[^，。；！？\n]{0,6}(你|她|他|孩子|你娘|她娘|他娘)/,
    /(今晚就|现在就|立刻就)[^，。；！？\n]{0,8}(死|埋|烧|带走|动手)/
];
function normalize(line) {
    return line.replace(/\s+/g, '').trim();
}
function isDialogueLine(line) {
    return /^[^\s△：:（）()]{1,16}(?:（[^）]{0,8}）)?[：:]/.test(line.trim());
}
function inferLineKind(line) {
    const trimmed = line.trim();
    if (trimmed.startsWith('△'))
        return 'action';
    if (isDialogueLine(trimmed))
        return 'dialogue';
    return 'other';
}
function matchMarkers(normalized, markers) {
    return markers.filter((marker) => normalized.includes(marker));
}
function matchesAny(normalized, patterns) {
    return patterns.some((pattern) => pattern.test(normalized));
}
function hasWeakHookShape(normalized) {
    return matchesAny(normalized, WEAK_HOOK_PATTERNS);
}
function hasConcreteResult(normalized) {
    return matchesAny(normalized, ACTION_RESULT_PATTERNS) || matchesAny(normalized, DIALOGUE_RESULT_PATTERNS);
}
function hasDirectThreat(normalized) {
    return matchesAny(normalized, DIRECT_THREAT_PATTERNS);
}
function hasPressureOnTarget(normalized) {
    return matchesAny(normalized, PRESSURE_ON_TARGET_PATTERNS);
}
function hasMarkerSupport(normalized) {
    return (matchMarkers(normalized, HARD_HOOK_EVENT_MARKERS).length > 0 ||
        matchMarkers(normalized, HARD_HOOK_THREAT_MARKERS).length > 0);
}
function hasUrgencySupport(normalized) {
    return matchMarkers(normalized, HARD_HOOK_URGENCY_MARKERS).length > 0;
}
function hasResultMarkerSupport(normalized) {
    return matchMarkers(normalized, HARD_HOOK_RESULT_MARKERS).length > 0;
}
function scoreActionHook(normalized) {
    let score = 0;
    if (hasConcreteResult(normalized))
        score += 3;
    if (hasPressureOnTarget(normalized))
        score += 2;
    if (hasDirectThreat(normalized))
        score += 1;
    if (hasMarkerSupport(normalized))
        score += 1;
    if (hasUrgencySupport(normalized))
        score += 1;
    if (hasResultMarkerSupport(normalized))
        score += 1;
    return score;
}
function scoreDialogueHook(normalized) {
    let score = 0;
    if (hasDirectThreat(normalized))
        score += 3;
    if (hasPressureOnTarget(normalized))
        score += 2;
    if (hasConcreteResult(normalized))
        score += 2;
    if (hasUrgencySupport(normalized))
        score += 1;
    if (hasMarkerSupport(normalized))
        score += 1;
    if (hasResultMarkerSupport(normalized))
        score += 1;
    return score;
}
function hasConcreteHardHook(line) {
    const normalized = normalize(line);
    if (!normalized)
        return false;
    if (hasWeakHookShape(normalized))
        return false;
    const lineKind = inferLineKind(line);
    if (lineKind === 'other')
        return false;
    const resultReached = hasConcreteResult(normalized);
    const pressureOnTarget = hasPressureOnTarget(normalized);
    const directThreat = hasDirectThreat(normalized);
    const markerSupport = hasMarkerSupport(normalized);
    if (lineKind === 'action') {
        const score = scoreActionHook(normalized);
        return resultReached && (pressureOnTarget || markerSupport) && score >= 4;
    }
    const score = scoreDialogueHook(normalized);
    return (directThreat || resultReached) && pressureOnTarget && score >= 5;
}
function pickHardHookWindow(lines) {
    return lines
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !/^第.+集$/.test(line) && !/^人物[：:]/.test(line))
        .slice(-2);
}
