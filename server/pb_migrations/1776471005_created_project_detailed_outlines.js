/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "9uvr6n3q1wp5k8s",
    "created": "2026-04-18 02:10:05.000Z",
    "updated": "2026-04-18 02:10:05.000Z",
    "name": "project_detailed_outlines",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "pdolusr1",
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
        "id": "pdolprj1",
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
        "id": "pdolblk1",
        "name": "detailedOutlineBlocksJson",
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
        "id": "pdolseg1",
        "name": "detailedOutlineSegmentsJson",
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
        "id": "pdolver1",
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
      "CREATE UNIQUE INDEX idx_project_detailed_outlines_project ON project_detailed_outlines (project)",
      "CREATE INDEX idx_project_detailed_outlines_user ON project_detailed_outlines (user)"
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
  const collection = dao.findCollectionByNameOrId("9uvr6n3q1wp5k8s");

  return dao.deleteCollection(collection);
})
