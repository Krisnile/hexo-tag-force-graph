# hexo-tag-force-graph

[![npm version](https://img.shields.io/npm/v/hexo-tag-force-graph)](https://www.npmjs.com/package/hexo-tag-force-graph)
[![license](https://img.shields.io/npm/l/hexo-tag-force-graph)](LICENSE)

Hexo 插件：在博客中插入「文章-标签」3D/2D 知识图谱（同一篇文章里的标签会两两相连），支持拖拽节点、旋转/缩放。即装即用。

---

## 功能与技术流程

- **数据来源**：从 Hexo 站点文章与标签生成图数据（节点 + 边）。节点为每篇文章与每个标签；边为「文章→标签」以及「同一篇文章内的标签两两相连」。
- **渲染**：服务端输出图谱容器的 HTML 与内联脚本，浏览器端加载 [3d-force-graph](https://github.com/vasturiano/3d-force-graph) 或 2D 版进行力导向渲染；支持点击节点跳转、拖拽、旋转/缩放。
- **三种使用方式**：
  1. **标签**：在 Markdown 中写 `{% forcegraph %}`，由插件在生成时替换为图谱 HTML。
  2. **Helper**：在主题 layout 中写 `<%- forcegraph() %>`，在指定页面插入图谱。
  3. **自动注入**：在 `_config.yml` 中开启 `inject` 并配置 `injectTo`，插件在 `generateBefore` 阶段为指定 layout 注册 injector，无需改主题模板即可在标签页、归档页等显示图谱；当仅注入到标签+归档且 `injectPosition: right` 时，以右侧固定 2D 小图形式展示（适配 Stellar 等主题）。

---

## 安装

```bash
npm install hexo-tag-force-graph --save
```

**主题侧需要粘贴的配置与示例文件** 已全部放在 npm 包内目录 **`examples/stellar/`**（安装后路径：`node_modules/hexo-tag-force-graph/examples/stellar/`），含可复制的 `tag_graph.ejs`、YAML / Stylus 片段与说明；根目录 **README** 与包内示例互为补充，发布 npm 后用户无需再查其它仓库。

若站点 `_config.yml` 中有 `plugins:` 列表，请加入本插件：

```yaml
plugins:
  - hexo-tag-force-graph
```

---

## 用法（用户使用流程）

### 1. 配置（可选）

在站点根目录 `_config.yml` 中可配置默认样式与自动注入行为：

```yaml
forcegraph:
  height: '500px'           # 图谱容器高度（标签/Helper 不传参时使用）
  backgroundColor: '#111'   # 背景色

  # 自动注入（不改主题 layout 即可在指定页面显示图谱）
  inject: true
  injectTo: ['tag', 'archive']   # 与主题 layout 名一致，如 tag/tags、archive/archives、default 等
  injectPosition: 'right'       # 可选。仅当 injectTo 为 tag+archive 时默认 right（右侧固定小图）
  injectRightHeight: '280px'     # 右侧图谱高度
  injectBottom: '370px'          # 右侧图谱距底距离（可与看板娘等错开）
```

- **与 Stellar 等主题配合**：  
  - 仅在**标签页、归档页**右侧显示小图：`injectTo: ['tag', 'archive']`，并保留或显式设置 `injectPosition: 'right'`；图谱会使用主题背景（如 `--body-bg`）。  
  - 在**全站底部**显示：`injectTo: ['default']`，不设或留空 `injectPosition`。  
- 模板中不传参数时使用上述配置；传参则优先用模板参数。

### 2. 三种使用方式

**方式 A：Markdown 中**（任意文章/页面）

```markdown
{% forcegraph %}
{% forcegraph 600px %}
{% forcegraph 500px #1a1a2e %}
```

**方式 B：布局中**（主题 `layout/*.ejs` 等，如标签页、首页）

```ejs
<%- forcegraph() %>
<%- forcegraph('600px', '#111') %>
```

**方式 C：自动注入**（不改 layout）  
在 `_config.yml` 中已配置 `inject: true` 和 `injectTo: ['tag']`（或 `['tag','archive']`、`['default']` 等）时，插件会在对应 layout 的页面自动注入图谱，无需在模板中写 `forcegraph`。若出现「forcegraph 未定义」，可直接采用方式 C。

参数：第 1 个为高度、第 2 个为背景色；不传则使用上面配置或默认值。

### 3. Stellar 侧栏：标签共现图谱（`tag_force_graph`）

与上文「文章–标签大图」不同，这是 **标签与标签共现** 的小图，适合挂在右侧栏。

**插件里自带的是什么？**

- **在 npm 包内**：`templates/tag_graph.ejs`、`templates/tag_graph_canvas.ejs`、`assets/tag-graph.styl`，以及注册好的 helper **`tag_force_graph`**（由 `index.js` 在加载时注册）。  
- **不在 npm 包内、也不会 `npm install` 时自动写入主题的**：`themes/stellar/layout/_partial/widgets/tag_graph.ejs`。

**为什么主题里还要有一个 `tag_graph.ejs`？**

Stellar 的 `widgets.yml` 里配置的 `layout: tag_graph` 表示：去 **`themes/<主题>/layout/_partial/widgets/tag_graph.ejs`** 找同名 partial。Hexo/Stellar **只会从主题目录解析这个路径**，不会自动到 `node_modules/hexo-tag-force-graph/` 里找同名文件，所以无法做到「只装包、零主题文件」而又沿用这套 widget 机制。

主题里的文件 **只需一行**，作用是把渲染交给插件模板，相当于固定「钩子」：

```ejs
<%- tag_force_graph({ item: item }) %>
```

对用户而言仍是 **「装包 + 写站点/主题配置」**：在主题里 **新建上述一个文件、粘贴一行** 即可，**不需要**把图谱的 HTML/JS 抄进主题；业务代码全部在插件包内。

**最小步骤汇总（Stellar）**

1. `npm install hexo-tag-force-graph --save`  
2. 打开包内 **`examples/stellar/`**，按其中 **`README.md`** 与各 `*.snippet` 文件操作（可复制 `tag_graph.ejs`、合并 YAML / Stylus）。站点 `forcegraph` 默认值见 **`examples/stellar/forcegraph.site.yml.snippet`**。  
3. 将 **`examples/stellar/tag_graph.ejs`** 复制到 **`themes/stellar/layout/_partial/widgets/tag_graph.ejs`**（或新建该文件，内容与示例一致，仅一行 helper）。  
4. 将 **`widgets.yml.snippet`** 合并进 **`themes/stellar/_data/widgets.yml`**；按 **`site_tree.yml.snippet`** 说明合并 **`site_tree`**。  
5. 将 **`stylus-import.snippet.styl`** 中的 `@import` 合并进主题 stylus 覆盖文件（相对路径按主题文件深度调整，示例以 `_custom-override.styl` 为参照）。

侧栏显示条件由包内 **`templates/tag_graph.ejs`** 与站点 **`forcegraph.injectTo`** 等共同决定，无需在主题中维护图谱业务代码。

### 4. 独立「知识图谱」页 + 侧边栏入口（如 Stellar）

1. 新建页面，例如 `source/graph/index.md`：

```markdown
---
title: 知识图谱
layout: page
---

{% forcegraph 600px %}
```

2. 在 Stellar 的 `source/_data/widgets.yml` 中增加 linklist 组件指向该页，并在主题 `_config.yml` 的 `site_tree` 中在对应页的 `leftbar`/`rightbar` 中加入该组件（详见 [Stellar 侧边栏组件文档](https://xaoxuu.com/wiki/stellar/widgets/)）。

---

## 图谱说明

- **节点**：每篇文章、每个标签各一个节点。
- **连线**：文章→标签；同一篇文章内的标签两两相连。
- **交互**：客户端渲染（CDN 加载 3d-force-graph），可拖拽节点、旋转/缩放、点击节点跳转。

---

## License

Apache-2.0
