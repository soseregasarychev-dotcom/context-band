import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'context-band',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 4 },
} as const

function engine(on: Parameters<Parameters<typeof test>[1]>[1]) {
  on('ui.toast', () => ({ value: undefined }))
  on('session.model', () => ({ value: 'claude-opus-5-5[1m]' }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { tokens: 430_000, window: 1_000_000, percent: 43 }, rateLimits: [] },
  }))
}

test('полоса показывает контекст, модель и раскрывает меню', async ($, on) => {
  engine(on)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })

  expect((await ui.find({ type: 'Text', text: /▰/ }))?.text).toBe('▰▰▰▰▱▱▱▱▱▱')
  expect((await ui.find({ type: 'Text', text: /43%/ }))?.text).toContain('430k / 1000k')
  expect((await ui.find({ type: 'Button', key: 'model' }))?.props.label).toBe('Модель Opus 5.5 (1M)')

  await ui.press({ key: 'model' })
  expect(await ui.find({ type: 'Button', key: 'm-Sonnet' })).toBeTruthy()

  await ui.press({ key: 'clear' })
  expect(await ui.find({ type: 'Button', key: 'clear-yes' })).toBeTruthy()
  expect(await ui.find({ type: 'Button', key: 'm-Sonnet' })).toBeFalsy()
  await ui.unmount()
})

test('модель и усилия выбираются кнопками без команд', async ($, on) => {
  engine(on)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })

  await ui.press({ key: 'model' })
  await ui.press({ key: 'm-Sonnet' })
  expect((await ui.find({ type: 'Button', key: 'model' }))?.props.label).toBe('Модель Sonnet 5.5')

  await ui.press({ key: 'effort' })
  await ui.press({ key: 'e-high' })
  expect((await ui.find({ type: 'Button', key: 'effort' }))?.props.label).toBe('Усилия high')
  await ui.unmount()
})

test('режим caveman выбирается кнопкой и попадает в системный промпт', async ($, on) => {
  engine(on)
  on('env.get', () => ({ value: 'C:/Users/u' }))
  on('fs.read', () => ({ value: '---\nname: caveman\n---\n\n# caveman\n\nRespond terse.' }))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Button', key: 'voice' }))?.props.label).toBe('Режим Обычный')

  await ui.press({ key: 'voice' })
  await ui.press({ key: 'v-caveman' })
  expect((await ui.find({ type: 'Button', key: 'voice' }))?.props.label).toBe('Режим Caveman')
  await ui.unmount()
})
