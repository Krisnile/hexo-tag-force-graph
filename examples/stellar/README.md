# Stellar 主题：侧栏「标签共现」图谱接入说明

安装 `hexo-tag-force-graph` 后，本目录下的文件均可 **原样复制** 到博客/主题对应位置（路径以 Stellar 默认结构为例，若主题目录名不同请自行替换 `stellar`）。

| 本包内文件 | 复制到 |
|------------|--------|
| `tag_graph.ejs` | `themes/stellar/layout/_partial/widgets/tag_graph.ejs` |
| `widgets.yml.snippet` | 合并进 `themes/stellar/_data/widgets.yml`（见文件内注释） |
| `site_tree.yml.snippet` | 按需合并进 `themes/stellar/_config.yml` 的 `site_tree` |
| `forcegraph.site.yml.snippet` | 合并进站点根目录 `_config.yml` |
| `stylus-import.snippet.styl` | 合并进主题的 stylus 覆盖（如 `_custom-override.styl`） |

**一行命令示例**（在站点根目录执行，主题名为 `stellar` 时）：

```bash
mkdir -p themes/stellar/layout/_partial/widgets
cp node_modules/hexo-tag-force-graph/examples/stellar/tag_graph.ejs themes/stellar/layout/_partial/widgets/tag_graph.ejs
```

其余 YAML / Stylus 请打开对应 `.snippet` 文件，按注释粘贴到现有配置中。

插件逻辑与模板在包内 `templates/`、`assets/`，**无需**从本仓库以外寻找代码。
