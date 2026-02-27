# hexo-tag-force-graph

[![npm version](https://img.shields.io/npm/v/hexo-tag-force-graph)](https://www.npmjs.com/package/hexo-tag-force-graph)
[![license](https://img.shields.io/npm/l/hexo-tag-force-graph)](LICENSE)

Hexo 插件：在博客中插入「文章-标签」3D 知识图谱（同一篇文章里的标签会两两相连），支持拖拽节点、鼠标旋转/缩放。即装即用。

## 安装

```bash
npm install hexo-tag-force-graph --save
```

若博客的 `_config.yml` 里有 `plugins:` 列表，需把本插件加进去：

```yaml
plugins:
  - hexo-tag-force-graph
```

图谱默认样式可在 `_config.yml` 中配置（可选）：

```yaml
forcegraph:
  height: '500px'        # 图谱容器高度
  backgroundColor: '#111' # 背景色
  # 若在 layout 中写 <%- forcegraph() %> 报错「forcegraph 未定义」，可改用注入方式（无需改 layout）：
  inject: true           # 是否自动注入图谱
  injectTo: ['default']  # 注入到哪些页：default=全部，或 tag/index/post 等（与主题 layout 名一致）
```

模板里不传参数时会使用上述配置；传参则优先用模板参数。

## 用法

**Markdown 中**（任意文章/页面）：

```markdown
{% forcegraph %}
{% forcegraph 600px %}
{% forcegraph 500px #1a1a2e %}
```

**布局中**（主题 `layout/*.ejs` 等任意空白处，如标签页、首页）：

```ejs
<%- forcegraph() %>
<%- forcegraph('600px', '#111') %>
```

**若报错「forcegraph 未定义」**：可不改 layout，在 `_config.yml` 中配置 `forcegraph.inject: true` 和 `forcegraph.injectTo: ['tag']`（或 `['tag','index']`），插件会在对应页面自动注入图谱。

参数：第 1 个为高度、第 2 个为背景色；不传则用 `_config.yml` 的 `forcegraph` 配置或默认值。

## 图谱说明

- **节点**：每篇文章、每个标签各一个节点。
- **连线**：文章→标签；同一篇文章里的标签两两相连。
- **交互**：客户端渲染（CDN 加载 [3d-force-graph](https://github.com/vasturiano/3d-force-graph)），可拖拽节点、鼠标旋转/缩放、点击节点跳转。

## 开发 / 测试

```bash
npm install
npm test
```

布局插入即插即用片段见 `test/sample/layout-snippets.ejs`，按注释复制到对应 layout 即可。

## 常见问题

- **报错「forcegraph 未定义」？** 两种做法：（1）在**博客根目录**执行 `npm install hexo-tag-force-graph --save`，且若 `_config.yml` 有 `plugins:` 需加入 `- hexo-tag-force-graph`；（2）或**不改 layout**，在 `_config.yml` 的 `forcegraph` 下设置 `inject: true` 和 `injectTo: ['tag']`（或 `['tag','index']`），由插件自动注入图谱。
- **不显示？** 按顺序排查：（1）用注入方式时，先试 `injectTo: ['default']` 看是否在任意页出现；（2）执行 `hexo clean && hexo g`；（3）确认文章 front matter 里有 `tags`，且至少有一篇已发布；（4）打开浏览器控制台看是否有报错或 CDN 加载失败。
- **自定义渲染？** 用 `<%- JSON.stringify(forcegraph_data()) %>` 取 `{ nodes, links }` 自行渲染。
- **Hexo 版本？** 支持 4 / 5 / 6（见 `peerDependencies`）。

## License

Apache-2.0
