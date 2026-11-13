window.__ModuleLoader__.load({
	id: "@dsh-plugin/dsh-spellcheck-off",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		// src/client/index.ts
		const name = "@dsh-plugin/dsh-spellcheck-off";
		/** 本插件只操作 DOM，不依赖浏览器端 Cordis 服务。 */
		const inject = [];
		/**
		* 浏览器把没有 type 属性的 input 归一为 text，空串覆盖 type="" 的情况。
		* password、number、date、file 等类型不在其列，保持浏览器默认行为。
		*/
		const TEXT_INPUT_TYPES = /* @__PURE__ */ new Set([
			"text",
			"search",
			"url",
			"email",
			""
		]);
		/** 初始扫描与动态新增节点共用的候选选择器；contenteditable 元素还需复核自身属性。 */
		const TEXT_ENTRY_SELECTOR = "textarea, input, [contenteditable], [data-composer-input]";
		function apply(ctx) {
			ctx.effect(() => {
				const originals = /* @__PURE__ */ new Map();
				function isTextEntry(el) {
					if (!(el instanceof HTMLElement)) return false;
					if (el.isContentEditable && el.contentEditable !== "inherit") return true;
					if (el instanceof HTMLTextAreaElement) return true;
					if (el instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(el.type);
					return false;
				}
				function disable(el) {
					if (originals.has(el)) return;
					if (!isTextEntry(el)) return;
					originals.set(el, el.getAttribute("spellcheck"));
					el.setAttribute("spellcheck", "false");
				}
				function restore(el) {
					if (!originals.has(el)) return;
					const original = originals.get(el) ?? null;
					if (original === null) el.removeAttribute("spellcheck");
					else el.setAttribute("spellcheck", original);
					originals.delete(el);
				}
				/** 属性变化后重算单个元素：仍属文本输入则压制，已不属则还原。 */
				function refresh(el) {
					if (isTextEntry(el)) disable(el);
					else restore(el);
				}
				function scan(root) {
					root.querySelectorAll(TEXT_ENTRY_SELECTOR).forEach(refresh);
				}
				scan(document);
				const observer = new MutationObserver((records) => {
					for (const record of records) {
						if (record.type === "attributes") {
							if (record.target instanceof Element) refresh(record.target);
							continue;
						}
						for (const node of record.addedNodes) {
							if (!(node instanceof Element)) continue;
							if (node.matches(TEXT_ENTRY_SELECTOR)) refresh(node);
							scan(node);
						}
						for (const node of record.removedNodes) {
							if (!(node instanceof Element)) continue;
							for (const tracked of originals.keys()) if (tracked === node || node.contains(tracked)) originals.delete(tracked);
						}
					}
				});
				observer.observe(document.documentElement, {
					childList: true,
					subtree: true,
					attributes: true,
					attributeFilter: ["contenteditable", "type"]
				});
				return () => {
					observer.disconnect();
					for (const el of [...originals.keys()]) restore(el);
					originals.clear();
				};
			}, "spellcheck-off:dom");
		}
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
