export type DialogueAction =
  | { type: 'start_battle'; stageId: string; npcId?: string }
  | { type: 'set_flag'; key: string; value: boolean }
  | { type: 'close_dialogue' }

export interface DialogueChoice {
  id: string
  label: string
  nextNodeId?: string
  action?: DialogueAction
  requiresFlag?: string
  hideIfFlag?: string
}

export interface DialogueNode {
  id: string
  speakerId: string
  text: string
  nextNodeId?: string
  choices?: DialogueChoice[]
  action?: DialogueAction
  requiresFlag?: string
  hideIfFlag?: string
}

export interface DialogueDefinition {
  id: string
  nodes: Record<string, DialogueNode>
  startNodeId: string
}

export interface DialogueSession {
  dialogueId: string
  nodeId: string
}
