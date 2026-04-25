/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("3opxj4f3n6d8q1a");

  collection.schema.addField(new SchemaField({
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

  const field = collection.schema.getFieldByName("marketProfileJson");
  if (field) collection.schema.removeField(field.id);

  return dao.saveCollection(collection);
})
