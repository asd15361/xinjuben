import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  getAudienceLanePolicy,
  getSubgenrePolicy,
  getSubgenrePolicyOrNull,
  getSubgenrePoliciesByLane,
  isSubgenreValidForLane,
  ALL_SUBGENRES,
  ALL_AUDIENCE_LANES
} from './short-drama-market-policy.ts'

describe('short-drama-market-policy', () => {
  describe('getAudienceLanePolicy', () => {
    it('returns male lane policy for male', () => {
      const policy = getAudienceLanePolicy('male')
      assert.strictEqual(policy.audienceLane, 'male')
      assert.ok(policy.coreLogic.includes('逆袭'))
      assert.ok(policy.universalRules.length > 0)
      assert.ok(policy.subgenres.includes('男频都市逆袭'))
    })

    it('returns female lane policy for female', () => {
      const policy = getAudienceLanePolicy('female')
      assert.strictEqual(policy.audienceLane, 'female')
      assert.ok(policy.coreLogic.includes('代入'))
      assert.ok(policy.universalRules.length > 0)
      assert.ok(policy.subgenres.includes('女频霸总甜宠'))
    })
  })

  describe('getSubgenrePolicy', () => {
    it('returns policy for all 6 subgenres', () => {
      const subgenres = [
        '男频都市逆袭',
        '男频玄幻修仙',
        '男频历史军政',
        '女频霸总甜宠',
        '女频古言宅斗',
        '女频现代逆袭'
      ] as const

      for (const subgenre of subgenres) {
        const policy = getSubgenrePolicy(subgenre)
        assert.strictEqual(policy.subgenre, subgenre)
        assert.ok(policy.coreAudience.length > 0)
        assert.ok(policy.emotionalPayoffs.length >= 3)
        assert.ok(policy.primaryConflictTypes.length >= 2)
        assert.ok(policy.protagonistDesign.startingPosition)
        assert.ok(policy.antagonistDesign.oppressionStyle)
        assert.ok(policy.relationshipModel.coreDynamic)
        assert.ok(policy.powerModel.progressionType)
        assert.ok(policy.commonPayoffBeats.length >= 3)
        assert.ok(policy.avoidRules.length >= 2)
        assert.ok(policy.recommendedEpisodeBeats.length >= 4)
      }
    })

    it('throws for unknown subgenre', () => {
      assert.throws(() => {
        // @ts-expect-error testing invalid input
        getSubgenrePolicy('未知垂类')
      }, /Unknown subgenre/)
    })
  })

  describe('getSubgenrePolicyOrNull', () => {
    it('returns null for unknown subgenre', () => {
      // @ts-expect-error testing invalid input
      const result = getSubgenrePolicyOrNull('不存在')
      assert.strictEqual(result, null)
    })

    it('returns policy for valid subgenre', () => {
      const result = getSubgenrePolicyOrNull('男频都市逆袭')
      assert.ok(result)
      assert.strictEqual(result!.subgenre, '男频都市逆袭')
    })
  })

  describe('getSubgenrePoliciesByLane', () => {
    it('returns 3 male subgenres', () => {
      const policies = getSubgenrePoliciesByLane('male')
      assert.strictEqual(policies.length, 3)
      for (const p of policies) {
        assert.strictEqual(p.audienceLane, 'male')
      }
    })

    it('returns 3 female subgenres', () => {
      const policies = getSubgenrePoliciesByLane('female')
      assert.strictEqual(policies.length, 3)
      for (const p of policies) {
        assert.strictEqual(p.audienceLane, 'female')
      }
    })
  })

  describe('isSubgenreValidForLane', () => {
    it('returns true for matching lane and subgenre', () => {
      assert.strictEqual(isSubgenreValidForLane('male', '男频都市逆袭'), true)
      assert.strictEqual(isSubgenreValidForLane('female', '女频霸总甜宠'), true)
    })

    it('returns false for mismatching lane and subgenre', () => {
      assert.strictEqual(isSubgenreValidForLane('male', '女频霸总甜宠'), false)
      assert.strictEqual(isSubgenreValidForLane('female', '男频都市逆袭'), false)
    })
  })

  describe('constants', () => {
    it('ALL_SUBGENRES has 6 entries', () => {
      assert.strictEqual(ALL_SUBGENRES.length, 6)
    })

    it('ALL_AUDIENCE_LANES has 2 entries', () => {
      assert.strictEqual(ALL_AUDIENCE_LANES.length, 2)
      assert.ok(ALL_AUDIENCE_LANES.includes('male'))
      assert.ok(ALL_AUDIENCE_LANES.includes('female'))
    })
  })

  describe('male subgenre specifics', () => {
    it('male_urban has counterattack focus', () => {
      const p = getSubgenrePolicy('男频都市逆袭')
      assert.ok(p.emotionalPayoffs.some((e) => e.includes('碾压') || e.includes('身份')))
      assert.ok(p.powerModel.progressionType.includes('升级'))
    })

    it('male_xianxia has cultivation focus', () => {
      const p = getSubgenrePolicy('男频玄幻修仙')
      assert.ok(p.emotionalPayoffs.some((e) => e.includes('境界') || e.includes('突破')))
      assert.ok(p.powerModel.powerSources.includes('境界突破'))
    })

    it('male_history has knowledge focus', () => {
      const p = getSubgenrePolicy('男频历史军政')
      assert.ok(p.emotionalPayoffs.some((e) => e.includes('知识') || e.includes('权谋')))
      assert.ok(p.protagonistDesign.hiddenStrength.includes('现代知识'))
    })
  })

  describe('female subgenre specifics', () => {
    it('female_ceo has romance focus', () => {
      const p = getSubgenrePolicy('女频霸总甜宠')
      assert.ok(p.emotionalPayoffs.some((e) => e.includes('甜') || e.includes('宠爱')))
      assert.ok(p.relationshipModel.coreDynamic.includes('双向'))
    })

    it('female_ancient has housefight focus', () => {
      const p = getSubgenrePolicy('女频古言宅斗')
      assert.ok(p.emotionalPayoffs.some((e) => e.includes('智计') || e.includes('权谋')))
      assert.ok(p.powerModel.progressionType.includes('智计'))
    })

    it('female_modern has comeback focus', () => {
      const p = getSubgenrePolicy('女频现代逆袭')
      assert.ok(p.emotionalPayoffs.some((e) => e.includes('逆袭') || e.includes('独立')))
      assert.ok(p.protagonistDesign.growthArc.includes('独立'))
    })
  })
})
