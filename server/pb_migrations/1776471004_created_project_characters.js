/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "8stp5k2m9xq4d7n",
    "created": "2026-04-18 02:10:04.000Z",
    "updated": "2026-04-18 02:10:04.000Z",
    "name": "project_characters",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "pchrusr1",
        "name": "user",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "_pb_users_auth_",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "pchrprj1",
        "name": "project",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "3opxj4f3n6d8q1a",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "pchrdrf1",
        "name": "characterDraftsJson",
        "type": "json",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 12582912
        }
      },
      {
        "system": false,
        "id": "pchract1",
        "name": "activeCharacterBlocksJson",
        "type": "json",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 6291456
        }
      },
      {
        "system": false,
        "id": "pchrver1",
        "name": "version",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 1,
          "max": null,
          "noDecimal": true
        }
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX idx_project_characters_project ON project_characters (project)",
      "CREATE INDEX idx_project_characters_user ON project_characters (user)"
    ],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("8stp5k2m9xq4d7n");

  return dao.deleteCollection(collection);
})
