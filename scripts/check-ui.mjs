import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

// Isolated browser data and mocked API: never changes the user's practice log.
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
const catalog = Array.from({ length: 18 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  title: i === 0 ? 'Nocturne in E-flat Major, Op. 9 No. 2' : `Prelude ${i} with a long descriptive title`,
  composer: i % 2 ? 'Claude Debussy' : 'Frédéric Chopin', difficulty: 'Intermediate',
}))
const repertoire = catalog.slice(0, 4).map(p => ({
  ...p, level: p.difficulty, progress: 42, tone: 'lavender', symbol: 'N',
}))
const monday = new Date()
monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
monday.setHours(12, 0, 0, 0)
const sessions = Array.from({ length: 7 }, (_, i) => {
  const date = new Date(monday)
  date.setDate(date.getDate() + i)
  return { id: String(i), durationSeconds: (i + 1) * 7200, startedAt: date.toISOString(), piece: null }
})
let failSave = false
const saves = []
await page.route('http://localhost:3001/**', async route => {
  const url = new URL(route.request().url())
  let body = url.pathname === '/pieces' ? catalog : url.pathname === '/milestones' ? [] : sessions
  if (route.request().method() === 'POST') {
    const input = route.request().postDataJSON()
    saves.push(input)
    if (failSave) return route.fulfill({ status: 503, json: { message: 'Unavailable' } })
    body = { ...input, id: 'saved', startedAt: new Date().toISOString(), piece: null }
  }
  await route.fulfill({ json: body })
})
await page.addInitScript(({ repertoire }) => {
  localStorage.setItem('piano-companion-user', JSON.stringify({ id: 'test', name: 'UI Review', level: 'Intermediate' }))
  localStorage.setItem('piano-companion-repertoire-version', '2')
  localStorage.setItem('piano-companion-repertoire', JSON.stringify(repertoire))
}, { repertoire })
await mkdir('BugEvidence/fixed', { recursive: true })
const nav = name => page.locator('nav:visible').getByRole('button', { name, exact: true })
async function contained() {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page overflows viewport')
}
try {
  await page.goto('http://localhost:5173')
  await page.locator('.piece-row').first().waitFor()
  await page.locator('.piece-row').first().click()
  assert.equal(await page.locator('.piece-meta strong').textContent(), '42%', 'Catalogue refresh overwrote saved progress')
  for (const width of [1440, 1024, 768, 681, 680, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await contained()
    assert(await page.locator('.bar').evaluateAll(bars => bars.every(bar => {
      const b = bar.getBoundingClientRect(), t = bar.parentElement.getBoundingClientRect()
      return b.top >= t.top - 1 && b.bottom <= t.bottom + 1
    })), 'Chart bars escape tracks')
    assert.equal(await page.locator('.piece-row').count(), 4)
    if ([1440, 390].includes(width)) await page.screenshot({ path: `BugEvidence/fixed/today-${width}.png`, fullPage: true })
    await nav('Repertoire').click()
    await contained()
    await page.getByRole('button', { name: '+ Add a piece', exact: true }).click()
    await page.getByRole('dialog').waitFor()
    assert(await page.getByRole('dialog').evaluate(el => {
      const r = el.getBoundingClientRect()
      return r.left >= 0 && r.right <= innerWidth && el.scrollWidth <= el.clientWidth
    }), 'Dialog overflows viewport')
    const search = page.getByRole('textbox', { name: 'Search by title or composer' })
    await search.fill('  CHOPIN  ')
    assert.equal(await page.locator('.catalog-result').count(), 9)
    await search.fill('frederic')
    assert.equal(await page.locator('.catalog-result').count(), 9)
    await search.fill('Nocturne')
    assert.equal(await page.locator('.catalog-result').count(), 1)
    await search.fill('')
    await page.locator('.catalog-result').last().scrollIntoViewIfNeeded()
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab')
      assert(await page.getByRole('dialog').evaluate(el => el.contains(document.activeElement)), 'Focus escaped dialog')
    }
    if (width === 390) await page.screenshot({ path: 'BugEvidence/fixed/catalog-390.png' })
    await page.keyboard.press('Escape')
    assert(await page.getByRole('button', { name: '+ Add a piece', exact: true }).evaluate(el => el === document.activeElement))
    await nav('Today').click()
  }
  await nav('Repertoire').click()
  await page.getByRole('button', { name: `Remove ${catalog[0].title}`, exact: true }).click()
  await nav('Today').click()
  assert.equal(await page.getByText('Choose a piece to begin').count(), 1)
  await page.locator('.piece-row').first().click()
  await page.getByRole('button', { name: 'Practice now' }).click()
  await page.waitForTimeout(1100)
  await page.locator('.piece-row').last().click()
  failSave = true
  await page.getByRole('button', { name: 'Finish & save' }).click()
  await page.getByRole('alert').waitFor()
  assert.equal(saves.at(-1).pieceId, catalog[1].id, 'Session changed piece after starting')
  failSave = false
  await page.getByRole('button', { name: 'Finish & save' }).click()
  await page.locator('.active-session').waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: 'Practice now' }).click()
  assert.equal(await page.getByRole('timer').textContent(), '00:00')
  await page.getByRole('button', { name: 'Finish & save' }).click()
  assert.deepEqual(errors, [])
  console.log('PASS: 7 viewport sizes, chart bounds, catalogue search/scroll, keyboard modal, focus removal, session identity/retry/reset.')
} finally { await browser.close() }
