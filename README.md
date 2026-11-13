# dsh-spellcheck-off

禁用 DSH Web 界面所有文本输入框的浏览器原生拼写检查，消除输入中文、代码、专有名词时出现的红色波浪下划线。

## 功能

| 对象 | 行为 |
| --- | --- |
| 聊天输入框（`[contenteditable]` 与 `[data-composer-input]`） | 设置 `spellcheck="false"` |
| `textarea` | 设置 `spellcheck="false"` |
| `input[type=text/search/url/email]` 及未声明 `type` 的 `input` | 设置 `spellcheck="false"` |
| `password`、`number`、`date`、`file` 等其余 `input` 类型 | 不处理，保持浏览器默认行为 |
| 运行中动态挂载的输入框 | `MutationObserver` 实时跟进 |

插件不注册界面插槽、不注入样式、不修改 `window` 全局；命中元素的原属性逐条记录，禁用插件时完整复原。

## 安装

从 GitHub 源安装（已提交构建产物，无需授权构建脚本）：

```bash
dsh plugin --profile web add github:dsh-plugins/dsh-spellcheck-off
```

也可以克隆后按本地目录安装：

```bash
git clone https://github.com/dsh-plugins/dsh-spellcheck-off
dsh plugin --profile web add ./dsh-spellcheck-off
```

或在 DSH Web 的「插件」管理页安装。

安装后刷新浏览器页面即可生效（客户端产物由 `/plugins/` 分发，不需要重启 DSH 进程）。

本地构建：

```bash
pnpm install
pnpm typecheck
pnpm build
```

## 作用范围

全站文档范围（`document`）内的文本输入元素，包括聊天输入框、设置面板输入框、搜索框、弹窗中的 `textarea`，以及插件或对话流后续插入的同类元素。作用仅限浏览器端，不涉及宿主进程与模型上下文。

## 验证方法

1. 打开 Web 界面，在 DevTools 的 Elements 面板选中聊天输入框，确认存在属性 `spellcheck="false"`。
2. 在输入框内键入拼写错误的英文单词（如 `recieve`），确认不再出现红色波浪线。
3. 切换会话、打开新面板或触发动态挂载的输入框，确认新元素同样带有 `spellcheck="false"`。
4. 于插件管理页禁用本插件并刷新页面，确认输入框的 `spellcheck` 属性恢复到安装前的状态（原本没有该属性的元素不再存在该属性），波浪线重新出现。
5. 在 DevTools 控制台查看 `window.__DSH_BOOT__.entries`，确认包含 `@dsh-plugin/dsh-spellcheck-off`；对应脚本请求返回 200 且响应正文为插件构建产物。

## 性能与生命周期

- 启用时执行一次 `querySelectorAll` 初始扫描；此后仅通过一个 `MutationObserver` 监听 `document.documentElement` 的 `childList` 与 `subtree`，属性变化只观察 `contenteditable` 与 `type`，不做轮询、不监听输入事件。
- `contenteditable` 判定用元素自身的 `contentEditable` 值而非继承性的 `isContentEditable`：聊天框是常驻的 `contenteditable` 根，若按继承判断，击键插入的每个段落都会被反复登记。
- 节点被移除时按包含关系清理登记表，父节点整段替换不会留下指向脱离文档节点的引用。
- 命中元素登记在 `Map` 中，已登记的元素不重复处理，避免同一元素被反复写入属性。
- 全部副作用注册在 `ctx.effect(..., 'spellcheck-off:dom')` 内：插件卸载或热重载时断开 `MutationObserver`，逐元素恢复原始 `spellcheck` 属性（原本不存在的移除该属性），随后清空记录表，不留全局残留。
- 插件不接管焦点、输入事件或剪贴板行为，与宿主其他输入增强插件互不干扰。

## 实现说明

- 宿主端入口 `src/index.ts` 仅导出 `name` 与空 `apply`，本插件没有宿主侧逻辑，也不需要注入 Cordis 服务。
- 浏览器端入口 `src/client/index.ts` 导出 `name`、`inject = []` 与 `apply(ctx)`，所有 DOM 操作都在 `ctx.effect` 的清理函数覆盖范围内。
- `tsdown.client.config.mjs` 将客户端源码打包为 CommonJS，并包裹进 `window.__ModuleLoader__.load({ id: "dsh-spellcheck-off", factory })`；产物内的变量均位于 factory 作用域，不污染页面全局。
