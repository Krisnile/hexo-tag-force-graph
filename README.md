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

### 3. 独立「知识图谱」页 + 侧边栏入口（如 Stellar）

1. 新建页面，例如 `source/graph/index.md`：

```markdown
---
title: 知识图谱
layout: page
---

{% forcegraph 600px %}
```

2. 在 Stellar 的 `source/_data/widgets.yml` 中增加 linklist 组件指向该页，并在 `_config.stellar.yml` 的 `site_tree` 中在对应页的 `leftbar`/`rightbar` 中加入该组件（详见 [Stellar 侧边栏组件文档](https://xaoxuu.com/wiki/stellar/widgets/)）。

---

## 图谱说明

- **节点**：每篇文章、每个标签各一个节点。
- **连线**：文章→标签；同一篇文章内的标签两两相连。
- **交互**：客户端渲染（CDN 加载 3d-force-graph），可拖拽节点、旋转/缩放、点击节点跳转。

---

## License

Apache-2.0
