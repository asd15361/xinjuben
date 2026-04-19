/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId('8stp5k2m9xq4d7n')

  collection.schema.addField(
    new SchemaField({
      system: false,
      id: 'pchract1',
      name: 'activeCharacterBlocksJson',
      type: 'json',
      required: false,
      presentable: false,
      unique: false,
      options: {
        maxSize: 6291456
      }
    })
  )

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId('8stp5k2m9xq4d7n')

  collection.schema.addField(
    new SchemaField({
      system: false,
      id: 'pchract1',
      name: 'activeCharacterBlocksJson',
      type: 'json',
      required: true,
      presentable: false,
      unique: false,
      options: {
        maxSize: 6291456
      }
    })
  )

  return dao.saveCollection(collection)
})
