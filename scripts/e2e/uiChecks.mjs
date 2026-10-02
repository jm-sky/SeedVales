/**
 * Automatic DOM checks for the application review (review--001). `runUiChecks(page, { mobile })` runs inside the
 * page against the open panel (`[data-testid=panel]`) and, on mobile, the touch HUD buttons.
 * Every hit lists a selector path and the text. These are evidence for the reviewer, not assertions.
 */

/** Characters allowed although they are not ASCII (typography, proper names). Extend rather than silence a check. */
export const NON_ENGLISH_WHITELIST = '—–…×·•’‘“”±°½¼¾→←✕✓✗▲▼►◄'

/**
 * @typedef {object} UiHit
 * @property {'text-overflow' | 'outside-viewport' | 'small-button' | 'no-close-control' | 'non-english'} check
 * @property {string} selector
 * @property {string} text
 * @property {string} [detail]
 */

/**
 * @param {import('playwright-core').Page} page
 * @param {{ mobile?: boolean, root?: string, whitelist?: string }} [opts]
 * @returns {Promise<UiHit[]>}
 */
export async function runUiChecks(page, { mobile = false, root = '[data-testid=panel]', whitelist = NON_ENGLISH_WHITELIST } = {}) {
  return page.evaluate(
    ({ mobile, root, whitelist }) => {
      const hits = []
      const vw = window.innerWidth
      const vh = window.innerHeight
      const pathOf = (el) => {
        const parts = []
        for (let e = el; e && e.nodeType === 1 && parts.length < 5; e = e.parentElement) {
          const tid = e.getAttribute('data-testid')
          if (tid) {
            parts.unshift(`[data-testid=${tid}]`)
            break
          }
          const cls = (e.getAttribute('class') ?? '').split(/\s+/).filter(Boolean).slice(0, 2).join('.')
          parts.unshift(e.tagName.toLowerCase() + (cls ? '.' + cls : ''))
        }
        return parts.join(' > ')
      }
      const visible = (el) => {
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'
      }
      const own = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).filter(Boolean).join(' ')
      const hit = (check, el, text, detail) => hits.push({ check, selector: pathOf(el), text: String(text).slice(0, 120), ...(detail ? { detail } : {}) })
      const panel = document.querySelector(root)
      const scrolls = (el) => {
        for (let p = el.parentElement; p; p = p.parentElement) if (['auto', 'scroll'].includes(getComputedStyle(p).overflowY) && p.scrollHeight > p.clientHeight) return true
        return false
      }

      if (panel) {
        if (!panel.querySelector('[data-testid=panel-close]')) hit('no-close-control', panel, panel.textContent?.trim() ?? '')
        const els = [...panel.querySelectorAll('*')].filter(visible)
        // Horizontal scrolling inside the panel (content wider than its box) is a layout problem on a phone.
        for (const el of [panel, ...els]) {
          const cs = getComputedStyle(el)
          if (['auto', 'scroll'].includes(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) hit('text-overflow', el, el.textContent?.trim() ?? '', `horizontal scroll: scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`)
          else if (['clip', 'hidden'].includes(cs.overflowY) && el.scrollHeight > el.clientHeight + 1 && el.clientHeight > 0 && own(el)) hit('text-overflow', el, own(el), `clipped vertically: scrollHeight ${el.scrollHeight} > clientHeight ${el.clientHeight}`)
        }
        for (const el of els) {
          const t = own(el)
          if (!t) continue
          const cs = getComputedStyle(el)
          if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && !['auto', 'scroll'].includes(cs.overflowX)) {
            hit('text-overflow', el, t, `scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}${cs.overflowX !== 'visible' ? ' (clipped)' : ''}`)
          }
          const bad = [...t].filter((c) => /\p{L}/u.test(c) && c.charCodeAt(0) > 127 && !whitelist.includes(c))
          if (bad.length) hit('non-english', el, t, `characters: ${[...new Set(bad)].join('')}`)
        }
        // Outside the viewport. Vertical overflow inside a scroll container is reachable by scrolling and is not reported.
        for (const el of [panel, ...els]) {
          const r = el.getBoundingClientRect()
          const outX = r.right > vw + 1 || r.left < -1
          const outY = r.bottom > vh + 1 || r.top < -1
          if (!outX && !(outY && !scrolls(el))) continue
          if (el !== panel && !own(el) && !['BUTTON', 'INPUT'].includes(el.tagName)) continue
          hit('outside-viewport', el, own(el) || el.getAttribute('aria-label') || el.tagName, `rect ${Math.round(r.left)},${Math.round(r.top)} to ${Math.round(r.right)},${Math.round(r.bottom)} vs viewport ${vw}x${vh}`)
        }
      }
      // Touch targets: buttons smaller than 32 px on mobile (inside the open panel, or the touch HUD when no panel is open).
      if (mobile) {
        const sel = panel ? 'button, [role=button], input, select' : '[data-testid^=touch-], [data-testid=minimap]'
        for (const b of [...(panel ?? document).querySelectorAll(sel)].filter(visible)) {
          const r = b.getBoundingClientRect()
          if (r.width < 32 || r.height < 32) hit('small-button', b, b.textContent?.trim() || b.getAttribute('aria-label') || b.getAttribute('data-testid') || b.tagName, `${Math.round(r.width)}x${Math.round(r.height)} px`)
        }
      }
      return hits
    },
    { mobile, root, whitelist },
  )
}
