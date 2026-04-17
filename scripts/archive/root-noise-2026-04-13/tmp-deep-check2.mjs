import fs from 'fs';

const testContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);
const promptContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Get line 885 from the test
const testLines = testContent.split('\n');
const line885 = testLines[884];
console.log('Line 885:', JSON.stringify(line885));

// Extract the rule from line 885
const quoteStart = line885.indexOf("'");
const quoteEnd = line885.indexOf("'", quoteStart + 1);
const rule = line885.substring(quoteStart + 1, quoteEnd);
console.log('\nRule:', JSON.stringify(rule));
console.log('Rule length:', rule.length);
console.log('Rule char codes:', [...rule].map(c => c.charCodeAt(0)));

// Now run the actual test function
// We need to import the createPromptInputForTuning function
// But we can't do that easily. Let me instead just copy the logic.

const input = {
  plan: {
    mode: 'fresh_start',
    ready: true,
    blockedBy: [],
    contract: {
      ready: true,
      targetEpisodes: 12,
      structuralActs: [],
      missingActs: [],
      confirmedFormalFacts: [],
      missingFormalFactLandings: [],
      storyContract: {
        characterSlots: {
          protagonist: '少年守钥人',
          antagonist: '恶霸',
          heroine: '小镇少女',
          mentor: '师父'
        },
        eventSlots: {
          finalePayoff: '',
          antagonistPressure: '',
          antagonistLoveConflict: '',
          relationshipShift: '',
          healingTechnique: '',
          themeRealization: ''
        },
        requirements: {
          requireFinalePayoff: false,
          requireHiddenCapabilityForeshadow: false,
          requireAntagonistContinuity: false,
          requireAntagonistLoveConflict: false,
          requireRelationshipShift: false,
          requireHealingTechnique: false,
          requireThemeRealization: false
        },
        hardFacts: [],
        softFacts: []
      },
      userAnchorLedger: {
        anchorNames: [],
        protectedFacts: [],
        heroineRequired: false,
        heroineHint: ''
      },
      missingAnchorNames: [],
      heroineAnchorCovered: true
    },
    targetEpisodes: 12,
    existingSceneCount: 4,
    recommendedPrimaryLane: 'deepseek',
    recommendedFallbackLane: 'deepseek',
    runtimeProfile: {
      contextPressureScore: 5,
      shouldCompactContextFirst: false,
      maxStoryIntentChars: 1600,
      maxCharacterChars: 1800,
      maxSegmentChars: 900,
      recommendedBatchSize: 4,
      profileLabel: 'balanced',
      reason: 'test'
    },
    episodePlans: []
  },
  outlineTitle: '守钥人',
  theme: '人在压力里被逼亮底',
  mainConflict: '恶霸用少女和钥匙同时施压',
  charactersSummary: ['少年守钥人：守住钥匙和人', '恶霸：抢钥匙逼亮底'],
  storyIntent: {
    sellingPremise: '他明明能动手，却被旧规矩逼着先忍。',
    coreDislocation: '最能打的人，偏偏先不能打。',
    emotionalPayoff: '忍到极限后的亮底反击',
    officialKeyCharacters: ['少年守钥人', '恶霸', '小镇少女'],
    lockedCharacterNames: ['少年守钥人', '恶霸', '小镇少女'],
    themeAnchors: ['守与代价'],
    worldAnchors: ['镇口逼压'],
    relationAnchors: ['恶霸拿少女逼钥匙'],
    dramaticMovement: ['先忍后亮底'],
    shortDramaConstitution: {
      title: '守钥人',
      genre: '短剧',
      coreConflict: '恶霸用少女和钥匙同时施压',
      protagonist: '少年守钥人',
      protagonistGoal: '守住钥匙和人',
      emotionalTone: '人在压力里被逼亮底',
      style: '真实',
      rules: [],
    },
  },
  outline: {
    title: '守钥人',
    genre: '短剧',
    theme: '人在压力里被逼亮底',
    mainConflict: '恶霸用少女和钥匙同时施压',
    protagonist: '少年守钥人',
    summary: 'summary',
    summaryEpisodes: Array.from({ length: 12 }, (_, i) => ({
      episodeNo: i + 1,
      summary: i === 0 ? '恶霸第一次当面施压，少年必须先忍。' : `第${i + 1}集摘要`
    })),
    facts: [],
    outlineBlocks: [],
    planningUnitEpisodes: 10
  },
  characters: [
    {
      name: '少年守钥人',
      biography: '',
      publicMask: '',
      hiddenPressure: '',
      fear: '怕少女被拖走',
      protectTarget: '小镇少女',
      conflictTrigger: '',
      advantage: '打得狠',
      weakness: '受旧规矩束缚',
      goal: '守住钥匙和人',
      arc: '从忍到亮底',
      roleLayer: 'core',
      activeBlockNos: []
    }
  ],
  activeCharacterBlocks: [
    {
      blockNo: 1,
      startEpisode: 1,
      endEpisode: 10,
      summary: '第1-10集',
      characterNames: ['少年守钥人', '恶霸', '小镇少女'],
      characters: []
    }
  ],
  detailedOutlineBlocks: [
    {
      blockNo: 1,
      startEpisode: 1,
      endEpisode: 10,
      summary: '第1-10集块',
      sections: [
        {
          sectionNo: 1,
          title: '第1-5集段',
          act: '升级',
          startEpisode: 1,
          endEpisode: 5,
          summary: '升级',
          hookType: '推进',
          episodeBeats: [
            {
              episodeNo: 1,
              summary: '恶霸当众施压',
              sceneByScene: [
                {
                  sceneNo: 1,
                  location: '镇口石桥',
                  timeOfDay: '日',
                  setup: '恶霸扯下少女护身符，当众逼少年交钥匙',
                  tension: '不交就当场拖走少女示众',
                  hookEnd: '手已经伸向少女的肩膀'
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  episodeBeats: [],
};

// We need to call the actual createScriptGenerationPrompt function
// But we can't easily import it. Let me just check the prompt content directly.
// Actually, let me just search for the rule in the prompt
console.log('\n=== Checking rule in prompt ===');
console.log('Rule:', rule);
console.log('Rule in prompt:', promptContent.includes(rule));

// Also check partial matches
for (const part of ['相邻两场', '推进手法', '必须变化']) {
  console.log(`"${part}" in prompt:`, promptContent.includes(part));
}

// Now let's also check if maybe the test is using a DIFFERENT version of the rule
// Let me search for the actual rule in the prompt
const actualRuleIdx = promptContent.indexOf('相邻两场换打法');
console.log('\nActual rule in prompt:', actualRuleIdx >= 0 ? 'FOUND' : 'NOT FOUND');
if (actualRuleIdx >= 0) {
  console.log('Context:', promptContent.substring(actualRuleIdx-20, actualRuleIdx+100));
}
