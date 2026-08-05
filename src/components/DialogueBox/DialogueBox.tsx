import type { DialogueChoice } from '../../game/dialogue/types'
import type { NpcDefinition } from '../../game/npc/types'
import { publicUrl } from '../../lib/publicUrl'
import styles from './DialogueBox.module.css'

interface DialogueBoxProps {
  speaker: NpcDefinition | null
  text: string
  choices: DialogueChoice[]
  onAdvance: () => void
  onChoice: (choiceId: string) => void
}

export function DialogueBox({ speaker, text, choices, onAdvance, onChoice }: DialogueBoxProps) {
  return (
    <div className={styles.box} role="dialog" aria-label="บทสนทนา">
      <div className={styles.panel}>
        <img
          className={styles.portrait}
          src={speaker?.spriteUrl ?? publicUrl('characters/monkey-v2-idle-0.png')}
          alt=""
          draggable={false}
        />
        <div className={styles.content}>
          <p className={styles.speaker}>{speaker?.name ?? '???'}</p>
          <p className={styles.text} onClick={choices.length === 0 ? onAdvance : undefined}>
            {text}
          </p>
          <div className={styles.actions}>
            {choices.length > 0 ? (
              choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className={styles.choiceBtn}
                  data-fight={choice.label === 'ต่อสู้'}
                  onClick={() => onChoice(choice.id)}
                >
                  {choice.label}
                </button>
              ))
            ) : (
              <button type="button" className={styles.nextBtn} onClick={onAdvance}>
                ถัดไป
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
