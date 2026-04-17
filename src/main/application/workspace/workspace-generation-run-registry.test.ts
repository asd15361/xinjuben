import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import type { WebContents } from 'electron'

import {
  clearWorkspaceGenerationRunRegistry,
  runWorkspaceGenerationTask,
  throwIfWorkspaceGenerationAborted
} from './workspace-generation-run-registry.ts'

function createSenderStub(id: number): WebContents {
  const emitter = new EventEmitter() as EventEmitter & { id: number }
  emitter.id = id
  return emitter as WebContents
}

test('workspace generation run registry aborts active run when owner is destroyed', async () => {
  clearWorkspaceGenerationRunRegistry()
  const sender = createSenderStub(101)

  const pending = runWorkspaceGenerationTask({
    sender,
    projectId: 'project-1',
    task: 'confirm_story_intent',
    run: (signal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => {
            try {
              throwIfWorkspaceGenerationAborted(signal)
            } catch (error) {
              reject(error)
            }
          },
          { once: true }
        )
      })
  })

  sender.emit('destroyed')

  await assert.rejects(pending, /workspace_generation_aborted:owner_destroyed/)
})

test('workspace generation run registry aborts previous same-task run when replaced', async () => {
  clearWorkspaceGenerationRunRegistry()
  const sender = createSenderStub(202)

  const first = runWorkspaceGenerationTask({
    sender,
    projectId: 'project-2',
    task: 'confirm_story_intent',
    run: (signal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => {
            try {
              throwIfWorkspaceGenerationAborted(signal)
            } catch (error) {
              reject(error)
            }
          },
          { once: true }
        )
      })
  })

  const second = runWorkspaceGenerationTask({
    sender,
    projectId: 'project-2',
    task: 'confirm_story_intent',
    run: async () => 'ok'
  })

  await assert.rejects(first, /workspace_generation_aborted:replaced/)
  await assert.doesNotReject(second)
})
