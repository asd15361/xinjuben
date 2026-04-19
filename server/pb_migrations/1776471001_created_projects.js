/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "3opxj4f3n6d8q1a",
    "created": "2026-04-18 02:10:01.000Z",
    "updated": "2026-04-18 02:10:01.000Z",
    "name": "projects",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "prjusr01",
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
        "id": "prjnam01",
        "name": "name",
        "type": "text",
        "required": true,
        "presentable": true,
        "unique": false,
        "options": {
          "min": 1,
          "max": 200,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "prjwrk01",
        "name": "workflowType",
        "type": "select",
        "required": true,
        "presentable": true,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "ai_write",
            "novel_adapt"
          ]
        }
      },
      {
        "system": false,
        "id": "prjstg01",
        "name": "stage",
        "type": "select",
        "required": true,
        "presentable": true,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "chat",
            "seven_questions",
            "outline",
            "character",
            "detailed_outline",
            "script"
          ]
        }
      },
      {
        "system": false,
        "id": "prjgen01",
        "name": "genre",
        "type": "text",
        "required": false,
        "presentable": true,
        "unique": false,
        "options": {
          "min": null,
          "max": 200,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "prjgss1",
        "name": "generationStatusJson",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 1048576
        }
      },
      {
        "system": false,
        "id": "prjsty01",
        "name": "storyIntentJson",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 1048576
        }
      },
      {
        "system": false,
        "id": "prjent01",
        "name": "entityStoreJson",
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
        "id": "prjvis01",
        "name": "visibleResultJson",
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
        "id": "prjfrm01",
        "name": "formalReleaseJson",
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
        "id": "prjver01",
        "name": "projectVersion",
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
      "CREATE INDEX idx_projects_user_updated ON projects (user, updated)",
      "CREATE INDEX idx_projects_stage ON projects (stage)"
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
  const collection = dao.findCollectionByNameOrId("3opxj4f3n6d8q1a");

  return dao.deleteCollection(collection);
})
