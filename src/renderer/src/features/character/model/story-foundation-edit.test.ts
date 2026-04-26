import assert from 'node:assert/strict'
import test from 'node:test'
import type { StoryIntentPackageDto } from '../../../../../shared/contracts/intake.ts'
import type {
  CharacterRosterDto,
  WorldBibleDto
} from '../../../../../shared/contracts/world-building.ts'
import {
  mergeWorldBibleIntoStoryIntent,
  splitWorldBibleListInput
} from './story-foundation-edit.ts'

const roster: CharacterRosterDto = {
  totalEpisodes: 60,
  minimumRoleSlots: 30,
  standardRoleSlots: 39,
  actualRoleSlots: 31,
  entries: []
}

function baseIntent(): StoryIntentPackageDto {
  return {
    officialKeyCharacters: [],
    lockedCharacterNames: [],
    themeAnchors: [],
    worldAnchors: [],
    relationAnchors: [],
    dramaticMovement: [],
    characterRoster: roster,
    storyFoundation: {
      worldBible: {
        definition: '旧世界',
        worldType: '古装',
        eraAndSpace: '旧时代',
        socialOrder: '旧秩序',
        historicalWound: '旧伤口',
        powerOrRuleSystem: '旧规则',
        coreResources: [],
        taboosAndCosts: [],
        shootableLocations: [],
        source: 'derived_from_story_intent'
      },
      factionMatrix: null,
      characterRoster: roster
    }
  }
}

test('mergeWorldBibleIntoStoryIntent updates top-level and foundation world bible', () => {
  const nextWorldBible: WorldBibleDto = {
    definition: '新世界',
    worldType: '虚构朝代',
    eraAndSpace: '边城与皇都',
    socialOrder: '门阀压迫寒门',
    historicalWound: '旧案未平',
    powerOrRuleSystem: '血契',
    coreResources: ['盐铁'],
    taboosAndCosts: ['破契反噬'],
    shootableLocations: ['皇都', '边城'],
    source: 'ai_generated'
  }

  const result = mergeWorldBibleIntoStoryIntent(baseIntent(), nextWorldBible)

  assert.equal(result.worldBible?.definition, '新世界')
  assert.equal(result.worldBible?.source, 'user_confirmed')
  assert.equal(result.storyFoundation?.worldBible.definition, '新世界')
  assert.equal(result.storyFoundation?.characterRoster.minimumRoleSlots, 30)
})

test('splitWorldBibleListInput normalizes separators and duplicates', () => {
  assert.deepEqual(splitWorldBibleListInput('皇都、边城\n皇都；流沙河,龙宫'), [
    '皇都',
    '边城',
    '流沙河',
    '龙宫'
  ])
})
