/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "7rnk4d1f6qv8m2p",
    "created": "2026-04-18 02:10:03.000Z",
    "updated": "2026-04-18 02:10:03.000Z",
    "name": "project_outlines",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "polnusr1",
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
        "id": "polnprj1",
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
        "id": "polndrf1",
        "name": "outlineDraftJson",
        "type": "json",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 8388608
        }
      },
      {
        "system": false,
        "id": "polnver1",
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
      "CREATE UNIQUE INDEX idx_project_outlines_project ON project_outlines (project)",
      "CREATE INDEX idx_project_outlines_user ON project_outlines (user)"
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
  const collection = dao.findCollectionByNameOrId("7rnk4d1f6qv8m2p");

  return dao.deleteCollection(collection);
})
