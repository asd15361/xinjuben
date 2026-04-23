/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('project_scripts')
    if (!collection) return

    const jsonFields = [
      'scriptDraftJson',
      'scriptProgressBoardJson',
      'scriptFailureResolutionJson',
      'scriptRuntimeFailureHistoryJson',
      'scriptStateLedgerJson'
    ]

    for (const field of collection.schema.fields()) {
      if (jsonFields.includes(field.name) && field.type === 'text') {
        field.options.max = 100000
      }
    }

    return dao.saveCollection(collection)
  },
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('project_scripts')
    if (!collection) return

    const jsonFields = [
      'scriptDraftJson',
      'scriptProgressBoardJson',
      'scriptFailureResolutionJson',
      'scriptRuntimeFailureHistoryJson',
      'scriptStateLedgerJson'
    ]

    for (const field of collection.schema.fields()) {
      if (jsonFields.includes(field.name) && field.type === 'text') {
        field.options.max = 5000
      }
    }

    return dao.saveCollection(collection)
  }
)
