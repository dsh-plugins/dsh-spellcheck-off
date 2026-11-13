import type { Context } from '@deepseek-ai/cordis'

export const name = 'dsh-spellcheck-off'

/** 本插件只操作 DOM，不依赖浏览器端 Cordis 服务。 */
export const inject: string[] = []

/**
 * 浏览器把没有 type 属性的 input 归一为 text，空串覆盖 type="" 的情况。
 * password、number、date、file 等类型不在其列，保持浏览器默认行为。
 */
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'email', ''])

/** 初始扫描与动态新增节点共用的候选选择器；contenteditable 元素还需复核自身属性。 */
const TEXT_ENTRY_SELECTOR = 'textarea, input, [contenteditable], [data-composer-input]'

export function apply(ctx: Context): void {
  ctx.effect(() => {
    // Element 到原始 spellcheck 属性值的映射，null 表示该元素原本没有此属性。
    const originals = new Map<Element, string | null>()

    function isTextEntry(el: Element): el is HTMLElement {
      if (!(el instanceof HTMLElement)) return false
      // 不用继承性的 isContentEditable：聊天框是常驻的 contenteditable 根，
      // 击键插入的每个段落都会继承为 true，那样会把大量内部节点写进表里。
      if (el.isContentEditable && el.contentEditable !== 'inherit') return true
      if (el instanceof HTMLTextAreaElement) return true
      if (el instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(el.type)
      return false
    }

    function disable(el: Element): void {
      if (originals.has(el)) return
      if (!isTextEntry(el)) return
      originals.set(el, el.getAttribute('spellcheck'))
      el.setAttribute('spellcheck', 'false')
    }

    function restore(el: Element): void {
      if (!originals.has(el)) return
      const original = originals.get(el) ?? null
      if (original === null) el.removeAttribute('spellcheck')
      else el.setAttribute('spellcheck', original)
      originals.delete(el)
    }

    /** 属性变化后重算单个元素：仍属文本输入则压制，已不属则还原。 */
    function refresh(el: Element): void {
      if (isTextEntry(el)) disable(el)
      else restore(el)
    }

    function scan(root: ParentNode): void {
      root.querySelectorAll(TEXT_ENTRY_SELECTOR).forEach(refresh)
    }

    scan(document)

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'attributes') {
          if (record.target instanceof Element) refresh(record.target)
          continue
        }
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue
          // 只处理节点自身；后代交给 scan，避免把整棵子树里每个元素都当作入口。
          if (node.matches(TEXT_ENTRY_SELECTOR)) refresh(node)
          scan(node)
        }
        // 移除的节点已脱离文档，恢复其属性没有意义，留在表里只会让 Map 随页面
        // 生命周期无界增长；重新插入时会经 addedNodes 再次压制。
        // 按包含关系清理：父节点被整段替换时，表里的后代未必命中选择器。
        for (const node of record.removedNodes) {
          if (!(node instanceof Element)) continue
          for (const tracked of originals.keys()) {
            if (tracked === node || node.contains(tracked)) originals.delete(tracked)
          }
        }
      }
    })

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      // type 翻转会让 input 进出文本输入白名单，需要一并重算。
      attributeFilter: ['contenteditable', 'type'],
    })

    return () => {
      observer.disconnect()
      for (const el of [...originals.keys()]) restore(el)
      originals.clear()
    }
  }, 'spellcheck-off:dom')
}
