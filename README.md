# dsh-spellcheck-off

浏览器原生拼写检查只认拉丁字母词典。在 DSH Web 界面里混输中文、代码标识符与专有名词时，大量词条会被判成拼写错误并标上红色波浪线。这个插件给页面内的文本输入元素统一设上 `spellcheck="false"`，直接关掉这套检查。

## 功能

| 对象 | 行为 |
| --- | --- |
| 聊天输入框（`[contenteditable]`、`[data-composer-input]`） | 设置 `spellcheck="false"` |
| `textarea` | 设置 `spellcheck="false"` |
| `input[type=text/search/url/email]` 及未声明 `type` 的 `input` | 设置 `spellcheck="false"` |
| `password`、`number`、`date`、`file` 等其余 `input` 类型 | 不处理，保持浏览器默认行为 |
| 运行中动态挂载的输入框 | `MutationObserver` 实时跟进 |

选择器只用来缩小候选范围，元素能否命中还要看它自身的性质：`[contenteditable]` 与 `[data-composer-input]` 这两个选择器命中的元素，必须自身可编辑、或是 `textarea`、或是白名单类型的 `input`。仅仅带 `data-composer-input` 属性的普通容器不会被处理。

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

安装后刷新浏览器页面即可生效。客户端产物由 `/plugins/` 分发，不需要重启 DSH 进程。

本地构建：

```bash
pnpm install
pnpm typecheck   # 源码类型检查
pnpm build       # 输出 lib/
```

没有单元测试：全部行为都依赖真实 DOM，靠上面的「验证方法」手工覆盖。

## 使用

### 作用范围

覆盖全站文档范围（`document`）内的文本输入元素。这包括聊天输入框、设置面板输入框、搜索框、弹窗中的 `textarea`，以及其它插件或对话流后续动态插入的同类元素。所有改动仅作用于浏览器端 DOM，不涉及 DSH 宿主进程，也不会影响发送给模型的上下文。

### 验证方法

1. 打开 Web 界面，在 DevTools 的 Elements 面板选中聊天输入框，确认元素上存在属性 `spellcheck="false"`。
2. 在输入框内键入拼写错误的英文单词（如 `recieve`），确认下方不再出现红色波浪线。
3. 切换会话、打开新面板或触发动态挂载的输入框，确认新挂载的元素同样带有 `spellcheck="false"`。
4. 在插件管理页禁用该插件并刷新页面，确认输入框的 `spellcheck` 属性恢复到安装前的状态（原本没有该属性的元素会移除该属性），红色波浪线重新出现。
5. 在 DevTools 控制台查看 `window.__DSH_BOOT__.entries`，确认其中包含 `@dsh-plugin/dsh-spellcheck-off`；同时网络面板中对应的脚本请求返回 200，响应正文为插件构建产物。

## 行为与边界

- 不注册界面插槽，不注入额外样式，也不修改 `window` 全局对象。
- 不接管焦点、输入事件或剪贴板行为，不监听键入事件，也不做定时轮询，与宿主其它输入增强插件互不干扰。
- 命中元素的原始 `spellcheck` 属性会逐条记录。禁用或卸载插件时按记录完整复原，不留页面状态残留。

## 实现说明

- **初始扫描与增量监听**：启用时先执行一次 `querySelectorAll` 初始扫描。此后仅通过单个 `MutationObserver` 监听 `document.documentElement` 的 `childList` 与 `subtree`；属性变化只观察 `contenteditable` 与 `type`。
- **可编辑区域判定**：先用 `isContentEditable` 确认元素处在可编辑区域内，再用元素自身的 `contentEditable !== 'inherit'` 排除只是继承来的内部节点。聊天框是常驻的 `contenteditable` 根，击键插入的每个段落都继承为可编辑；只看 `isContentEditable` 会把它们逐个登记进表里。
- **节点去重与回收**：命中元素登记在 `Map` 中，已登记元素不重复写入属性。当节点从文档移除时，按包含关系清理登记表；即使父节点被整段替换，表内也不会残留指向脱离文档节点的引用。
- **副作用生命周期**：全部 DOM 副作用均注册在 `ctx.effect(..., 'spellcheck-off:dom')` 内。插件卸载或热重载时先断开 `MutationObserver`，再逐个元素恢复原始 `spellcheck` 属性（原本不存在该属性的直接移除），最后清空记录表。
- **宿主与客户端入口**：宿主端入口 `src/index.ts` 仅导出 `name` 与空 `apply`，无宿主侧逻辑，也不注入 Cordis 服务。浏览器端入口 `src/client/index.ts` 导出 `name`、`inject = []` 与 `apply(ctx)`，全部 DOM 操作都包含在 `ctx.effect` 的清理函数覆盖范围内。
- **构建产物封装**：`tsdown.client.config.mjs` 把客户端源码打包成 CommonJS，再包裹进 `window.__ModuleLoader__.load({ id: "@dsh-plugin/dsh-spellcheck-off", factory })`。产物内的变量都落在 `factory` 作用域里，不污染页面全局。

## 开发

```bash
pnpm install
pnpm typecheck   # 源码类型检查
pnpm build       # 输出 lib/
```

没有单元测试：全部行为都依赖真实 DOM，靠上面的「验证方法」手工覆盖。
