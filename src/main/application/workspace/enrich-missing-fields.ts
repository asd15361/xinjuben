/**
 * src/main/application/workspace/enrich-missing-fields.ts
 *
 * 智能补全引擎：enrichMissingFields。
 *
 * 核心逻辑：
 * 1. 扫描人物的必填字段，找出缺失项
 * 2. 根据题材原型匹配默认值
 * 3. 禁止平庸——补出来的东西必须有戏剧张力
 *
 * 铁律："性格温和、追求和平" ❌
 *      "性格冷峻、有仇必报、掌控全局" ✅
 */

import type { CharacterProfileV2Dto } from '../../../shared/contracts/character-profile-v2.ts'
import type { GenreArchetype } from '../../../shared/contracts/prompt-variables.ts'

// ─────────────────────────────────────────────────────────────────────────────
// 兼容旧版 CharacterDraftDto 格式的输入
// ─────────────────────────────────────────────────────────────────────────────

/** 通用的人物字段输入（兼容 V2 和旧版 CharacterDraftDto） */
export interface EnrichableCharacterFields {
  name?: string
  biography?: string
  publicMask?: string
  hiddenPressure?: string
  fear?: string
  protectTarget?: string
  conflictTrigger?: string
  advantage?: string
  weakness?: string
  goal?: string
  arc?: string
  roleLayer?: string
  depthLevel?: 'core' | 'mid' | 'extra'
  roleInFaction?: string
  identity?: string
  factionId?: string
  branchId?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 原型预设接口
// ─────────────────────────────────────────────────────────────────────────────

interface ArchetypePreset {
  appearance: string
  personality: string
  values: string
  plotFunction: string
  hiddenPressure: string
  fear: string
  protectTarget: string
  conflictTrigger: string
  advantage: string
  weakness: string
  goal: string
  arc: string
  publicMask: string
}

type RoleHint = 'protagonist' | 'antagonist' | 'leverageCharacter' | 'unknown'

// ─────────────────────────────────────────────────────────────────────────────
// 原型库：每个题材 × 每个角色位 = 一套爆发力预设
// ─────────────────────────────────────────────────────────────────────────────

const PRESETS: Record<GenreArchetype, Record<RoleHint, ArchetypePreset>> = {
  xianxia: {
    unknown: {
      appearance: '20-25岁，身形清瘦但肩背挺直，衣着朴素干净，眼神沉静。',
      personality: '表面低调内敛，内里冷硬如铁；有仇必报但不急一时。',
      values: '欠债必还，欠命必讨；弱小时绝不认命，强大后绝不宽恕。',
      plotFunction: '用智慧和信息差碾压对手，每次被逼到绝境都能反手做局。',
      hiddenPressure: '身世/血脉有致命秘密，一旦暴露就是灭顶之灾。',
      fear: '最怕守护的人因自己而死。',
      protectTarget: '身边唯一真心待他的人/物。',
      conflictTrigger: '当守护的人被威胁时，表面继续忍，暗里开始布局。',
      advantage: '信息差、隐藏底牌、对手轻视他。',
      weakness: '守护的人是唯一的软肋。',
      goal: '查清真相，拿回属于自己的东西。',
      arc: '从隐忍少年到主动做局的执棋者。',
      publicMask: '装弱、装不懂、低头赔笑；把锋芒藏到最后一刀。'
    },
    protagonist: {
      appearance: '18-22岁，身形清瘦但肩背挺直，衣着朴素但干净利落，眼神沉静如潭。',
      personality: '表面顺从忍让，内里冷硬如铁；有仇必报但不急一时；极度克制，从不失控。',
      values: '欠债必还，欠命必讨；弱小时绝不低头认命，强大后绝不宽恕恶人。',
      plotFunction: '用智慧和信息差碾压对手，每次被逼到绝境都能反手做局。',
      hiddenPressure: '身世/血脉有致命秘密，一旦暴露整个组织都会追杀。',
      fear: '最怕守护的人因自己而死。',
      protectTarget: '身边唯一真心待他的人/物。',
      conflictTrigger: '当守护的人被当面威胁时，表面继续忍，暗里开始布局。',
      advantage: '信息差、隐藏底牌、对手轻视他。',
      weakness: '守护的人是他的软肋，一旦被抓到就陷入被动。',
      goal: '查清真相，拿回属于自己的东西，让所有仇人逐一付出代价。',
      arc: '从被动防守的隐忍少年，到主动做局的执棋者。',
      publicMask: '装弱、装不懂、低头赔笑、递水倒茶；把锋芒藏到最后一刀。'
    },
    antagonist: {
      appearance: '30-45岁，衣着考究，面容温和但眼神冰冷，举止优雅如书生。',
      personality: '极度理性，善用规则杀人；从不亲自动手，永远借别人的刀；笑里藏刀。',
      values: '秩序由强者制定，弱者没有资格谈公平；利益高于一切。',
      plotFunction: '持续施压的发动机，每次主角刚喘口气就带来更狠的新局。',
      hiddenPressure: '他的权力来源不干净，一旦翻盘就是万丈深渊。',
      fear: '最怕失去现有的地位和话语权。',
      protectTarget: '自己的名声和地位。',
      conflictTrigger: '当有人开始动摇他的规则根基时，会从微笑转为灭口。',
      advantage: '掌握规则、资源、人脉；站在明面上打压所有人。',
      weakness: '过度自信，轻视底层人物的反击能力。',
      goal: '彻底掌控局面，清除一切不稳定因素。',
      arc: '从游刃有余到被逼出真面目，最后底牌尽失。',
      publicMask: '永远微笑、讲道理、按规矩办事；把恶行包装成正义。'
    },
    leverageCharacter: {
      appearance: '16-24岁，外表柔弱但眼神倔强，衣着简朴但整洁。',
      personality: '外柔内刚；被欺负时会哭但绝不求饶；关键时刻比谁都硬气。',
      values: '真心换真心；认定的人就算死也不背叛。',
      plotFunction: '情感杠杆+信息传递者；她的安危直接决定主角的行动节奏。',
      hiddenPressure: '自己的身世/能力有隐藏价值，一旦被势力盯上就是筹码。',
      fear: '最怕成为主角的累赘。',
      protectTarget: '主角和仅有的安全感。',
      conflictTrigger: '当主角因为保护她而隐忍时，她会主动出击打破僵局。',
      advantage: '能接触到主角接触不到的信息；她的存在能改变主角的行为模式。',
      weakness: '武力值低，容易被挟持。',
      goal: '不再被保护，想成为能帮到主角的人。',
      arc: '从被保护的弱者到主动改局的关键棋子。',
      publicMask: '装作听话、胆小、什么都不懂；暗里记仇、藏证、递情报。'
    }
  },
  modern_revenge: {
    unknown: {
      appearance: '25-35岁，穿着得体但眼神凌厉，举止从容但骨子里透着野性。',
      personality: '极度冷静，善于伪装；表面谈笑风生，暗里磨刀霍霍。',
      values: '公平是杀出来的，不是求来的；背叛者必须付出代价。',
      plotFunction: '用商业手段做局，每次交锋都让对手损失更惨重。',
      hiddenPressure: '当年的真相还差最后一块拼图。',
      fear: '最怕真相大白之前就被做掉。',
      protectTarget: '仅存的亲信和翻盘的唯一证据。',
      conflictTrigger: '当对手触碰到底线时，不再忍，直接掀桌。',
      advantage: '对手不知道他的真实底牌；信息差是最大的武器。',
      weakness: '情感软肋被对手锁定。',
      goal: '夺回被抢走的一切。',
      arc: '从暗中蛰伏的猎物到主动收网的猎人。',
      publicMask: '纨绔子弟/无害小透明；把野心藏在笑脸后面。'
    },
    protagonist: {
      appearance: '25-35岁，西装革履但眼神凌厉，举止从容但骨子里透着野性。',
      personality: '极度冷静，善于伪装；表面谈笑风生，暗里磨刀霍霍；睚眦必报但耐心等待时机。',
      values: '公平是杀出来的，不是求来的；背叛者必须付出代价。',
      plotFunction: '用商业手段做局，每一次交锋都让对手损失更惨重。',
      hiddenPressure: '当年的真相还差最后一块拼图，不够完整就无法翻盘。',
      fear: '最怕真相大白之前就被做掉。',
      protectTarget: '仅存的亲信和翻盘的唯一证据。',
      conflictTrigger: '当对手触碰到底线人物或最后一道防线时，不再忍，直接掀桌。',
      advantage: '对手不知道他的真实底牌和身份；信息差就是最大的武器。',
      weakness: '情感软肋被对手锁定，一旦出手就暴露位置。',
      goal: '夺回被抢走的一切，让所有参与者血债血偿。',
      arc: '从暗中蛰伏的猎物到主动收网的猎人。',
      publicMask: '纨绔子弟/无害小透明/忠诚下属；把野心藏在笑脸后面。'
    },
    antagonist: {
      appearance: '35-55岁，气场强大，西装定制，举手投足都是上位者的傲慢。',
      personality: '控制狂，极度自负；把所有人当棋子；不允许任何人挑战权威。',
      values: '这个世界是零和博弈；赢家通吃，输家没有资格说话。',
      plotFunction: '用资本和权力双重碾压，每次主角刚有起色就断他后路。',
      hiddenPressure: '发家史有见不得光的污点，一旦被翻出就是灭顶之灾。',
      fear: '失去一手建立的帝国和话语权。',
      protectTarget: '自己的商业帝国和公众形象。',
      conflictTrigger: '当底层棋子开始反叛或证据链开始闭合时，从操控转为灭口。',
      advantage: '资本、人脉、法律团队、媒体话语权。',
      weakness: '过度依赖钱权，不懂底层人的拼命逻辑。',
      goal: '彻底吞并/消灭对手，完成最后一块版图。',
      arc: '从高高在上的操盘手到被逼到墙角的困兽。',
      publicMask: '慈善家、行业领袖、温文尔雅的前辈；把掠夺包装成商业布局。'
    },
    leverageCharacter: {
      appearance: '22-30岁，外表精致但内心疲惫，衣着考究但掩不住不安。',
      personality: '善良但不再天真；被伤害过但依然选择相信；关键时刻敢赌。',
      values: '真相比利益更重要；良心比金钱更珍贵。',
      plotFunction: '情感锚点+关键证据持有者；她的选择决定最终胜负。',
      hiddenPressure: '自己手上也沾着灰，不干净。',
      fear: '最怕发现信任的人一直在利用自己。',
      protectTarget: '仅存的真相和良心。',
      conflictTrigger: '当发现被利用到极致时，从棋子变成变量。',
      advantage: '掌握对手不知道的关键信息/证据。',
      weakness: '情感上容易被操控，犹豫不决。',
      goal: '找到真相，做出无愧于心的选择。',
      arc: '从被操控的棋子到决定胜负的关键手。',
      publicMask: '温顺的未婚妻/听话的下属；暗里搜集证据、留后手。'
    }
  },
  period_palace: {
    unknown: {
      appearance: '18-28岁，容貌不张扬但有气韵，衣着符合身份但总有不争不抢的低调。',
      personality: '极度隐忍，步步为营；表面温顺如水，暗里心如明镜。',
      values: '活下来才能谈对错；宁可负天下人，不可让天下人负我。',
      plotFunction: '在权力漩涡中，用智慧和人心做武器向上攀爬。',
      hiddenPressure: '真实身份一旦暴露就是死罪。',
      fear: '最怕重蹈覆辙。',
      protectTarget: '唯一真心待己的人。',
      conflictTrigger: '当守护的人被当众羞辱时，从防守转进攻。',
      advantage: '善于察言观色、利用矛盾、借刀杀人。',
      weakness: '情感是唯一的软肋。',
      goal: '从棋子到执棋者。',
      arc: '从任人宰割的底层到翻手为云的权力者。',
      publicMask: '温顺、胆小、不争不抢；把算计藏在低头的一瞬。'
    },
    protagonist: {
      appearance: '16-25岁，容貌出众但不张扬，衣着符合身份但总有不起眼的小细节。',
      personality: '极度隐忍，步步为营；表面温顺如水，暗里心如明镜；有仇必报但等得起。',
      values: '活下来才能谈对错；宁可负天下人，不可让天下人负我。',
      plotFunction: '在后宫/朝堂的权力漩涡中，用智慧和人心做武器向上攀爬。',
      hiddenPressure: '真实身份/家族背景一旦暴露就是死罪。',
      fear: '最怕重蹈母亲的覆辙。',
      protectTarget: '唯一真心待己的人。',
      conflictTrigger: '当守护的人被当众羞辱或迫害时，开始从防守转进攻。',
      advantage: '善于察言观色、利用矛盾、借刀杀人。',
      weakness: '情感是唯一的软肋。',
      goal: '从棋子到执棋者，掌握自己的命运。',
      arc: '从任人宰割的底层到翻手为云覆手为雨的权力者。',
      publicMask: '温顺、胆小、不争不抢；把算计藏在低头的一瞬。'
    },
    antagonist: {
      appearance: '25-45岁，华贵逼人，容貌艳丽但眼神狠厉，举手投足都是上位者的威压。',
      personality: '极度自负，控制欲强；笑里藏刀；不允许任何人威胁自己的地位。',
      values: '权力就是一切；没有权力的人连呼吸都是错的。',
      plotFunction: '用权力和规矩双重压迫，把主角逼到墙角。',
      hiddenPressure: '自己的上位之路也不干净，有人握着把柄。',
      fear: '失去恩宠和地位，被打回原形。',
      protectTarget: '现有的权力和地位。',
      conflictTrigger: '当有人开始动摇她的根基时，从打压转为灭口。',
      advantage: '地位、恩宠、家族势力、规矩话语权。',
      weakness: '树敌太多，一旦失势就是墙倒众人推。',
      goal: '彻底清除所有威胁，独揽大权。',
      arc: '从不可一世到众叛亲离、自食恶果。',
      publicMask: '端庄大方、母仪天下；把迫害包装成立规矩。'
    },
    leverageCharacter: {
      appearance: '14-22岁，容貌清秀，衣着简单但干净，眼神纯真但偶尔闪过狡黠。',
      personality: '忠诚但并非愚忠；看似天真实则大智若愚；关键时刻有惊人的勇气。',
      values: '主子是她的天；认定的主子就是一辈子。',
      plotFunction: '忠心仆人+意外情报来源；在关键时刻为主角提供翻盘机会。',
      hiddenPressure: '自己也有不为人知的过去，可能成为主角的把柄。',
      fear: '最怕被主子误解或抛弃。',
      protectTarget: '主子的安危和名誉。',
      conflictTrigger: '当主子被陷害时，宁可牺牲自己也要揭发真相。',
      advantage: '不起眼，所以能听到别人听不到的话。',
      weakness: '武功低微，容易被收买或威胁。',
      goal: '帮助主子站稳脚跟。',
      arc: '从懵懂小丫鬟到独当一面的心腹。',
      publicMask: '乖巧听话、什么都不懂；暗里替主子办事、套话传信。'
    }
  },
  urban_romance: {
    unknown: {
      appearance: '22-30岁，气质出众，穿搭时尚但不张扬，笑容有感染力但眼底有故事。',
      personality: '外表开朗独立，内里有不轻易示人的伤疤；遇到背叛后不再轻信。',
      values: '爱情不是依附，是并肩作战；尊严比幸福更重要。',
      plotFunction: '在情感纠葛和事业成长中，从被伤害者成长为掌控者。',
      hiddenPressure: '有一段不愿提及的过去/身世秘密。',
      fear: '最怕再次被最信任的人背叛。',
      protectTarget: '自己的事业和尊严。',
      conflictTrigger: '当过去的人和事再次交织时，不再逃避，正面迎战。',
      advantage: '专业能力过硬，性格坚韧。',
      weakness: '对感情仍然抱有幻想，容易被旧情动摇。',
      goal: '在事业和爱情中都站稳自己的位置。',
      arc: '从被动承受伤害到主动选择人生。',
      publicMask: '开朗乐观、什么都不在乎；把伤痕藏在深夜。'
    },
    protagonist: {
      appearance: '22-30岁，气质出众，穿搭时尚但不张扬，笑容有感染力但眼底有故事。',
      personality: '外表开朗独立，内里有不轻易示人的伤疤；遇到背叛后不再轻信但依然相信爱情。',
      values: '爱情不是依附，是并肩作战；尊严比幸福更重要。',
      plotFunction: '在情感纠葛和事业成长中，从被伤害者成长为掌控者。',
      hiddenPressure: '有一段不愿提及的过去/身世秘密。',
      fear: '最怕再次被最信任的人背叛。',
      protectTarget: '自己的事业和尊严。',
      conflictTrigger: '当过去的人和事再次交织时，不再逃避，正面迎战。',
      advantage: '专业能力过硬，性格坚韧。',
      weakness: '对感情仍然抱有幻想，容易被旧情动摇。',
      goal: '在事业和爱情中都站稳自己的位置。',
      arc: '从被动承受伤害到主动选择人生。',
      publicMask: '开朗乐观、什么都不在乎；把伤痕藏在深夜。'
    },
    antagonist: {
      appearance: '25-35岁，外表光鲜亮丽，气质高冷或妩媚，举手投足都是优越感。',
      personality: '极度自我中心；认为所有人都该为自己让路；善于利用别人的善良。',
      values: '想要的就必须得到；手段不重要，结果才重要。',
      plotFunction: '制造情感误会和事业阻碍，逼迫主角成长和觉醒。',
      hiddenPressure: '光鲜背后的空虚和见不得光的手段。',
      fear: '失去现有的优越生活和关注度。',
      protectTarget: '自己的完美形象和社会地位。',
      conflictTrigger: '当发现有人不按剧本走时，从暗斗转为明抢。',
      advantage: '外貌、家世、社交资源、舆论操控力。',
      weakness: '傲慢，低估普通人的反击能力。',
      goal: '得到想要的一切，让所有障碍消失。',
      arc: '从高高在上到失去所有伪装、暴露真面目。',
      publicMask: '温柔大度、善解人意、完美闺蜜/未婚妻；暗里挖坑。'
    },
    leverageCharacter: {
      appearance: '22-30岁，气质温润，穿着得体，笑容温暖但有力量感。',
      personality: '真诚、坚定、不逃避；在感情中不玩套路但也不当傻子。',
      values: '真心是唯一的套路；信任一旦给出就不会收回。',
      plotFunction: '情感救赎者+事业助力；在主角最脆弱的时候提供支撑和力量。',
      hiddenPressure: '自己的感情曾受过伤，但选择不再隐藏。',
      fear: '最怕自己的真心被辜负。',
      protectTarget: '和主角之间的信任和感情。',
      conflictTrigger: '当主角因为过去而推开自己时，不放弃，用行动证明。',
      advantage: '真诚是最强大的武器；有主角需要的资源或信息。',
      weakness: '太容易相信别人。',
      goal: '和主角建立平等的、坦诚的关系。',
      arc: '从默默守护到勇敢争取，最终赢得真心。',
      publicMask: '温和、不强势、永远在旁边；关键时刻比谁都坚定。'
    }
  },
  scifi: {
    unknown: {
      appearance: '25-40岁，穿着功能型战术服，眼神警觉，身体有伤疤或机械改造痕迹。',
      personality: '极度务实，不废话；经历过背叛后不再信任任何组织。',
      values: '生存是第一位的，但有些底线不能用命换。',
      plotFunction: '在高科技低信任的世界中，用技术和意志在阴谋中杀出一条血路。',
      hiddenPressure: '自己的身体/意识正在被某种技术侵蚀。',
      fear: '最怕失去对自己思想和记忆的控制权。',
      protectTarget: '仅存的真相和同伴。',
      conflictTrigger: '当发现组织在对自己人下手时，从服从转为反抗。',
      advantage: '技术能力、战斗经验、在暗处行动的自由。',
      weakness: '被系统追踪/通缉，资源有限。',
      goal: '揭露真相，摧毁幕后黑手。',
      arc: '从体制内的工具人到反抗体制的领袖。',
      publicMask: '服从命令的士兵/技师；暗里调查真相、备份数据。'
    },
    protagonist: {
      appearance: '25-40岁，穿着功能型战术服，眼神警觉，身体有伤疤或机械改造痕迹。',
      personality: '极度务实，不废话；经历过背叛后不再信任任何组织；行动先于言语。',
      values: '生存是第一位的，但有些底线不能用命换。',
      plotFunction: '在高科技低信任的世界中，用技术和意志在阴谋中杀出一条血路。',
      hiddenPressure: '自己的身体/意识正在被某种技术侵蚀。',
      fear: '最怕失去对自己思想和记忆的控制权。',
      protectTarget: '仅存的真相和同伴。',
      conflictTrigger: '当发现组织/联邦在对自己人下手时，从服从转为反抗。',
      advantage: '技术能力、战斗经验、在暗处行动的自由。',
      weakness: '被系统追踪/通缉，资源有限。',
      goal: '揭露真相，摧毁操控一切的幕后黑手。',
      arc: '从体制内的工具人到反抗体制的领袖。',
      publicMask: '服从命令的士兵/技师；暗里调查真相、备份数据。'
    },
    antagonist: {
      appearance: '35-60岁，西装或制服，面容和蔼但眼神没有温度，举止完美如机器。',
      personality: '极端理性，没有感情波动；把人类当数据点；效率高于一切道德。',
      values: '进步需要牺牲，牺牲少数是为了大多数；控制就是保护。',
      plotFunction: '用技术、信息、体制三重压迫制造几乎无法打破的困境。',
      hiddenPressure: '核心技术有致命缺陷，一旦被公开整个系统崩溃。',
      fear: '失控——技术、人员、信息超出掌控。',
      protectTarget: '技术和体制的绝对控制权。',
      conflictTrigger: '当有人开始突破信息封锁时，从管控转为清洗。',
      advantage: '技术垄断、数据监控、体制权力、武装力量。',
      weakness: '不理解人类的情感变量，无法预测非理性行为。',
      goal: '完成最终控制，消除所有不可控因素。',
      arc: '从绝对掌控到被自己忽视的人性变量反噬。',
      publicMask: '为了人类未来的远见者；把控制包装成保护。'
    },
    leverageCharacter: {
      appearance: '20-35岁，穿着朴素，气质安静，手上有技术工作的痕迹。',
      personality: '安静但观察力极强；不主动卷入冲突但一旦决定就不回头。',
      values: '真相有被知道的权力；技术应该服务人而不是控制人。',
      plotFunction: '技术破局者+道德锚点；掌握扭转局势的关键数据/代码。',
      hiddenPressure: '手中的数据一旦被泄露，所有人都会来追杀。',
      fear: '最怕真相被永远埋葬。',
      protectTarget: '关键数据和身边的人。',
      conflictTrigger: '当发现数据被用于迫害无辜时，从隐藏转为公开。',
      advantage: '独有的技术能力和关键数据。',
      weakness: '不是战士，面对暴力时脆弱。',
      goal: '让真相大白于天下。',
      arc: '从躲在暗处的技术员到站出来面对全世界的证人。',
      publicMask: '不起眼的后勤人员；暗里解码、备份、传递真相。'
    }
  },
  fantasy: {
    unknown: {
      appearance: '18-28岁，衣着带有冒险者痕迹，身上有神秘印记。',
      personality: '坚韧、不服输、对不公极度敏感；被压迫得越狠反击越猛。',
      values: '命运自己说了算；天生弱势不代表就该认命。',
      plotFunction: '在奇幻世界中探索自身力量的真相，从被命运裹挟到改写命运。',
      hiddenPressure: '血脉/印记的力量不受控制，爆发时会伤及无辜。',
      fear: '最怕自己变成和压迫者一样的人。',
      protectTarget: '一起长大的同伴和无辜者。',
      conflictTrigger: '当同伴被当众伤害时，不再压抑力量。',
      advantage: '未知的血脉力量、同伴的信任、底层生存技能。',
      weakness: '力量不稳定，使用时有代价。',
      goal: '掌握自己的力量，摧毁压迫的源头。',
      arc: '从被命运标记的弃儿到改写世界规则的执棋者。',
      publicMask: '普通的冒险者/佣兵/学徒；隐藏血脉和能力。'
    },
    protagonist: {
      appearance: '18-28岁，衣着带有冒险者痕迹，身上有神秘印记或特殊血脉的体征。',
      personality: '坚韧、不服输、对不公极度敏感；被压迫得越狠反击越猛。',
      values: '命运自己说了算；天生弱势不代表就该认命。',
      plotFunction: '在奇幻世界中探索自身力量的真相，从被命运裹挟到改写命运。',
      hiddenPressure: '血脉/印记的力量不受控制，爆发时会伤及无辜。',
      fear: '最怕自己变成和压迫者一样的人。',
      protectTarget: '一起长大的同伴和无辜者。',
      conflictTrigger: '当同伴被当众伤害时，不再压抑力量。',
      advantage: '未知的血脉力量、同伴的信任、在底层积累的生存技能。',
      weakness: '力量不稳定，使用时有代价。',
      goal: '掌握自己的力量，摧毁压迫的源头。',
      arc: '从被命运标记的弃儿到改写世界规则的执棋者。',
      publicMask: '普通的冒险者/佣兵/学徒；隐藏血脉和能力。'
    },
    antagonist: {
      appearance: '外貌年龄不明，衣着华贵或黑暗系，气场压迫感极强。',
      personality: '傲慢到不屑解释；认为自己是天命所归；对反抗者不是愤怒而是轻蔑。',
      values: '力量决定一切；弱者存在的意义就是被强者使用。',
      plotFunction: '用绝对的力量差距和资源碾压，逼迫主角不断突破极限。',
      hiddenPressure: '力量的来源是窃取/禁忌，一旦真相大白合法性尽失。',
      fear: '失去力量或被更古老的力量取代。',
      protectTarget: '力量源泉和统治合法性。',
      conflictTrigger: '当有人开始动摇根基时，从无视转为全力抹杀。',
      advantage: '绝对的力量、资源、知识、古老盟友。',
      weakness: '傲慢到不屑了解底层，信息盲区大。',
      goal: '完成最终仪式/计划，巩固绝对统治。',
      arc: '从不可一世到被自己蔑视的力量反噬。',
      publicMask: '守护者/天命之王；把掠夺包装成恩赐。'
    },
    leverageCharacter: {
      appearance: '年龄不定，外表柔弱或平凡，但有某种不寻常的气质。',
      personality: '看似柔弱但有不可动摇的信念；在关键时刻展现超出所有人的勇气。',
      values: '羁绊比力量更重要；有些东西值得用命去守护。',
      plotFunction: '情感驱动者+封印/力量的关键；她的存在决定力量的使用方式。',
      hiddenPressure: '自己就是封印/力量的钥匙。',
      fear: '最怕被力量吞噬的人忘记自己是谁。',
      protectTarget: '主角的人性和他们之间的羁绊。',
      conflictTrigger: '当主角即将被力量或仇恨吞噬时，用自己的方式拉回来。',
      advantage: '与力量的特殊连接、纯粹的信念。',
      weakness: '物理防御低，容易被针对。',
      goal: '守护主角不被力量改变，让故事有好的结局。',
      arc: '从需要被保护的人到守护他人心灵的力量。',
      publicMask: '柔弱的同伴/不起眼的存在；关键时刻站出来。'
    }
  },
  default: {
    unknown: {
      appearance: '25-35岁，外表普通但眼神锐利，穿衣风格实用主义。',
      personality: '表面低调内敛，内里极度固执；有底线，触之必反击。',
      values: '欠债还钱，欠命还命；绝不向恶势力妥协。',
      plotFunction: '在极端压力下用非常规手段破局，是整部剧的核心驱动力。',
      hiddenPressure: '有一个不能说的秘密，一旦曝光满盘皆输。',
      fear: '最怕守护的人因自己而受伤。',
      protectTarget: '最重要的人和最后的底线。',
      conflictTrigger: '当底线被践踏时，不再退让。',
      advantage: '对手低估他、信息差、极强的执行力。',
      weakness: '守护的人是唯一的软肋。',
      goal: '翻盘，让所有作恶者付出代价。',
      arc: '从隐忍退让到主动出击。',
      publicMask: '低调、顺从、不起眼；暗里磨刀。'
    },
    protagonist: {
      appearance: '25-35岁，外表普通但眼神锐利，穿衣风格实用主义。',
      personality: '表面低调内敛，内里极度固执；有底线，触之必反击。',
      values: '欠债还钱，欠命还命；绝不向恶势力妥协。',
      plotFunction: '在极端压力下用非常规手段破局，是整部剧的核心驱动力。',
      hiddenPressure: '有一个不能说的秘密，一旦曝光满盘皆输。',
      fear: '最怕守护的人因自己而受伤。',
      protectTarget: '最重要的人和最后的底线。',
      conflictTrigger: '当底线被践踏时，不再退让。',
      advantage: '对手低估他、信息差、极强的执行力。',
      weakness: '守护的人是唯一的软肋。',
      goal: '翻盘，让所有作恶者付出代价。',
      arc: '从隐忍退让到主动出击。',
      publicMask: '低调、顺从、不起眼；暗里磨刀。'
    },
    antagonist: {
      appearance: '35-50岁，外表体面，举止从容，但眼神中透着不容挑战的威压。',
      personality: '极度自信，善用规则；从不失控，永远在布局。',
      values: '规则是强者给弱者制定的；赢家不需要道歉。',
      plotFunction: '持续施压的发动机，用权力和资源不断压缩主角的生存空间。',
      hiddenPressure: '上位之路有见不得光的污点。',
      fear: '失去现有的一切。',
      protectTarget: '地位和名声。',
      conflictTrigger: '当根基被动摇时，从规则打压转为不择手段。',
      advantage: '资源、权力、规则制定权。',
      weakness: '傲慢，看不到来自底层的反击。',
      goal: '彻底掌控局面。',
      arc: '从掌控一切到失控崩溃。',
      publicMask: '体面的上位者；把私欲包装成大局。'
    },
    leverageCharacter: {
      appearance: '20-30岁，外表柔和但骨子里有倔强。',
      personality: '善良但有底线；被伤害过但不变成恶人。',
      values: '真心最珍贵；认定的事不回头。',
      plotFunction: '情感杠杆+关键变量；她的选择改变战局走向。',
      hiddenPressure: '握有双方都不想让外界知道的信息。',
      fear: '最怕被利用后抛弃。',
      protectTarget: '真相和重要的人。',
      conflictTrigger: '当发现被利用时，从棋子变成棋手。',
      advantage: '掌握关键信息、双方都想要她。',
      weakness: '情感上容易被操控。',
      goal: '做出无愧于心的选择。',
      arc: '从被动卷入到主动选择阵营。',
      publicMask: '温顺听话；暗里保留证据、留后手。'
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 核心函数：enrichMissingFields
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 智能补全：根据题材自动填充缺失的五维字段。
 *
 * 核心逻辑：
 * 1. 扫描人物的必填字段，找出缺失项
 * 2. 根据人物角色匹配原型
 * 3. 用原型库的爆发力预设填充——禁止平庸
 * 4. 已有字段不覆盖——用户说的算
 *
 * @param profile 需要补全的人物（字段可以部分缺失）
 * @param genreArchetype 题材类型
 * @param roleHint 角色位暗示
 * @returns 补全后的人物（五维全部填充）
 */
export function enrichMissingFields(
  profile: Partial<CharacterProfileV2Dto>,
  genreArchetype: GenreArchetype,
  roleHint: RoleHint = 'unknown'
): CharacterProfileV2Dto {
  const preset = PRESETS[genreArchetype]?.[roleHint] || PRESETS.default[roleHint]

  const identity = profile.identity || guessIdentity(profile, roleHint)

  const enriched: CharacterProfileV2Dto = {
    id: profile.id || `char_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name:
      profile.name ||
      (roleHint === 'protagonist' ? '主角' : roleHint === 'antagonist' ? '对手' : '关键人物'),
    depthLevel: profile.depthLevel || 'core',
    factionId: profile.factionId,
    branchId: profile.branchId,
    roleInFaction: profile.roleInFaction,

    // ── 五维必填：已有值不改，缺失用原型库 ──
    appearance: profile.appearance || preset.appearance,
    personality: profile.personality || preset.personality,
    identity,
    values: profile.values || preset.values,
    plotFunction: profile.plotFunction || preset.plotFunction,

    // ── 核心人物扩展 ──
    hiddenPressure: profile.hiddenPressure || preset.hiddenPressure,
    fear: profile.fear || preset.fear,
    protectTarget: profile.protectTarget || preset.protectTarget,
    conflictTrigger: profile.conflictTrigger || preset.conflictTrigger,
    advantage: profile.advantage || preset.advantage,
    weakness: profile.weakness || preset.weakness,
    goal: profile.goal || preset.goal,
    arc: profile.arc || preset.arc,
    publicMask: profile.publicMask || preset.publicMask,

    // ── 兼容旧字段 ──
    biography: profile.biography || `${identity}。${preset.values}。${preset.plotFunction}`
  }

  return enriched
}

/**
 * 批量补全：给一组人物统一补全缺失字段。
 */
export function enrichMissingFieldsBatch(
  profiles: Partial<CharacterProfileV2Dto>[],
  genreArchetype: GenreArchetype
): CharacterProfileV2Dto[] {
  return profiles.map((profile) => {
    // 自动推断角色位
    const roleHint = inferRoleHint(profile)
    return enrichMissingFields(profile, genreArchetype, roleHint)
  })
}

/**
 * 根据已有信息推断角色位。
 */
function inferRoleHint(profile: Partial<CharacterProfileV2Dto>): RoleHint {
  // 从 roleInFaction 推断
  if (profile.roleInFaction === 'leader' && profile.depthLevel === 'core') return 'protagonist'
  if (profile.roleInFaction === 'enforcer' && profile.depthLevel === 'core') return 'antagonist'

  // 从 name 推断（兼容旧数据）
  const name = profile.name || ''
  if (/主角|男[一二]|女主|女主/.test(name)) return 'protagonist'
  if (/反派|对手|恶[霸人]/.test(name)) return 'antagonist'
  if (/妾|妹|丫|侍|柔|婉/.test(name)) return 'leverageCharacter'

  return 'unknown'
}

/**
 * 根据已有信息猜测身份。
 */
function guessIdentity(profile: Partial<CharacterProfileV2Dto>, roleHint: RoleHint): string {
  // 如果用户填了 roleInFaction，优先从势力信息推导
  if (profile.roleInFaction) {
    switch (profile.roleInFaction) {
      case 'leader':
        return `${profile.name || '领袖'}｜势力掌舵人`
      case 'enforcer':
        return `${profile.name || '干将'}｜核心打手`
      case 'variable':
        return `${profile.name || '变数'}｜暗线/卧底`
      case 'functional':
        return `${profile.name || '角色'}｜功能性角色`
    }
  }

  switch (roleHint) {
    case 'protagonist':
      return '被命运逼到墙角却绝不低头的人'
    case 'antagonist':
      return '用规则和权力掌控局面的上位者'
    case 'leverageCharacter':
      return '被卷入漩涡中心的关键人物'
    default:
      return `${profile.name || '角色'}｜待补充`
  }
}
