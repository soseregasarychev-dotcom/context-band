import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Effort, Menu, Voice } from '../types'

const effort = atom({ plugin: 'context-band', key: 'effort' } as const, null)
const pickedModel = atom({ plugin: 'context-band', key: 'pickedModel' } as const, null)
const pickedEffort = atom({ plugin: 'context-band', key: 'pickedEffort' } as const, null)
const voice = atom({ plugin: 'context-band', key: 'voice' } as const, 'normal' as Voice)
const menu = atom({ plugin: 'context-band', key: 'menu' } as const, 'none' as Menu)
const tick = atom({ plugin: 'context-band', key: 'tick' } as const, 0)

// Модели, на которые можно переключиться кнопкой: подпись → id для запроса.
const MODELS: [string, string][] = [
  ['Opus', 'claude-opus-5-5'],
  ['Sonnet', 'claude-sonnet-5-5'],
  ['Haiku', 'claude-haiku-5-5'],
  ['Fable', 'claude-fable-5-1'],
]
const EFFORTS: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']

// Режимы ответа: подпись кнопки → скилл caveman. Скиллы лежат в ~/.agents/skills и
// не видны Claude как скиллы — включаются только отсюда, текстом в системном промпте.
const VOICES: [string, Voice][] = [
  ['Обычный', 'normal'],
  ['Caveman', 'caveman'],
]
const voiceLabel = (v: Voice) => VOICES.find(([, id]) => id === v)?.[0] ?? v

/** Текст скилла без шапки --- … ---; null — файла нет. */
async function voiceText($: EngineInterface, v: Voice): Promise<string | null> {
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME'))
  if (!home) return null
  try {
    const raw = await $.fs.read(`${home}/.agents/skills/${v}/SKILL.md`)
    // Шапку убираем; строку про /caveman ultra и wenyan — тоже: этих режимов в полосе нет.
    return raw
      .replace(/^---[\s\S]*?\n---\s*\n/, '')
      .split('\n')
      .filter(line => !/ultracave|megacave/.test(line))
      .join('\n')
      .trim()
  } catch {
    return null
  }
}

/** «claude-opus-5-5[1m]» → «Opus 5.5 (1M)»; незнакомое имя — как есть. */
function modelName(id: string): string {
  const m = id.match(/claude-([a-z]+)-(\d+)-(\d+)/i)
  const big = /\[1m\]/i.test(id) ? ' (1M)' : ''
  const [, family = '', major, minor] = m ?? []
  if (!m) return id + big
  return `${family.charAt(0).toUpperCase()}${family.slice(1)} ${major}.${minor}${big}`
}

const kTokens = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))

/** Полоска из 10 делений: ▰▰▰▱▱▱▱▱▱▱. */
const bar = (percent: number) => {
  const full = Math.max(0, Math.min(10, Math.round(percent / 10)))
  return '▰'.repeat(full) + '▱'.repeat(10 - full)
}

/** Полоса перечитывает цифры при изменении tick. */
function redraw($: EngineInterface) {
  return update($, tick, n => n + 1)
}

export const register: Register = on => {
  // Выбранные кнопками модель и усилия подставляются в каждый запрос основной сессии:
  // разговор тот же, меняется только, кто и как на него отвечает. Заодно запоминаем,
  // с какими усилиями ушёл запрос, — их и показывает полоса.
  // turn.step — потоковое событие: хук-генератор, поток ответа пропускаем дальше как есть.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined) return yield* next(e)
    const [model, level] = await Promise.all([read($, pickedModel), read($, pickedEffort)])
    const step = { ...e, ...(model ? { model } : {}), ...(level ? { effort: level } : {}) }
    const sent = step.effort === undefined ? 'нет' : String(step.effort)
    if ((await read($, effort)) !== sent) await update($, effort, () => sent)
    return yield* next(step)
  })

  // Выбранный режим caveman — отдельный раздел в конце системного промпта.
  // Выключить его можно только кнопкой в полосе: фразы «stop caveman» здесь не действуют.
  on('prompt.compose', async ($, e, next) => {
    const done = await next(e)
    const v = await read($, voice)
    if (v !== 'caveman') return done // режим из прежней версии мода (ultra/wenyan) считается обычным
    const text = await voiceText($, v)
    if (!text) return done
    const note =
      `# Режим ответа: ${v} (включён владельцем в полосе context-band)\n\n` +
      'Режим включает и выключает только владелец кнопкой «Режим» в полосе. ' +
      'Фразы «stop caveman» / «normal mode» и команды /caveman здесь не работают — если владелец просит выключить, ' +
      'подскажи нажать «Режим → Обычный». Отвечай на русском, как и раньше.\n\n'
    return { sections: [...done.sections, { id: 'context-band:voice', text: note + text, scope: 'session' as const }] }
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    await redraw($)
    return done
  })

  on('session.compact', async ($, e, next) => {
    const done = await next(e)
    await redraw($)
    return done
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    await read($, tick) // перерисовка после хода / сжатия
    const { Box, Button, Text } = $.ui.resolve(e)
    const [sessionModel, usage, lastEffort, model, level, open, mode] = await Promise.all([
      $.session.model(),
      $.session.usage(),
      read($, effort),
      read($, pickedModel),
      read($, pickedEffort),
      read($, menu),
      read($, voice),
    ])
    const current = model ?? sessionModel
    const { tokens, window, percent } = usage.context
    const pct = percent ?? 0
    const color = pct >= 85 ? 'error' : pct >= 60 ? 'warning' : 'success'

    // Команда ставится в очередь до конца ответа — не ждём её, иначе кнопка зависает.
    const run = (command: string) => async () => {
      await update($, menu, () => 'none')
      $.command.run({ command }).catch(err => $.ui.toast(`/${command}: ${(err as Error).message}`))
    }
    const toggle = (m: Menu) => () => update($, menu, cur => (cur === m ? 'none' : m))
    const pickModel = (id: string | null) => async () => {
      await update($, pickedModel, () => id)
      await update($, menu, () => 'none')
      $.ui.toast(`Модель со следующего запроса: ${modelName(id ?? sessionModel)}`)
    }
    const pickEffort = (lv: Effort | null) => async () => {
      await update($, pickedEffort, () => lv)
      await update($, menu, () => 'none')
      $.ui.toast(`Усилия со следующего запроса: ${lv ?? 'как в сессии'}`)
    }

    const pickVoice = (v: Voice) => async () => {
      await update($, menu, () => 'none')
      if (v !== 'normal' && !(await voiceText($, v))) {
        $.ui.toast(`Нет файла ~/.agents/skills/${v}/SKILL.md — поставь: npx skills add JuliusBrussee/caveman`)
        return
      }
      await update($, voice, () => v)
      $.ui.invalidate('prompt.section') // системный промпт соберётся заново к следующему запросу
      $.ui.toast(`Режим со следующего запроса: ${voiceLabel(v)}`)
    }

    return (
      <Box flexDirection="column">
        <Box>
          <Text dimColor>Контекст </Text>
          <Text color={color}>{bar(pct)}</Text>
          <Text dimColor>
            {' '}
            {percent === undefined ? '—' : `${pct}%`}
            {tokens !== undefined ? ` · ${kTokens(tokens)} / ${kTokens(window)}` : ''}
            {'   '}
          </Text>
          <Button key="model" label={`Модель ${modelName(current)}`} onPress={toggle('models')} />
          <Text> </Text>
          <Button key="effort" label={`Усилия ${level ?? lastEffort ?? '—'}`} onPress={toggle('efforts')} />
          <Text> </Text>
          <Button key="voice" label={`Режим ${voiceLabel(mode)}`} variant={mode === 'normal' ? undefined : 'primary'}
            onPress={toggle('voices')} />
          <Text> </Text>
          <Button key="compact" label="Сжать" dimColor onPress={run('compact')} />
          <Button key="clear" label="Сбросить" dimColor onPress={toggle('confirm-clear')} />
        </Box>
        {open === 'models' && (
          <Box>
            <Text dimColor>Модель (разговор сохранится): </Text>
            {MODELS.map(([label, id]) => (
              <Button key={`m-${label}`} label={label} variant={current.startsWith(id) ? 'primary' : undefined}
                onPress={pickModel(id)} />
            ))}
            {model && <Button key="m-reset" label="Как в сессии" dimColor onPress={pickModel(null)} />}
            <Button key="m-cancel" label="Отмена" dimColor onPress={toggle('models')} />
          </Box>
        )}
        {open === 'efforts' && (
          <Box>
            <Text dimColor>Усилия: </Text>
            {EFFORTS.map(lv => (
              <Button key={`e-${lv}`} label={lv} variant={(level ?? lastEffort) === lv ? 'primary' : undefined}
                onPress={pickEffort(lv)} />
            ))}
            {level && <Button key="e-reset" label="Как в сессии" dimColor onPress={pickEffort(null)} />}
            <Button key="e-cancel" label="Отмена" dimColor onPress={toggle('efforts')} />
          </Box>
        )}
        {open === 'voices' && (
          <Box>
            <Text dimColor>Режим ответа: </Text>
            {VOICES.map(([label, id]) => (
              <Button key={`v-${id}`} label={label} variant={mode === id ? 'primary' : undefined}
                onPress={pickVoice(id)} />
            ))}
            <Button key="v-cancel" label="Отмена" dimColor onPress={toggle('voices')} />
          </Box>
        )}
        {open === 'confirm-clear' && (
          <Box>
            <Text color="warning">Сбросить контекст? Разговор начнётся с чистого листа. </Text>
            <Button key="clear-yes" label="Да, сбросить" variant="primary" onPress={run('clear')} />
            <Button key="clear-no" label="Отмена" dimColor onPress={toggle('confirm-clear')} />
          </Box>
        )}
      </Box>
    )
  })
}
