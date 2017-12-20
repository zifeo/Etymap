// @flow

import $ from 'jquery';
import * as d3 from 'd3';
import _ from 'lodash';
import { langNetwork } from '../json/data';

const languagesCoo = langNetwork.locations;

function recreateEtymology(viz, wordInfo, displayParents) {
  const width = $(`.right-panel .word-panel`).width() * 0.95;

  let maxDepth = {
    parents: 0,
    children: 0
  };

  function computeMaxDepth(obj, newDepth, key) {
    const parents = obj[1];
    if (maxDepth[key] < newDepth) {
      maxDepth[key] = newDepth;
    }

    if (parents.length > 0) {
      // more ancestors
      parents.forEach(p => computeMaxDepth(p, newDepth + 1, key))
    }
  }

  wordInfo['children'].forEach(p => computeMaxDepth(p, 1, 'children'));
  wordInfo['parents'].forEach(p => computeMaxDepth(p, 1, 'parents'));

  const totalDepth = maxDepth['children'] + maxDepth['parents'];
  const height = totalDepth * 110;

  d3.select(`.right-panel .word-panel .svg-container .svg-tree`).remove();  

  function recursiveCreateData(obj, key) {
    const lang = obj[0][0];
    const word = obj[0][1];
    const parents = obj[1];

    const recursiveData = {
      name: word,
      lang,
    };

    if (parents.length > 0) {
      // more ancestors
      recursiveData.parents = parents.map(p => recursiveCreateData(p, key));
    }

    return recursiveData;
  }

  const svgTree = d3
    .select(`.right-panel .word-panel .svg-container`)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'svg-tree');

  createHalfTree('parents');
  createHalfTree('children');

  d3.select('#gEty-parents-0').remove(); //Remove duplicate node

  function createHalfTree(key) {
    const data = {
      name: wordInfo.word,
      lang: wordInfo.lang,
    };

    data.parents = wordInfo[key].map(d => recursiveCreateData(d, key));

    const gPaths = svgTree.append('g');
    const gNodes = svgTree.append('g');

    const tree = d3.tree().size([width, maxDepth[key] / totalDepth]);

    const root = d3.hierarchy(data, d => d.parents);

    const descendants = tree(root).descendants();

    const dataNodes = descendants;
    const dataLinks = descendants.slice(1);

    dataNodes.forEach(d => {
      if (key === 'parents') {
        d.y = height * (maxDepth['children'] + d.depth + 1) / (totalDepth + 2);
      }
      else {
        d.y = height * (maxDepth['children'] - d.depth + 1) / (totalDepth + 2);
      }

      if (d.depth === 0) {
        d.x = width / 2;
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

    nodes
      .append('circle')
      .attr('r', d => d.depth === 0 ? 20 : 10)
      .attr('fill', '#76B5DE')
      .attr('stroke', '#075486')
      .attr('stroke-width', 2)
      .attr('class', (d, i) => `circleEty-${key}-${i}`)
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
          .attr('fill', '#76B5DE')
          .attr('stroke', '#075486');
      })
      .on('click', d => viz.asyncSelectWord(d.data.name, d.data.lang));

    nodes
      .append('text')
      .attr('dy', d => d.depth === 0 ? '-25px' : '-15px')
      .attr('text-anchor', 'middle')
      .text(d => d.data.name);

    nodes
      .append('text')
      .attr('dy', d => d.depth === 0 ? '33px' : '23px')
      .attr('text-anchor', 'middle')
      .attr('style', 'cursor:pointer;')
      .text(d => languagesCoo[d.data.lang] ? languagesCoo[d.data.lang].name : "fra") //temporary fix for long idioms, ex : "quand le chat n'est pas là, les souris dansent"
      .on('click', d => viz.asyncSelectLanguage(d.data.lang));

    const links = gPaths
      .selectAll('none')
      .data(dataLinks, d => d.id)
      .enter()
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', '#AAA')
      .attr('stroke-width', 3)
      .attr(
        'd',
        d3
          .linkVertical()
          .source(d => d)
          .target(d => d.parent)
          .x(d => d.x) // reversed as the tree is horizontal
          .y(d => d.y)
      );
  }
}

export { recreateEtymology };
