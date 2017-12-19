// @flow

import $ from 'jquery';
import * as d3 from 'd3';
import { langNetwork } from '../json/data';

const languagesCoo = langNetwork.locations;
const lineGeneratorAlluvial = d3.line().curve(d3.curveMonotoneX);

function recreateAlluvial(viz, from, selector, dataFrom, isocodesFrom, dataTo, isocodesTo) {
  const width = $(`.right-panel ${selector} `).width() * 0.8;
  const height = width;

  const nodeWidth = width / 20;
  const margin = 0.05;

  d3.selectAll('.svg-alluvial').remove();

  const dataFromCum = [];
  let curr = 0;
  for (const i in dataFrom) {
    dataFromCum.push(curr);
    curr += dataFrom[i];
  }
  const fromCumSum = 1 + margin * (dataFrom.length - 1);

  const dataToCum = [];
  curr = 0;
  for (const i in dataTo) {
    dataToCum.push(curr);
    curr += dataTo[i];
  }
  const toCumSum = 1 + margin * (dataTo.length - 1);

  const maxSum = Math.max(fromCumSum, toCumSum);

  const color = d3
    .scaleLinear()
    .domain([0, 1])
    .range(['#76B5DE', '#075486']);

  const svgAlluvial = d3
    .select(`.right-panel ${selector}`)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'svg-alluvial');

  const gPaths = svgAlluvial.append('g');
  const gNodes = svgAlluvial.append('g');

  const gFrom = gNodes.append('g');

  const gTo = gNodes.append('g').attr('transform', `translate(${width - nodeWidth})`);

  // Nodes & text
  function addNodes(data, dataCum, isocodes, group, isFrom) {
    const baseID = isFrom ? 0 : 1;
    group
      .selectAll('none')
      .data(dataCum)
      .enter()
      .append('rect')
      .attr('fill', 'black')
      .attr('width', nodeWidth)
      .attr('height', (d, i) => data[i] * height / maxSum)
      .attr('y', (d, i) => (d + i * margin) * height / maxSum)
      .attr('class', (d, i) => `node-${baseID}-${i}`)
      .on('mouseover', (d, i) => {
        d3
          .select(`${selector} .node-${baseID}-${i}`)
          .transition()
          .duration(300)
          .attr('fill', '#F66');
      })
      .on('mouseout', (d, i) => {
        d3
          .select(`${selector} .node-${baseID}-${i}`)
          .transition()
          .duration(300)
          .attr('fill', 'black');
      })
      .on('click', (d, i) => {
        viz.asyncSelectLanguage(isocodes[i]);
      });

    group
      .selectAll('none')
      .data(isocodes)
      .enter()
      .append('text')
      .attr('fill', 'black')
      .attr('x', isFrom ? nodeWidth + 5 : -5)
      .attr('y', (d, i) => (dataCum[i] + data[i] / 2 + i * margin) * height / maxSum + 5)
      .attr('text-anchor', isFrom ? 'start' : 'end')
      .text(d => languagesCoo[d].name);
  }

  addNodes(dataFrom, dataFromCum, isocodesFrom, gFrom, true);
  addNodes(dataTo, dataToCum, isocodesTo, gTo, false);

  gNodes
    .append('rect') // Central node
    .attr('width', nodeWidth)
    .attr('height', height / maxSum)
    .attr('x', width / 2 - nodeWidth / 2)
    .attr('y', 0);

  // Links
  const fromPaths = [];
  for (const i in dataFrom) {
    const newPath = [];
    newPath.push([0, (dataFromCum[i] + i * margin + dataFrom[i] / 2) * height / maxSum]);
    newPath.push([nodeWidth, (dataFromCum[i] + i * margin + dataFrom[i] / 2) * height / maxSum]);
    newPath.push([width / 2 - nodeWidth / 2, (dataFromCum[i] + dataFrom[i] / 2) * height / maxSum]);
    newPath.push([width / 2 + nodeWidth / 2, (dataFromCum[i] + dataFrom[i] / 2) * height / maxSum]);
    fromPaths.push(newPath);
  }

  const toPaths = [];
  for (const i in dataTo) {
    const newPath = [];
    newPath.push([width / 2 - nodeWidth / 2, (dataToCum[i] + dataTo[i] / 2) * height / maxSum]);
    newPath.push([width / 2 + nodeWidth / 2, (dataToCum[i] + dataTo[i] / 2) * height / maxSum]);
    newPath.push([width - nodeWidth, (dataToCum[i] + i * margin + dataTo[i] / 2) * height / maxSum]);
    newPath.push([width, (dataToCum[i] + i * margin + dataTo[i] / 2) * height / maxSum]);
    toPaths.push(newPath);
  }

  function addPaths(paths, data, isocodes, isFrom) {
    const baseID = isFrom ? 0 : 1;
    gPaths
      .selectAll('none')
      .data(paths)
      .enter()
      .append('path')
      .attr('class', (d, i) => `path-${baseID}-${i}`)
      .attr('fill', 'none')
      .attr('initial-stroke', (d, i) => d3.rgb(color(i / data.length)))
      .attr('stroke', (d, i) => d3.select(`${selector} .path-${baseID}-${i}`).attr('initial-stroke'))
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', (d, i) => data[i] * height / maxSum)
      .attr('d', lineGeneratorAlluvial)
      .on('mouseover', (d, i) => {
        d3
          .select(`${selector} .path-${baseID}-${i}`)
          .transition()
          .duration(300)
          .attr('stroke', '#F66');
      })
      .on('mouseout', (d, i) => {
        d3
          .select(`${selector} .path-${baseID}-${i}`)
          .transition()
          .duration(300)
          .attr('stroke', d3.select(`${selector} .path-${baseID}-${i}`).attr('initial-stroke'));
      })
      .on('click', (d, i) => {
        if (isFrom) {
          viz.asyncSelectLanguagePair(from, isocodes[i]);
        } else {
          viz.asyncSelectLanguagePair(isocodes[i], from);
        }
      });
  }

  addPaths(fromPaths, dataFrom, isocodesFrom, true);
  addPaths(toPaths, dataTo, isocodesTo, false);
}

export { recreateAlluvial };