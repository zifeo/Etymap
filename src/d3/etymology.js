// @flow

import $ from 'jquery';
import * as d3 from 'd3';
import { langNetwork } from '../json/data';

const languagesCoo = langNetwork.locations;

function recreateEtymology(viz, wordInfo) {
  const width = $(`.right-panel .word-panel`).width() * 0.8;
  const height = width;

  d3.select(`.right-panel .word-panel .svg-container .svg-tree`).remove();

  let maxDepth = 0;

  function recursiveCreateData(obj, newDepth) {
    const lang = obj[0][0];
    const word = obj[0][1];
    const parents = obj[1];

    if (maxDepth < newDepth) {
      maxDepth = newDepth;
    }

    const recursiveData = {
      name: word,
      lang,
    };

    if (parents.length > 0) {
      // more ancestors
      const dataParents = [];
      for (const i in parents) {
        dataParents.push(recursiveCreateData(parents[i], newDepth + 1));
      }
      recursiveData.parents = dataParents;
    }

    return recursiveData;
  }

  const data = {
    name: wordInfo.word,
    lang: wordInfo.lang,
  };

  if (wordInfo.parents.length > 0) {
    const parents = [];
    for (const i in wordInfo.parents) {
      parents.push(recursiveCreateData(wordInfo.parents[i], 1));
    }
    data.parents = parents;
  }

  const svgTree = d3
    .select(`.right-panel .word-panel .svg-container`)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'svg-tree');

  const gPaths = svgTree.append('g').attr('transform', 'translate(0,0)');

  const gNodes = svgTree.append('g').attr('transform', 'translate(0,0)');

  const tree = d3.tree().size([height, width]);

  const root = d3.hierarchy(data, d => d.parents);

  const descendants = tree(root).descendants();

  const dataNodes = descendants;
  const dataLinks = descendants.slice(1);

  dataNodes.forEach(d => {
    d.y = (1 + d.depth) * width / (maxDepth + 2);
  });

  let i = 0;
  const nodes = gNodes
    .selectAll('none')
    .data(dataNodes, d => (d.id = ++i))
    .enter()
    .append('g')
    .attr('transform', d => `translate(${d.y},${d.x})`);

  nodes
    .append('circle')
    .attr('r', 10)
    .attr('fill', '#76B5DE')
    .attr('stroke', '#075486')
    .attr('stroke-width', 2)
    .attr('class', (d, i) => `circle${i}`)
    .on('mouseover', (d, i) => {
      d3
        .select(`.right-panel .word-panel .svg-container .circle${i}`)
        .transition()
        .duration(300)
        .attr('fill', '#F66')
        .attr('stroke', '#F00');
    })
    .on('mouseout', (d, i) => {
      d3
        .select(`.right-panel .word-panel .svg-container .circle${i}`)
        .transition()
        .duration(300)
        .attr('fill', '#76B5DE')
        .attr('stroke', '#075486');
    })
    .on('click', d => viz.asyncSelectWord(d.data.name, d.data.lang));

  nodes
    .append('text')
    .attr('dy', '-15px')
    .attr('text-anchor', 'middle')
    .text(d => d.data.name);

  nodes
    .append('text')
    .attr('dy', '23px')
    .attr('text-anchor', 'middle')
    .attr('style', 'cursor:pointer;')
    .text(d => languagesCoo[d.data.lang].name)
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
        .linkHorizontal()
        .source(d => d)
        .target(d => d.parent)
        .x(d => d.y) // reversed as the tree is horizontal
        .y(d => d.x)
    );
}

export { recreateEtymology };
