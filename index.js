/**
 * hexo-tag-force-graph
 * 在 Hexo 博客中插入「文章-标签」3D 知识图谱，支持 Markdown 与任意布局页面
 * @see https://github.com/Krisnile/hexo-tag-force-graph
 */

'use strict';

/**
 * 根据站点文章与标签生成力导向图所需的数据（节点 + 边）
 * - 边1：文章 → 标签（文章与所属标签相连）
 * - 边2：标签 ↔ 标签（出现在同一篇文章中的标签两两相连）
 * @param {object} hexo - Hexo 实例（tag/helper 中的 this）
 * @returns {{ nodes: Array, links: Array }}
 */
function generateGraphData(hexo) {
  const posts = hexo.locals.get('posts').toArray();
  const nodes = [];
  const links = [];
  const nodeMap = new Map(); // 避免重复添加同名标签节点

  posts.forEach((post, idx) => {
    // 文章节点：每篇文章一个节点
    const postId = `p${idx}`;
    nodeMap.set(postId, true);
    nodes.push({
      id: postId,
      name: post.title || '无标题',
      type: 'post',
      url: post.path,
      val: 1
    });

    // 标签节点 + 文章-标签边
    if (post.tags && post.tags.length) {
      post.tags.forEach(tag => {
        const tagId = `t${tag.name}`;
        if (!nodeMap.has(tagId)) {
          nodeMap.set(tagId, true);
          // 标签下文章数量（兼容不同 Hexo 版本）
          const postCount = (tag.posts && typeof tag.posts.length === 'number')
            ? tag.posts.length
            : (typeof tag.length === 'number' ? tag.length : 1);
          nodes.push({
            id: tagId,
            name: tag.name,
            type: 'tag',
            url: `/tags/${tag.name}/`,
            val: Math.log(Math.max(1, postCount)) + 1
          });
        }
        links.push({ source: postId, target: tagId });
      });

      // 同一篇文章中的标签两两相连（按文章连接 tags）
      if (post.tags.length >= 2) {
        const tagIds = post.tags.map(t => `t${t.name}`);
        for (let i = 0; i < tagIds.length; i++) {
          for (let j = i + 1; j < tagIds.length; j++) {
            links.push({ source: tagIds[i], target: tagIds[j] });
          }
        }
      }
    }
  });

  return { nodes, links };
}

/** 从 _config.yml 的 forcegraph 段读取配置，未写则用默认值 */
function getConfig(hexo) {
  const cfg = (hexo && hexo.config && hexo.config.forcegraph) || {};
  return {
    height: (cfg.height && String(cfg.height).trim()) || '500px',
    backgroundColor: (cfg.backgroundColor && String(cfg.backgroundColor).trim()) || (cfg.bgColor && String(cfg.bgColor).trim()) || '#111'
  };
}

/**
 * 根据已生成的数据和配置，输出图谱容器的 HTML + 内联脚本（供标签与 helper 复用）
 * @param {object} graphData - { nodes, links }
 * @param {string} height - 容器高度，如 '500px'
 * @param {string} bgColor - 背景色，如 '#111'
 * @param {string} id - 容器 DOM id，需唯一
 * @returns {string} HTML 字符串
 */
function buildGraphHTML(graphData, height, bgColor, id) {
  return `
<div id="${id}" class="hexo-force-graph" style="width: 100%; height: ${height}; margin: 1rem 0; background: ${bgColor}; border-radius: 8px;"></div>
<script src="https://unpkg.com/3d-force-graph@1.70.13/dist/3d-force-graph.min.js"></script>
<script>
(function() {
  var container = document.getElementById('${id}');
  if (!container) return;
  var graphData = ${JSON.stringify(graphData)};
  try {
    var Graph = ForceGraph3D()(container)
      .graphData(graphData)
      .nodeLabel(function(node) { return node.name + (node.type === 'post' ? ' (文章)' : ' (标签)'); })
      .nodeColor(function(node) { return node.type === 'post' ? '#ff7f0e' : '#1f77b4'; })
      .nodeVal(function(node) { return node.type === 'post' ? 8 : 5; })
      .linkColor(function() { return 'rgba(255,255,255,0.2)'; })
      .linkWidth(1)
      .onNodeClick(function(node) { window.location.href = node.url; })
      .backgroundColor('${bgColor}')
      .enableNodeDrag(true)
      .enableNavigationControls(true);
    var ctrl = Graph.controls && Graph.controls();
    if (ctrl && typeof ctrl.autoRotate !== 'undefined') ctrl.autoRotate = false;
  } catch (e) {
    console.error('ForceGraph error:', e);
    container.innerHTML = '<p style="color:red;text-align:center;">图谱加载失败</p>';
  }
})();
</script>`;
}

// ========== 向 Hexo 注册 tag 与 helper（由 Hexo 调用时传入 hexo 实例） ==========
function register(hexo) {
  if (!hexo || !hexo.extend) return;

  hexo.extend.tag.register('forcegraph', function (args) {
    const cfg = getConfig(this);
    const height = (args[0] && String(args[0]).trim()) || cfg.height;
    const bgColor = (args[1] && String(args[1]).trim()) || cfg.backgroundColor;
    const id = 'fg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8);
    const graphData = generateGraphData(this);
    if (!graphData.nodes || graphData.nodes.length === 0) {
      return '<p style="text-align:center;color:#666;">暂无文章或标签，请先发布带标签的文章。</p>';
    }
    return buildGraphHTML(graphData, height, bgColor, id);
  }, { ends: false });

  hexo.extend.helper.register('forcegraph', function (height, bgColor) {
    const cfg = getConfig(this);
    height = (height && String(height).trim()) || cfg.height;
    bgColor = (bgColor && String(bgColor).trim()) || cfg.backgroundColor;
    const id = 'fg-layout-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8);
    const graphData = generateGraphData(this);
    if (!graphData.nodes || graphData.nodes.length === 0) {
      return '<!-- forcegraph: 暂无文章或标签 -->';
    }
    return buildGraphHTML(graphData, height, bgColor, id);
  });

  hexo.extend.helper.register('forcegraph_data', function () {
    return generateGraphData(this);
  });
}

// 标准入口：Hexo 会 require 后执行 module(hexo)，从而注册 helper
module.exports = function (hexo) {
  register(hexo);
};
module.exports.generateGraphData = generateGraphData;
module.exports.buildGraphHTML = buildGraphHTML;
module.exports.getConfig = getConfig;
