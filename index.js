/**
 * hexo-tag-force-graph
 * 在 Hexo 博客中插入「文章-标签」3D/2D 知识图谱，支持 Markdown、布局 Helper、自动注入
 * 模块：generateGraphData / getConfig / buildGraphHTML / register(tag+helper+injector)
 * @see https://github.com/Krisnile/hexo-tag-force-graph
 */

'use strict';

const path = require('path');
const fs = require('fs');

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
  const inject = cfg.inject === true || cfg.inject === 'true';
  let injectTo = cfg.injectTo != null ? cfg.injectTo : [];
  if (!Array.isArray(injectTo)) injectTo = injectTo ? [injectTo] : [];
  const injectToSet = new Set(injectTo.map((x) => String(x).trim().toLowerCase()));
  const tagLike = injectToSet.has('tag') || injectToSet.has('tags');
  const archiveLike = injectToSet.has('archive') || injectToSet.has('archives');
  const onlyTagAndArchive = injectToSet.size === 2 && tagLike && archiveLike;
  let injectPosition = (cfg.injectPosition && String(cfg.injectPosition).trim()) || '';
  if (!injectPosition && onlyTagAndArchive) injectPosition = 'right';
  const root = (hexo && hexo.config && hexo.config.root) ? String(hexo.config.root) : '/';
  const scriptRoot = root.replace(/\/?$/, '/');
  return {
    height: (cfg.height && String(cfg.height).trim()) || '500px',
    backgroundColor: (cfg.backgroundColor && String(cfg.backgroundColor).trim()) || (cfg.bgColor && String(cfg.bgColor).trim()) || '#111',
    inject,
    injectTo,
    injectPosition: injectPosition.toLowerCase() === 'right' ? 'right' : '',
    injectRightHeight: (cfg.injectRightHeight && String(cfg.injectRightHeight).trim()) || '280px',
    injectBottom: (cfg.injectBottom != null && cfg.injectBottom !== '') ? String(cfg.injectBottom).trim() : '370px',
    scriptRoot
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
function buildGraphHTML(graphData, height, bgColor, id, options) {
  const useThemeBg = options && options.useThemeBg === true;
  const deferInit = options && options.deferInit === true;
  const explicitSize = options && options.explicitSize === true;
  const use2D = options && options.use2D === true;
  const scriptRoot = (options && options.scriptRoot != null && options.scriptRoot !== '') ? String(options.scriptRoot).replace(/\/?$/, '/') : '/';
  const scriptPath2d = scriptRoot + 'js/hexo-force-graph-2d.min.js';
  const scriptPath3d = scriptRoot + 'js/hexo-force-graph-3d.min.js';
  const containerStyle = explicitSize
    ? 'width: 268px; height: 260px; margin: 0; background: rgba(0,0,0,0.03); border-radius: 8px;'
    : 'width: 100%; height: ' + height + '; margin: 1rem 0; background: ' + (useThemeBg ? 'transparent' : bgColor) + '; border-radius: 8px;';
  const graphDataStr = JSON.stringify(graphData);
  const nodeColor = "function(node) { return node.type === 'post' ? '#e67e22' : '#00b894'; }";
  const nodeLabel = "function(node) { return node.name + (node.type === 'post' ? ' (文章)' : ' (标签)'); }";
  let runInit;
  let scriptUrl;
  let checkGlobal;
  if (use2D) {
    scriptUrl = scriptPath2d;
    checkGlobal = 'ForceGraph';
    runInit = `function _fgInit() {
  var container = document.getElementById('${id}');
  if (!container) return;
  if (typeof ForceGraph === 'undefined') {
    container.innerHTML = '<p style="color:#999;text-align:center;font-size:12px;">2D 图谱脚本加载失败</p>';
    return;
  }
  var w = container.offsetWidth, h = container.offsetHeight;
  if (!w || !h) { container.innerHTML = '<p style="color:#999;text-align:center;font-size:12px;">容器尺寸异常</p>'; return; }
  var graphData = ${graphDataStr};
  try {
    ForceGraph()(container).graphData(graphData)
      .nodeLabel(${nodeLabel}).nodeColor(${nodeColor}).nodeVal(function(n){ return n.type === 'post' ? 8 : 5; })
      .linkColor(function(){ return 'rgba(100,100,100,0.4)'; }).linkWidth(1)
      .onNodeClick(function(n){ window.location.href = n.url; })
      .backgroundColor('rgba(255,255,255,0)');
  } catch (e) { console.error(e); container.innerHTML = '<p style="color:red;font-size:12px;">加载失败</p>'; }
}`;
  } else {
    scriptUrl = scriptPath3d;
    checkGlobal = 'ForceGraph3D';
    runInit = `function _fgInit() {
  var container = document.getElementById('${id}');
  if (!container) return;
  if (typeof ForceGraph3D === 'undefined') {
    container.innerHTML = '<p style="color:#999;text-align:center;">3D 图谱脚本加载失败</p>';
    return;
  }
  var w = container.offsetWidth, h = container.offsetHeight;
  if (!w || !h) {
    container.innerHTML = '<p style="color:#999;text-align:center;padding:1rem;">容器尺寸异常</p>';
    return;
  }
  var graphData = ${graphDataStr};
  var useTransparent = ${useThemeBg ? 'true' : 'false'};
  var fallbackBg = '${bgColor.replace(/'/g, "\\'")}';
  try {
    var Graph = ForceGraph3D()(container)
      .graphData(graphData)
      .nodeLabel(${nodeLabel})
      .nodeColor(${nodeColor})
      .nodeVal(function(node) { return node.type === 'post' ? 8 : 5; })
      .linkColor(function() { return 'rgba(100,100,100,0.35)'; })
      .linkWidth(1)
      .onNodeClick(function(node) { window.location.href = node.url; })
      .enableNodeDrag(true)
      .enableNavigationControls(true);
    var ctrl = Graph.controls && Graph.controls();
    if (ctrl && typeof ctrl.autoRotate !== 'undefined') ctrl.autoRotate = false;
    if (useTransparent) Graph.backgroundColor('transparent');
    else {
      var bg = container && getComputedStyle(container).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') Graph.backgroundColor(bg);
      else Graph.backgroundColor(fallbackBg);
    }
  } catch (e) {
    console.error('ForceGraph error:', e);
    container.innerHTML = '<p style="color:red;text-align:center;">图谱加载失败</p>';
  }
}`;
  }
  var runCall;
  var scriptTag;
  if (deferInit && use2D) {
    const scriptUrl2 = 'https://cdn.jsdelivr.net/npm/force-graph@1.51.1/dist/force-graph.min.js';
    runCall = `function _fgRun() {
  var el = document.getElementById('${id}');
  if (!el) return;
  el.innerHTML = '<p style="color:#999;text-align:center;font-size:12px;">加载中…</p>';
  var urls = ['${scriptUrl}', '${scriptUrl2}'];
  var idx = 0;
  function tryNext() {
    if (idx >= urls.length) {
      if (el) el.innerHTML = '<p style="color:#999;text-align:center;font-size:12px;">脚本加载失败，请检查网络</p>';
      return;
    }
    var s = document.createElement('script');
    s.src = urls[idx++];
    s.onload = function() {
      if (typeof ForceGraph !== 'undefined') _fgInit();
      else if (el) el.innerHTML = '<p style="color:#999;text-align:center;font-size:12px;">图谱库未就绪</p>';
    };
    s.onerror = tryNext;
    (document.head || document.documentElement).appendChild(s);
  }
  tryNext();
}
if (document.readyState === 'complete') setTimeout(_fgRun, 150);
else window.addEventListener('load', function() { setTimeout(_fgRun, 150); });`;
    scriptTag = '';
  } else if (deferInit) {
    runCall = `function _fgRun() {
  if (typeof ${checkGlobal} !== 'undefined') { _fgInit(); return; }
  var t = 0, max = 60;
  var iv = setInterval(function() {
    t++;
    if (typeof ${checkGlobal} !== 'undefined') { clearInterval(iv); _fgInit(); return; }
    if (t >= max) { clearInterval(iv); var el = document.getElementById('${id}'); if (el) el.innerHTML = '<p style="color:#999;text-align:center;font-size:12px;">脚本加载超时</p>'; }
  }, 100);
}
if (document.readyState === 'complete') setTimeout(_fgRun, 100);
else window.addEventListener('load', function() { setTimeout(_fgRun, 100); });`;
    scriptTag = '<script src="' + scriptUrl + '"><\/script>';
  } else {
    runCall = '_fgInit();';
    scriptTag = '<script src="' + scriptUrl + '"><\/script>';
  }
  return `
<div id="${id}" class="hexo-force-graph" style="${containerStyle}"></div>
${scriptTag}
<script>
(function() {
  ${runInit}
  ${runCall}
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

  // ========== 通过 Injector 自动注入图谱 ==========
  // 重要：Hexo 的 injector.register() 会立即执行传入的函数并缓存结果。插件在 load_plugins 阶段运行，
  // 此时 load_database 尚未执行，hexo.locals.get('posts') 为空。必须延迟到 ready 后再注册，
  // 否则 generateGraphData 会返回空数据，导致图谱不显示。
  if (hexo.extend.injector) {
    const cfg = getConfig(hexo);
    if (cfg.inject && cfg.injectTo && cfg.injectTo.length > 0) {
      const doRegister = function () {
        const c = getConfig(hexo);
        const graphData = generateGraphData(hexo);
        if (!graphData.nodes || graphData.nodes.length === 0) {
          return '';
        }
        const id = 'fg-inject-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8);
        if (c.injectPosition === 'right') {
          const graphHtml = buildGraphHTML(graphData, c.injectRightHeight, c.backgroundColor, id, { useThemeBg: true, deferInit: true, explicitSize: true, use2D: true });
          const bottom = c.injectBottom || '370px';
          return `<div class="hexo-force-graph-inject-right" style="position: fixed; right: 0; bottom: ${bottom}; width: 280px; height: 320px; max-height: 45vh; box-sizing: border-box; z-index: 2147483647; border-radius: 8px 0 0 8px; background: transparent; padding: 0.75rem; display: flex; flex-direction: column; pointer-events: none;">
  <div style="pointer-events: auto; flex: 1; min-height: 260px; border-radius: 6px; overflow: hidden;">${graphHtml.replace('margin: 1rem 0;', 'margin: 0;')}</div>
</div>`;
        }
        const titleAndGraph = `<h3 style="margin-bottom: 0.5rem; font-size: 1.2rem;">📊 知识图谱</h3>
  ${buildGraphHTML(graphData, c.height, c.backgroundColor, id)}`;
        return `<div class="hexo-force-graph-wrapper" style="margin: 2rem auto; max-width: 800px; padding: 0 1rem;">
  ${titleAndGraph}
</div>`;
      };

      hexo.on('generateBefore', function () {
        cfg.injectTo.forEach(function (to) {
          const layout = String(to).trim();
          if (layout) {
            hexo.extend.injector.register('body_end', doRegister, layout);
            hexo.log.debug(`[forcegraph] 已为布局 "${layout}" 注册自动注入`);
          }
        });
        hexo.log.info(`[forcegraph] 自动注入已启用，目标布局: ${cfg.injectTo.join(', ')}`);
      });
    }
  } else {
    hexo.log.warn('[forcegraph] 当前 Hexo 版本不支持 injector，自动注入功能不可用');
  }
}

// 入口：Hexo loadPlugin 将 hexo 作为第 6 个参数注入，执行时立即 register；导出供 loadPlugin 调用
module.exports = function (hexo) {
  register(hexo);
};
if (typeof hexo !== 'undefined' && hexo && hexo.extend && hexo.extend.tag && hexo.extend.helper && hexo.log) {
  register(hexo);
}

module.exports.generateGraphData = generateGraphData;
module.exports.buildGraphHTML = buildGraphHTML;
module.exports.getConfig = getConfig;