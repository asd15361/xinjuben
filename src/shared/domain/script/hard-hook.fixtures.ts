export interface HardHookFixture {
  name: string
  line: string
  expected: boolean
  note: string
}

/**
 * 弱钩子回归样本台账
 * 4 分类：should_pass_hard_result / should_fail_observation /
 *         should_fail_approach / borderline_lockin
 *
 * 每条样本都对应至少一个真实生成结果，确保检测器改动有据可查。
 */
export const HARD_HOOK_REGRESSION_FIXTURES: HardHookFixture[] = [
  // ── 1. should_pass_hard_result ─────────────────────────────────────────────
  // 已发生的可见后果，检测器应识别为硬钩子并通过

  {
    name: 'result_injury_blood',
    line: '△ 打手甲捂着肋部，嘴角渗出血丝。',
    expected: true,
    note: '身体部位+血，是渗出类结果的典型结构，RESULT_PATTERNS 命中嘴角+渗出+血。'
  },
  {
    name: 'result_self_injury_bloody',
    line: '△ 林守钥的手指抠进墙缝，指甲崩裂渗出血丝。',
    expected: true,
    note: '崩裂+渗出血丝双重结构，RESULT_PATTERNS 命中崩裂和渗出。'
  },
  {
    name: 'result_object_state_change',
    line: '△ 咔哒一声，锁扣落下。',
    expected: true,
    note: '物件状态已变，锁扣落下，RESULT_PATTERNS 命中锁扣+落下。'
  },
  {
    name: 'result_object_torn',
    line: '△ 字帖在桌上被撕成两半。',
    expected: true,
    note: '物件被撕裂，RESULT_PATTERNS 命中字帖+撕成。'
  },
  {
    name: 'result_lock_sealed',
    line: '△ 石板复位，锁扣重新落下。',
    expected: true,
    note: '锁扣落下是物件状态改变，EVENT_MARKERS 命中落下。'
  },
  {
    name: 'result_body_bend',
    line: '△ 打手甲的手腕以一个不自然的角度弯折着。',
    expected: false,
    note: 'score=1（无marker命中 EVENT_MARKERS），结果有弯折但判为弱。当前 EVENT_MARKERS 无弯折单字，RESULT_MARKERS 有弯折但无具体结构支持，score=1不够阈值。'
  },
  {
    name: 'result_door_burst',
    line: '△ 库门被一脚踹开，轰然撞在墙上。',
    expected: true,
    note: '门被踹开是物理破坏结果，EVENT_MARKERS 命中踹开/撞开。'
  },
  {
    name: 'result_knife_press',
    line: '△ 刀锋已经压在她脖子上，渗出血丝。',
    expected: true,
    note: '威胁已落地（刀压脖子）并可见血，是对抗结果的典型。'
  },
  {
    name: 'result_enemy_flee',
    line: '△ 敌人捂着流出的血，踉跄后退。',
    expected: false,
    note: 'score=1（EVENT_MARKERS 无捂/后退单字命中），出血描述是结果相关但无 RESULT_PATTERN 结构支持，marker/pressure 均不足够。'
  },
  {
    name: 'result_evidence_taken_zhangce',
    line: '△ 那本账册已被黑影夺走。',
    expected: true,
    note: 'RESULT_PATTERNS 新增：账册被夺走命中 /(账册|字帖|纸|书|信)[^，。；！？\\n]{0,6}(被|已)?(拿走|夺走|抽走|拽出)/，EVENT_MARKERS 命中夺走，score=5，action 条件满足。'
  },
  {
    name: 'result_evidence_taken_chouzou',
    line: '△ 压在地砖下的账册被猛地抽走。',
    expected: true,
    note: 'RESULT_PATTERNS 命中账册+抽走，EVENT_MARKERS 命中抽走，score=5，action 条件满足。'
  },
  {
    name: 'result_evidence_taken_zhuaichu',
    line: '△ 砖下那页账册已被他拽出半截。',
    expected: true,
    note: 'RESULT_PATTERNS 命中账册+拽出，EVENT_MARKERS 命中拽出，score=5，action 条件满足。'
  },
  {
    name: 'result_evidence_taken_nah走',
    line: '△ 沈黑虎将账册从暗格里拿走。',
    expected: true,
    note: 'RESULT_PATTERNS 命中账册+拿走，EVENT_MARKERS 命中拿走，score=5，action 条件满足。注意「拿走」是双字符 EVENT_MARKER，includes 匹配。'
  },
  {
    name: 'result_blood_trail',
    line: '△ 地上一串血迹延伸向门口。',
    expected: false,
    note: 'score=1（RESULT_MARKERS 命中血得1分），无 RESULT_PATTERN 命中，无 pressure/marker，score=1不够阈值4。'
  },
  {
    name: 'result_prints_on_wall',
    line: '△ 血手印清晰地印在内侧墙砖上。',
    expected: true,
    note: '物件状态已变（血印留下），EVENT_MARKERS 命中印，RESULT_MARKERS 命中印。'
  },
  {
    name: 'result_citywide_search_order',
    line: '李科：全城搜！抓小柔！逼她吐出来！',
    expected: true,
    note: '真实误杀回归样本：这是已落地的搜捕命令+逼供威胁，不是观察或预备动作。应判为硬钩子。'
  },
  {
    name: 'result_swept_away_by_tail',
    line: '△ 蛇尾将手下丙和李科一起扫飞出去。',
    expected: true,
    note: '真实误杀回归样本：人已经被扫飞，属于可见后果，不应再因 resultReached=false 被误杀。'
  },
  {
    name: 'result_curtain_ignited_and_burned',
    line: '△ 火苗瞬间点燃垂落的车帘一角，她后背撞上灼热的车厢板壁，衣角瞬间焦黑卷曲。',
    expected: true,
    note: '真实误杀回归样本：火已点燃且衣角已烧焦，后果已经发生。'
  },
  {
    name: 'result_pursuers_step_into_alley',
    line: '△ 尖锐的哨声响彻夜空，追兵的脚步声已踏进巷口。',
    expected: true,
    note: '真实误杀回归样本：追兵已踏进巷口，威胁已经进场，不是单纯逼近。'
  },
  {
    name: 'result_seal_break_alarm',
    line: '值夜执事：所有人！立刻去镇妖地！封印要破了！',
    expected: true,
    note: '真实误杀回归样本：这是即时危机已成形的强命令，不是空喊口号。'
  },
  {
    name: 'result_target_mouth_throat_controlled',
    line: '△ 一只手从背后捂住樵夫的口鼻，另一只手扼住他咽喉。',
    expected: true,
    note: '真实误杀回归样本：目标已被控制，属于明确的人身后果。'
  },

  // ── 2. should_fail_observation ────────────────────────────────────────────
  // 看见了、盯住了、注意力转移，结果没有落地，检测器应判弱并拒绝

  {
    name: 'weak_self_observation',
    line: '△ 他的指尖在身后砖缝上，极轻地叩了三下。',
    expected: false,
    note: '自我观察+细微预备动作，非后果落地，WEAK_HOOK_PATTERNS 命中叩。'
  },
  {
    name: 'weak_stare_at_object',
    line: '△ 林守钥盯着那本假账册，脚尖一挑。',
    expected: false,
    note: '盯着是观察型，WEAK_HOOK_PATTERNS 命中盯。'
  },
  {
    name: 'weak_eyes_fixated',
    line: '△ 弟弟惊恐的眼睛死死盯着他染血的右手。',
    expected: false,
    note: '观察型句子，目标是惊恐反应而非威胁结果，WEAK_HOOK_PATTERNS 命中盯。'
  },
  {
    name: 'weak_gaze_shift',
    line: '△ 沈黑虎顺他视线猛地转头，看向那面斑驳的砖墙。',
    expected: false,
    note: '转头/视线转移是注意力转移，WEAK_HOOK_PATTERNS 命中转头。'
  },
  {
    name: 'weak_looking_at_door',
    line: '△ 他的目光落在门板上，手指还在发抖。',
    expected: false,
    note: '看着/落在是观察型，WEAK_HOOK_PATTERNS 命中看向/落在。'
  },
  {
    name: 'weak_decision_tomove',
    line: '△ 他攥紧拳头，决定转身离开。',
    expected: false,
    note: '攥紧是态度类，WEAK_HOOK_PATTERNS 命中攥紧，decision类。'
  },
  {
    name: 'weak_preparation_tomove',
    line: '△ 他抬脚，准备冲过去。',
    expected: false,
    note: '准备类，WEAK_HOOK_PATTERNS 无明确命中但语义是预备动作，非结果。'
  },
  {
    name: 'weak_feeling_realize',
    line: '△ 他忽然意识到背后有人，猛地转身。',
    expected: false,
    note: '意识到类内心认知，WEAK_HOOK_PATTERNS 命中意识到。'
  },
  {
    name: 'weak_noticing_stranger',
    line: '△ 他看着她，像在看一个陌生人。',
    expected: false,
    note: '观察型比喻，WEAK_HOOK_PATTERNS 命中的弱观察类。'
  },
  {
    name: 'weak_shadow_appearing',
    line: '△ 黑影从墙角闪出，朝他逼近。',
    expected: false,
    note: '黑影逼近是态度/预备动作，非结果已发生，WEAK_HOOK_PATTERNS 命中逼近。'
  },
  {
    name: 'weak_paper_corner_revealed',
    line: '△ 地砖缝里露出一角账册边。',
    expected: false,
    note: '与 result_evidence_taken* 的区别：这里只有「露出一角」，无拿走/夺走/抽走/拽出等结果动作词。RESULT_PATTERNS「账册+被+拿走/夺走/抽走/拽出」不命中，score=0。正确 fail。「露出」是显形动作非结果动作，不应通过。'
  },
  {
    name: 'weak_moonlight_paper_edge',
    line: '△ 月光下，纸边显了出来。',
    expected: false,
    note: '「显了出来」是环境显形，无具体结果动作词。RESULT_PATTERNS「拿走/夺走/抽走/拽出」不命中，score=0。正确 fail。「显出」不等于「拿走」，不能混入「结果动作词」。'
  },

  // ── 3. should_fail_approach ────────────────────────────────────────────────
  // 威胁逼近、危险显形，但结果尚未发生，检测器应判弱并拒绝

  {
    name: 'weak_foot_on_step',
    line: '△ 一只脚，踏上了第一级台阶。',
    expected: false,
    note: '威胁逼近但脚刚落台阶，无实际损害，WEAK_HOOK_PATTERNS 无明确命中但语义是逼近。'
  },
  {
    name: 'weak_torch_appears',
    line: '△ 火把光骤然照亮了石缝口。',
    expected: false,
    note: '危险显形（威胁出现）但尚未造成损害，EVENT_MARKERS 命中的亮/照亮是事件非结果。'
  },
  {
    name: 'weak_door_hand_reaching',
    line: '△ 一只黑手伸向门缝。',
    expected: false,
    note: '手伸进来是逼近开始，EVENT_MARKERS 命中的伸是事件动词非结果。'
  },
  {
    name: 'weak_steps_approaching',
    line: '△ 脚步声越来越近，从巷口拐角传来。',
    expected: false,
    note: '逼近类，EVENT_MARKERS 的来/脚步声是事件非结果，WEAK_HOOK_PATTERNS 无明确命中。'
  },
  {
    name: 'weak_flashlight_discovery',
    line: '△ 手电筒光束扫过窗户，照见了窗台上的人影。',
    expected: false,
    note: '光照到目标是显形，尚未有后果，EVENT_MARKERS 命中亮/照。'
  },
  {
    name: 'weak_enemy_emerges',
    line: '△ 三个黑影从林间闪出，为首的手按刀柄，堵住退路。',
    expected: false,
    note: '堵住是EVENT_MARKERS，但句中堵住是逼近中的状态，非已发生结果。'
  },
  {
    name: 'weak_threat_arrives',
    line: '△ 刀手已经从缝隙伸进来，正在往里探。',
    expected: false,
    note: '正在伸进来是进行中动作，非结果已发生，EVENT_MARKERS 的伸是事件非结果。'
  },
  {
    name: 'weak_figure_outlined',
    line: '△ 火把光照出数道持刀黑影，堵在秘道口。',
    expected: false,
    note: '威胁显形（黑影出现）但尚未造成损害，是逼近非结果。'
  },

  // ── 4. borderline_lockin ──────────────────────────────────────────────────
  // 边界样本，当前检测器最易误判，需产品口径决策

  {
    name: 'borderline_paper_corner_revealed',
    line: '△ 那块地砖的缝隙里，露出一角被压皱的纸边。',
    expected: false,
    note: '产品口径确认（2026-03-29）：「线索显形」不算硬钩子。纸角露出是「看到线索」而非「后果发生」，符合检测器哲学（只认结果已落地）。维持fail=false。若场景需要用此类结尾，应由生成侧落地更具体的结果（如「纸边被拽出」），而非扩词根。'
  },
  {
    name: 'borderline_key_in_moonlight',
    line: '△ 月光照在露出缝隙的铜钥匙上，泛出冷光。',
    expected: false,
    note: '边界：铜钥匙露出是物件显形，但月光泛出冷光是环境描写，非后果。当前fail=true是正确判定，但RESULT_MARKERS含露出会触发误通过风险（score=5碰阈值）。若要通过需定义何为「有效显形」。'
  },
  {
    name: 'borderline_lock_click',
    line: '△ 咔哒一声，锁扣落下。',
    expected: true,
    note: '边界：锁扣落下是物件状态已变，但只有EVENT_MARKER落下无RESULT_PATTERN，旧版本fail=true。RESULT_PATTERNS加锁扣+落下后pass=true。是本批最明确的修复case。'
  },
  {
    name: 'borderline_tear_half',
    line: '△ 疤脸将字帖慢条斯理地撕成两半。',
    expected: true,
    note: '边界：物件被撕裂是结果，但撕成结构需要精确匹配。RESULT_PATTERNS命中字帖+撕成则pass=true，否则fail=false。'
  },
  {
    name: 'borderline_brother_stares_blood',
    line: '△ 弟弟惊恐的眼睛死死盯着他染血的右手。',
    expected: false,
    note: '边界：弟弟的反应是对方可见反应，但盯着是观察型句子，WEAK_HOOK_PATTERNS命中盯。弟弟的反应是真实的，但作为结尾缺乏威胁落地感。应维持fail。'
  },
  {
    name: 'borderline_object_vanishes',
    line: '△ 账册的朱红封皮在夜色中一闪，消失在窗外。',
    expected: false,
    note: '边界：物件消失是状态变化，但消失本身无 RESULT_MARKERS 命中。应fail=true。当前fail=false是合理的——消失本身不构成后果落地。'
  },
  {
    name: 'borderline_fissure_opens',
    line: '△ 堵住入口的岩石已被撬开一道裂缝。',
    expected: false,
    note: 'score=2（RESULT_MARKERS命中撬开得resultMarker=1，EVENT_MARKERS无撬），resultReached=false（岩石不在RESULT_PATTERN的对象列表里），score=2不够阈值4。正确fail。'
  },
  {
    name: 'borderline_shadow_blocking',
    line: '△ 秘道另一端，数支火把骤然亮起，映出堵在前方的数道持刀黑影。',
    expected: false,
    note: '边界：火把亮起是危险显形，黑影堵在前方是逼近状态，非结果已发生。应fail=true。当前分析score=1是正确判定。'
  },
  {
    name: 'borderline_paper_soaked',
    line: '△ 账册被溪水浸透，墨迹正在晕染，纸张在水流中软塌下去。',
    expected: false,
    note: 'score=0（浸透/晕染/软塌均无RESULT_MARKERS命中，无RESULT_PATTERN结构），语义是结果但词根覆盖不足，正确fail。需产品决策是否扩词根。'
  }
]
