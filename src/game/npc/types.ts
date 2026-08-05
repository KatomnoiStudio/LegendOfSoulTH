export interface NpcDefinition {
  id: string
  name: string
  spriteUrl: string
  mapId: string
  position: { x: number; y: number }
  dialogueId: string
  interactionRadius: number
  battleStageId?: string
}
