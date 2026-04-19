/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "1wxs7p4r2yn6v9t",
    "created": "2026-04-18 02:10:06.000Z",
    "updated": "2026-04-18 02:10:06.000Z",
    "name": "project_scripts",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "pscrusr1",
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
        "id": "pscrprj1",
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
        "id": "pscrdrf1",
        "name": "scriptDraftJson",
        "type": "json",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 16777216
        }
      },
      {
        "system": false,
        "id": "pscrbrd1",
        "name": "scriptProgressBoardJson",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 4194304
        }
      },
      {
        "system": false,
        "id": "pscrfal1",
        "name": "scriptFailureResolutionJson",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 4194304
        }
      },
      {
        "system": false,
        "id": "pscrhis1",
        "name": "scriptRuntimeFailureHistoryJson",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 2097152
        }
      },
      {
        "system": false,
        "id": "pscrled1",
        "name": "scriptStateLedgerJson",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 16777216
        }
      },
      {
        "system": false,
        "id": "pscrver1",
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
      "CREATE UNIQUE INDEX idx_project_scripts_project ON project_scripts (project)",
      "CREATE INDEX idx_project_scripts_user ON project_scripts (user)"
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
  const collection = dao.findCollectionByNameOrId("1wxs7p4r2yn6v9t");

  return dao.deleteCollection(collection);
})
