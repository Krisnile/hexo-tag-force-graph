/**
 * hexo-tag-force-graph 单元测试
 * 运行：npm test
 */

'use strict';

const assert = require('assert');
const path = require('path');

// 在 require 插件前注入 mock hexo（插件内使用全局 hexo，且会调用 hexo.extend.tag/helper）
function createMockHexo(posts = []) {
  return {
    locals: {
      get(name) {
        if (name !== 'posts') return { toArray: () => [] };
        return {
          toArray() {
            return posts;
          }
        };
      }
    },
    extend: {
      tag: { register: function () {} },
      helper: { register: function () {} }
    }
  };
}

// 创建带标签的 mock 文章
function createMockPost(overrides = {}) {
  return {
    title: '测试文章',
    path: 'posts/test.html',
    tags: [
      { name: 'JavaScript', posts: { length: 2 } },
      { name: 'Hexo', posts: { length: 1 } }
    ],
    ...overrides
  };
}

describe('generateGraphData', function () {
  let generateGraphData;

  before(function () {
    // 必须先设置 global.hexo，再 require 插件，否则插件内 hexo.extend 会报错
    global.hexo = createMockHexo();
    const plugin = require(path.join(__dirname, '..'));
    generateGraphData = plugin.generateGraphData;
  });

  it('无文章时返回空节点与空边', function () {
    const hexo = createMockHexo([]);
    const result = generateGraphData(hexo);
    assert(Array.isArray(result.nodes));
    assert(Array.isArray(result.links));
    assert.strictEqual(result.nodes.length, 0);
    assert.strictEqual(result.links.length, 0);
  });

  it('单篇文章带标签时生成对应节点与边', function () {
    const posts = [
      createMockPost({ title: '第一篇', path: 'p1.html', tags: [{ name: 'A', posts: { length: 1 } }] })
    ];
    const hexo = createMockHexo(posts);
    const result = generateGraphData(hexo);
    assert.strictEqual(result.nodes.length, 2); // 1 文章 + 1 标签
    assert.strictEqual(result.links.length, 1);
    assert.strictEqual(result.nodes[0].type, 'post');
    assert.strictEqual(result.nodes[0].name, '第一篇');
    assert.strictEqual(result.nodes[1].type, 'tag');
    assert.strictEqual(result.nodes[1].name, 'A');
    assert.deepStrictEqual(result.links[0], { source: 'p0', target: 'tA' });
  });

  it('多篇文章共用标签时不重复添加标签节点', function () {
    const tagA = { name: '共用', posts: { length: 2 } };
    const posts = [
      createMockPost({ title: '一', path: 'a.html', tags: [tagA] }),
      createMockPost({ title: '二', path: 'b.html', tags: [tagA] })
    ];
    const hexo = createMockHexo(posts);
    const result = generateGraphData(hexo);
    const tagNodes = result.nodes.filter(n => n.type === 'tag');
    assert.strictEqual(tagNodes.length, 1);
    assert.strictEqual(result.links.length, 2);
  });

  it('文章无标题时使用「无标题」', function () {
    const posts = [
      { title: '', path: 'x.html', tags: [] }
    ];
    const hexo = createMockHexo(posts);
    const result = generateGraphData(hexo);
    assert.strictEqual(result.nodes[0].name, '无标题');
  });

  it('同一篇文章中的多个标签两两相连', function () {
    const posts = [
      {
        title: '多标签',
        path: 'p.html',
        tags: [
          { name: 'A', posts: { length: 1 } },
          { name: 'B', posts: { length: 1 } },
          { name: 'C', posts: { length: 1 } }
        ]
      }
    ];
    const hexo = createMockHexo(posts);
    const result = generateGraphData(hexo);
    assert.strictEqual(result.nodes.length, 4); // 1 文章 + 3 标签
    var postTagLinks = result.links.filter(l => l.source === 'p0' || l.target === 'p0');
    var tagTagLinks = result.links.filter(l => l.source !== 'p0' && l.target !== 'p0');
    assert.strictEqual(postTagLinks.length, 3); // 文章连 3 个标签
    assert.strictEqual(tagTagLinks.length, 3); // A-B, A-C, B-C
  });
});

describe('buildGraphHTML', function () {
  let buildGraphHTML;

  before(function () {
    if (!global.hexo) global.hexo = createMockHexo();
    const plugin = require(path.join(__dirname, '..'));
    buildGraphHTML = plugin.buildGraphHTML;
  });

  it('输出包含指定 id、高度、背景色', function () {
    const graphData = { nodes: [{ id: 'p0', name: '测试', type: 'post', url: '/p/', val: 1 }], links: [] };
    const html = buildGraphHTML(graphData, '600px', '#1a1a2e', 'my-id');
    assert(html.includes('id="my-id"'));
    assert(html.includes('height: 600px'));
    assert(html.includes('background: #1a1a2e'));
    assert(html.includes('hexo-force-graph'));
  });

  it('输出包含 3d-force-graph 脚本与 graphData', function () {
    const graphData = { nodes: [], links: [] };
    const html = buildGraphHTML(graphData, '500px', '#111', 'fg-1');
    assert(html.includes('3d-force-graph'));
    assert(html.includes('graphData'));
    assert(html.includes('ForceGraph3D'));
  });
});

describe('getConfig', function () {
  let getConfig;

  before(function () {
    if (!global.hexo) global.hexo = createMockHexo();
    const plugin = require(path.join(__dirname, '..'));
    getConfig = plugin.getConfig;
  });

  it('无 config 时返回默认 height 和 backgroundColor', function () {
    const hexo = createMockHexo();
    const cfg = getConfig(hexo);
    assert.strictEqual(cfg.height, '500px');
    assert.strictEqual(cfg.backgroundColor, '#111');
  });

  it('有 config.forcegraph 时使用配置值', function () {
    const hexo = { config: { forcegraph: { height: '600px', backgroundColor: '#1a1a2e' } } };
    const cfg = getConfig(hexo);
    assert.strictEqual(cfg.height, '600px');
    assert.strictEqual(cfg.backgroundColor, '#1a1a2e');
  });
});
