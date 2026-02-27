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
  // inject 配置：是否启用自动注入
  const inject = cfg.inject === true || cfg.inject === 'true';
  // injectTo 可以是一个布局字符串或数组，如 'tag' 或 ['tag', 'post']
  let injectTo = cfg.injectTo != null ? cfg.injectTo : [];
  if (!Array.isArray(injectTo)) injectTo = injectTo ? [injectTo] : [];
  return {
    height: (cfg.height && String(cfg.height).trim()) || '500px',
    backgroundColor: (cfg.backgroundColor && String(cfg.backgroundColor).trim()) || (cfg.bgColor && String(cfg.bgColor).trim()) || '#111',
    inject,
    injectTo
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
  if (typeof ForceGraph3D === 'undefined') {
    container.innerHTML = '<p style="color:#999;text-align:center;">3D 图谱脚本加载失败，请检查网络或稍后重试</p>';
    return;
  }
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

  // 注册标签：{% forcegraph %}
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

  // 注册 Helper：<%- forcegraph() %>
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

  // 注册 Helper：获取原始数据 <%- forcegraph_data() %>
  hexo.extend.helper.register('forcegraph_data', function () {
    return generateGraphData(this);
  });

  // ========== 通过 Injector 自动注入图谱（核心改进） ==========
  if (hexo.extend.injector) {
    const cfg = getConfig(hexo);
    // 只有当 inject 为 true 且指定了 injectTo 时才启用自动注入
    if (cfg.inject && cfg.injectTo && cfg.injectTo.length > 0) {
      // 生成注入内容（复用 buildGraphHTML）
      const injectFn = function () {
        const c = getConfig(hexo);
        const graphData = generateGraphData(hexo);
        // 无数据时返回空（或可返回提示，但为避免空占位，建议返回空字符串）
        if (!graphData.nodes || graphData.nodes.length === 0) {
          return ''; // 或者返回 '<!-- no graph data -->'
        }
        const id = 'fg-inject-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8);
        // 为了视觉效果更好，在外面包一层容器
        return `<div class="hexo-force-graph-wrapper" style="margin: 2rem auto; max-width: 800px; padding: 0 1rem;">
  <h3 style="margin-bottom: 0.5rem; font-size: 1.2rem;">📊 知识图谱</h3>
  ${buildGraphHTML(graphData, c.height, c.backgroundColor, id)}
</div>`;
      };

      // 为每个指定的布局注册 injector
      cfg.injectTo.forEach(function (to) {
        const layout = String(to).trim();
        if (layout) {
          // 注册到 body 结束前
          hexo.extend.injector.register('body_end', injectFn, layout);
          hexo.log.debug(`[forcegraph] 已为布局 "${layout}" 注册自动注入`);
        }
      });
      hexo.log.info(`[forcegraph] 自动注入已启用，目标布局: ${cfg.injectTo.join(', ')}`);
    }
  } else {
    hexo.log.warn('[forcegraph] 当前 Hexo 版本不支持 injector，自动注入功能不可用');
  }
}

// 标准入口：Hexo 的 loadPlugin 会读取本文件并用 (exports, require, module, __filename, __dirname, hexo) 包装执行，
// 不会调用导出的函数，因此需在脚本执行时若 hexo 已注入则立即注册
module.exports = function (hexo) {
  register(hexo);
};
// Hexo 的 loadPlugin 执行本文件时 hexo 作为包装函数的第 6 个参数在作用域内，在此直接注册。
// 仅当具备完整 Hexo 实例特征（extend + log）时才调用，避免在测试或普通 require 时误用不完整 mock
if (typeof hexo !== 'undefined' && hexo && hexo.extend && hexo.extend.tag && hexo.extend.helper && hexo.log) {
  register(hexo);
}

// 导出核心函数，便于其他脚本复用
module.exports.generateGraphData = generateGraphData;
module.exports.buildGraphHTML = buildGraphHTML;
module.exports.getConfig = getConfig;