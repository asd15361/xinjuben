/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    id: 'mpbks9f3n6d8q1a',
    created: '2026-04-25 00:00:00.000Z',
    updated: '2026-04-25 00:00:00.000Z',
    name: 'xinjuben_market_playbooks',
    type: 'base',
    system: false,
    fields: [
      {
        system: false,
        id: 'mpbusr01',
        name: 'user',
        type: 'relation',
        required: true,
        presentable: false,
        unique: false,
        collectionId: '_pb_users_auth_',
        cascadeDelete: true,
        minSelect: 0,
        maxSelect: 1
      },
      {
        system: false,
        id: 'mpbid001',
        name: 'playbookId',
        type: 'text',
        required: true,
        presentable: true,
        unique: false,
        min: 1,
        max: 200,
        pattern: ''
      },
      {
        system: false,
        id: 'mpbnam01',
        name: 'name',
        type: 'text',
        required: true,
        presentable: true,
        unique: false,
        min: 1,
        max: 200,
        pattern: ''
      },
      {
        system: false,
        id: 'mpblan01',
        name: 'audienceLane',
        type: 'select',
        required: true,
        presentable: true,
        unique: false,
        maxSelect: 1,
        values: ['male', 'female']
      },
      {
        system: false,
        id: 'mpbsub01',
        name: 'subgenre',
        type: 'text',
        required: true,
        presentable: true,
        unique: false,
        min: 1,
        max: 100,
        pattern: ''
      },
      {
        system: false,
        id: 'mpbmon01',
        name: 'sourceMonth',
        type: 'text',
        required: true,
        presentable: true,
        unique: false,
        min: 7,
        max: 7,
        pattern: '^\\d{4}-\\d{2}$'
      },
      {
        system: false,
        id: 'mpbver01',
        name: 'version',
        type: 'text',
        required: true,
        presentable: true,
        unique: false,
        min: 1,
        max: 50,
        pattern: ''
      },
      {
        system: false,
        id: 'mpbsts01',
        name: 'status',
        type: 'select',
        required: true,
        presentable: true,
        unique: false,
        maxSelect: 1,
        values: ['active', 'archived']
      },
      {
        system: false,
        id: 'mpbjson1',
        name: 'playbookJson',
        type: 'json',
        required: true,
        presentable: false,
        unique: false,
        maxSize: 1048576
      }
    ],
    indexes: [
      'CREATE INDEX idx_xinjuben_market_playbooks_user_status ON xinjuben_market_playbooks (user, status)',
      'CREATE UNIQUE INDEX idx_xinjuben_market_playbooks_user_playbook ON xinjuben_market_playbooks (user, playbookId)'
    ],
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null
  })

  const dao = new Dao(db)
  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId('mpbks9f3n6d8q1a')
  return dao.deleteCollection(collection)
})
