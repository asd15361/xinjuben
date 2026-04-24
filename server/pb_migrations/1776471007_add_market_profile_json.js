/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("3opxj4f3n6d8q1a");

  collection.schema.push(new SchemaField({
    "system": false,
    "id": "prjmrk01",
    "name": "marketProfileJson",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1048576
    }
  }));

  return dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("3opxj4f3n6d8q1a");

  const idx = collection.schema.findIndex(f => f.name === "marketProfileJson");
  if (idx >= 0) {
    collection.schema.splice(idx, 1);
  }

  return dao.saveCollection(collection);
})
