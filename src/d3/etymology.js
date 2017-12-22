// @flow

import $ from 'jquery';
import * as d3 from 'd3';
import _ from 'lodash';
import { langNetwork } from '../json/data';

const languagesCoo = langNetwork.locations;

function recreateEtymology(viz, wordInfo) {
  const width = $(`.right-panel .word-panel`).width() * 0.95;

  const maxDepth = {
    parents: 0,
    children: 0,
  };

  const treeWidth = {
    parents: {},
    children: {},
  };

  treeWidth.parents[0] = 0;
  treeWidth.children[0] = 0;

  function computeMaxDepth(obj, newDepth, key) {
    // Computes the maximum depth for the trees
    const parents = obj[1];
    if (maxDepth[key] < newDepth) {
      maxDepth[key] = newDepth;
    }

    if (!treeWidth[key][newDepth]) {
      treeWidth[key][newDepth] = 0;
    }
    treeWidth[key][newDepth] += 1;

    if (parents.length > 0) {
      // more ancestors
      smartTrim(parents, obj[0][0]).forEach(p => computeMaxDepth(p, newDepth + 1, key));
    }
  }

  smartTrim(wordInfo.children, wordInfo.lang).forEach(p => computeMaxDepth(p, 1, 'children'));
  smartTrim(wordInfo.parents, wordInfo.lang).forEach(p => computeMaxDepth(p, 1, 'parents'));

  const maxWidth = Math.max(
    _.max(Object.keys(treeWidth.children).map(i => treeWidth.children[i])),
    _.max(Object.keys(treeWidth.parents).map(i => treeWidth.parents[i]))
  );

  const totalDepth = maxDepth.children + maxDepth.parents;
  const height = (totalDepth + 2) * 130;

  d3.select(`.right-panel .word-panel .svg-container .svg-tree`).remove();

  function recursiveCreateData(obj, key) {
    // Maps the server output to d3-friendly format
    const lang = obj[0][0];
    const word = obj[0][1];
    const parents = obj[1];

    const recursiveData = {
      name: word,
      lang,
    };

    if (parents.length > 0) {
      // more ancestors
      recursiveData.parents = smartTrim(parents, lang).map(p => recursiveCreateData(p, key));
    }

    return recursiveData;
  }

  const svgTree = d3
    .select(`.right-panel .word-panel .svg-container`)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'svg-tree');

  const g = svgTree.append('g');

  const zoom = d3
    .zoom()
    .scaleExtent([1, 1])
    .on('zoom', () => {
      const { transform } = d3.event;
      transform.y = 0;
      g.attr('transform', transform);
    });

  svgTree.call(zoom);

  createHalfTree('parents');
  createHalfTree('children');

  d3.select('#gEty-parents-0').remove(); // Remove duplicate central node

  function smartTrim(relatives, lang) {
    /* Is used if a word has many descendants from the same language, in for instance,
    latin declension, or French conjugation */
    const differentLangs = relatives.filter(o => o[0][0] !== lang);
    const sameLang = _.take(relatives.filter(o => o[0][0] === lang), 3);
    return sameLang.concat(differentLangs);
  }

  function createHalfTree(key) {
    const data = {
      name: wordInfo.word,
      lang: wordInfo.lang,
    };

    data.parents = smartTrim(wordInfo[key], wordInfo.lang).map(d => recursiveCreateData(d, key));

    const gPaths = g.append('g');
    const gNodes = g.append('g');

    // To avoid collisions, we increase the width based on the maximum width of the graph
    const tree = d3.tree().size([Math.max(maxWidth * width / 5, width), maxDepth[key] / totalDepth]);

    const root = d3.hierarchy(data, d => d.parents);

    const descendants = tree(root).descendants();

    const dataNodes = descendants;
    const dataLinks = descendants.slice(1);

    dataNodes.forEach(d => {
      let depth = 0;
      if (key === 'parents') {
        ({ depth } = d);
      } else {
        depth = -d.depth;
      }

      d.y = height * (maxDepth.children + depth + 1) / (totalDepth + 2);

      if (d.depth === 0) {
        d.x = width / 2; // The central node is always at the same position
      }
    });

    let i = 0;
    const nodes = gNodes
      .selectAll('none')
      .data(dataNodes, d => (d.id = ++i))
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('id', (d, i) => `gEty-${key}-${i}`);

    function getColor(depth) {
      return depth === 0 ? '#F66' : key === 'children' ? '#ff7f00' : '#76B5DE';
    }

    // Circles
    nodes
      .append('circle')
      .attr('r', d => (d.depth === 0 ? 20 : 10))
      .attr('fill', d => getColor(d.depth))
      .attr('stroke', '#075486')
      .attr('stroke-width', 2)
      .attr('class', (d, i) => `circleEty-${key}-${i} clickable`)
      .on('mouseover', (d, i) => {
        d3
          .select(`.right-panel .word-panel .svg-container .circleEty-${key}-${i}`)
          .transition()
          .duration(300)
          .attr('fill', '#F66')
          .attr('stroke', '#F00');
      })
      .on('mouseout', (d, i) => {
        d3
          .select(`.right-panel .word-panel .svg-container .circleEty-${key}-${i}`)
          .transition()
          .duration(300)
          .attr('fill', getColor(d.depth))
          .attr('stroke', '#075486');
      })
      .on('click', d => viz.navigateToWord(d.data.name, d.data.lang));

    // Words text
    nodes
      .append('text')
      .attr('dy', d => (d.depth === 0 ? '-25px' : '-15px'))
      .attr('text-anchor', 'middle')
      .text(d => d.data.name);

    // Language name
    nodes
      .append('text')
      .attr('dy', d => (d.depth === 0 ? '33px' : '23px'))
      .attr('text-anchor', 'middle')
      .attr('style', 'cursor:pointer;')
      .text(d => languagesCoo[d.data.lang].name)
      .on('click', d => viz.navigateToLanguage(d.data.lang));

    // Links
    gPaths
      .selectAll('none')
      .data(dataLinks, d => d.id)
      .enter()
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', '#AAA')
      .attr('stroke-width', d => (diffLang(d) ? 7 : 3))
      .attr('id', d => `pathLink-${d.id}`)
      .attr(
        'd',
        d3
          .linkVertical()
          .source(d => d)
          .target(d => d.parent)
          .x(d => d.x) // reversed as the tree is horizontal
          .y(d => d.y)
      )
      .attr('class', d => (diffLang(d) ? 'clickable' : ''))
      .on('click', d => {
        if (diffLang(d)) {
          viz.navigateToLanguagePair(d.data.lang, d.parent.data.lang);
        }
      })
      .append('title')
      .text(d => (diffLang(d) ? `${languagesCoo[d.data.lang].name} ↔ ${languagesCoo[d.parent.data.lang].name}` : ''));

    function diffLang(d) {
      return d.data.lang !== d.parent.data.lang;
    }
  }
}

export { recreateEtymology };
