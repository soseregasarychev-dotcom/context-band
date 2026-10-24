/** Что раскрыто под полосой: ничего, выбор модели, выбор усилий или подтверждение сброса. */
export type Menu = 'none' | 'models' | 'efforts' | 'voices' | 'confirm-clear'

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

/** Режим ответа: обычный или caveman (текст берётся из ~/.agents/skills/caveman/SKILL.md). */
export type Voice = 'normal' | 'caveman'

declare module 'claude-code' {
  interface PluginState {
    'context-band': {
      /** Усилия последнего запроса основной сессии к модели; null — запросов ещё не было. */
      effort: string | null
      /** Модель, выбранная кнопкой: подставляется в каждый запрос основной сессии; null — модель сессии. */
      pickedModel: string | null
      /** Усилия, выбранные кнопкой; null — настройка сессии. */
      pickedEffort: Effort | null
      /** Режим ответа на эту сессию; новая сессия начинается с 'normal'. */
      voice: Voice
      menu: Menu
      /** Растёт после хода, сжатия и команд — чтобы полоса перечитала цифры. */
      tick: number
    }
  }
}
