// @flow

import $ from 'jquery';
import * as d3 from 'd3';
import _ from 'lodash';
import { langNetwork } from '../json/data';

const languagesCoo = langNetwork.locations;
const lineGeneratorAlluvial = d3.line().curve(d3.curveMonotoneX);

function recreateAlluvial(viz, from, selector) {
  // only takes the influencing languages, which account for at least 5% of the words
  const influencing = _.takeWhile(langNetwork.fromProportion[from], pair => pair[1] > 0.05);
  // only takes the influenced languages, which account for at least 5% of the words
  const influenced = _.takeWhile(langNetwork.toProportion[from], pair => pair[1] > 0.05);

  const dataFromNotNormalized = influencing.map(pair => pair[1]);
  const dataToNotNormalized = influenced.map(pair => pair[1]);

  const fromSum = dataFromNotNormalized.length > 0 ? dataFromNotNormalized.reduce((total, value) => total + value) : 0;
  const toSum = dataToNotNormalized.length > 0 ? dataToNotNormalized.reduce((total, value) => total + value) : 0;

  const fromOtherPresent = fromSum < 1;
  const dataFrom = dataFromNotNormalized;
  if (fromOtherPresent) dataFrom.push(1 - fromSum);
  const isocodesFrom = influencing.map(pair => pair[0]);
  if (fromOtherPresent) isocodesFrom.push(null);

  const toOtherPresent = toSum < 1;
  const dataTo = dataToNotNormalized;
  if (toOtherPresent) dataTo.push(1 - toSum);
  const isocodesTo = influenced.map(pair => pair[0]);
  if (toOtherPresent) isocodesTo.push(null);

  const width = $(`.right-panel ${selector} `).width() * 0.8;
  const height = width;

  const nodeWidth = width / 20;
  const margin = 0.05;

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

  const offsetFrom = (height - fromCumSum * height / maxSum) / 2;
  const offsetMiddle = (height - height / maxSum) / 2;
  const offsetTo = (height - toCumSum * height / maxSum) / 2;

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

  function getOffset(isFrom) {
    return isFrom ? offsetFrom : offsetTo;
  }

  function getName(isFrom, i) {
    if (isFrom) return isocodesFrom[i] ? languagesCoo[isocodesFrom[i]].name : 'Others';
    return isocodesTo[i] ? languagesCoo[isocodesTo[i]].name : 'Others';
  }

  // Nodes & text
  function addNodes(data, dataCum, isocodes, group, isFrom) {
    const baseID = isFrom ? 0 : 1;

    // Node
    group
      .selectAll('none')
      .data(dataCum)
      .enter()
      .append('rect')
      .attr('fill', '#37485E')
      .attr('width', nodeWidth)
      .attr('height', (d, i) => data[i] * height / maxSum)
      .attr('y', (d, i) => getOffset(isFrom) + (d + i * margin) * height / maxSum)
      .attr('class', (d, i) => (isocodes[i] ? `node-${baseID}-${i} clickable` : `node-${baseID}-${i}`))
      .on('mouseover', (d, i) => {
        if (!isocodes[i]) return;

        d3
          .select(`${selector} .node-${baseID}-${i}`)
          .transition()
          .duration(300)
          .attr('fill', '#F66');
      })
      .on('mouseout', (d, i) => {
        if (!isocodes[i]) return;

        d3
          .select(`${selector} .node-${baseID}-${i}`)
          .transition()
          .duration(300)
          .attr('fill', '#37485E');
      })
      .on('click', (d, i) => {
        if (!isocodes[i]) return;

        viz.navigateToLanguage(isocodes[i]);
      })
      .append('title')
      .text((d, i) => getName(isFrom, i));

    // Language name
    group
      .selectAll('none')
      .data(isocodes)
      .enter()
      .append('text')
      .attr('fill', 'black')
      .attr('x', isFrom ? nodeWidth + 5 : -5)
      .attr('y', (d, i) => getOffset(isFrom) + (dataCum[i] + data[i] / 2 + i * margin) * height / maxSum + 5)
      .attr('text-anchor', isFrom ? 'start' : 'end')
      .text((d, i) => getName(isFrom, i));
  }

  addNodes(dataFrom, dataFromCum, isocodesFrom, gFrom, true);
  addNodes(dataTo, dataToCum, isocodesTo, gTo, false);

  // Central node
  gNodes
    .append('rect')
    .attr('fill', '#BA5357')
    .attr('width', nodeWidth)
    .attr('height', height / maxSum)
    .attr('x', width / 2 - nodeWidth / 2)
    .attr('y', offsetMiddle);

  // Central text
  gNodes
    .append('text')
    .attr('dy', '6px')
    .attr('font-size', '20px')
    .attr('text-anchor', 'middle')
    .attr('transform', `translate(${width / 2}, ${height / 2})rotate(-90)`)
    .text(languagesCoo[from].name);

  // Links
  const fromPaths = [];
  for (const i in dataFrom) {
    const newPath = [];
    newPath.push([0, offsetFrom + (dataFromCum[i] + i * margin + dataFrom[i] / 2) * height / maxSum]);
    newPath.push([nodeWidth, offsetFrom + (dataFromCum[i] + i * margin + dataFrom[i] / 2) * height / maxSum]);
    newPath.push([width / 2 - nodeWidth / 2, offsetMiddle + (dataFromCum[i] + dataFrom[i] / 2) * height / maxSum]);
    newPath.push([width / 2 + nodeWidth / 2, offsetMiddle + (dataFromCum[i] + dataFrom[i] / 2) * height / maxSum]);
    fromPaths.push(newPath);
  }

  const toPaths = [];
  for (const i in dataTo) {
    const newPath = [];
    newPath.push([width / 2 - nodeWidth / 2, offsetMiddle + (dataToCum[i] + dataTo[i] / 2) * height / maxSum]);
    newPath.push([width / 2 + nodeWidth / 2, offsetMiddle + (dataToCum[i] + dataTo[i] / 2) * height / maxSum]);
    newPath.push([width - nodeWidth, offsetTo + (dataToCum[i] + i * margin + dataTo[i] / 2) * height / maxSum]);
    newPath.push([width, offsetTo + (dataToCum[i] + i * margin + dataTo[i] / 2) * height / maxSum]);
    toPaths.push(newPath);
  }

  function addPaths(paths, data, isocodes, isFrom) {
    const baseID = isFrom ? 0 : 1;
    gPaths
      .selectAll('none')
      .data(paths)
      .enter()
      .append('path')
      .attr('class', (d, i) => (isocodes[i] ? `path-${baseID}-${i} clickable` : `path-${baseID}-${i}`))
      .attr('id', (d, i) => `path-${baseID}-${i}-${selector}`)
      .attr('fill', 'none')
      .attr('initial-stroke', (d, i) => d3.rgb(color(i / data.length)))
      .attr('stroke', (d, i) => d3.select(`${selector} .path-${baseID}-${i}`).attr('initial-stroke'))
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', (d, i) => data[i] * height / maxSum)
      .attr('d', lineGeneratorAlluvial)
      .on('mouseover', (d, i) => {
        if (!isocodes[i]) return;

        d3
          .select(`${selector} .path-${baseID}-${i}`)
          .transition()
          .duration(300)
          .attr('stroke', '#F66');
      })
      .on('mouseout', (d, i) => {
        if (!isocodes[i]) return;

        d3
          .select(`${selector} .path-${baseID}-${i}`)
          .transition()
          .duration(300)
          .attr('stroke', d3.select(`${selector} .path-${baseID}-${i}`).attr('initial-stroke'));
      })
      .on('click', (d, i) => {
        if (!isocodes[i]) return;

        if (isFrom) {
          viz.navigateToLanguagePair(from, isocodes[i]);
        } else {
          viz.navigateToLanguagePair(isocodes[i], from);
        }
      })
      .append('title')
      .text((d, i) => {
        if (!isocodes[i]) return;

        if (isFrom) {
          return `${languagesCoo[isocodes[i]].name} ↔ ${languagesCoo[from].name}`;
        }
        return `${languagesCoo[from].name} ↔ ${languagesCoo[isocodes[i]].name}`;
      });

    // Arrow
    gPaths
      .selectAll('none')
      .data(paths)
      .enter()
      .append('text')
      .attr('font-size', '40px')
      .attr('dy', '14px')
      .attr('opacity', 0.2)
      .attr('text-anchor', 'middle')
      .append('textPath')
      .attr('startOffset', isFrom ? '75%' : '25%')
      .attr('xlink:href', (d, i) => `#path-${baseID}-${i}-${selector}`)
      .text('>');
  }

  addPaths(fromPaths, dataFrom, isocodesFrom, true);
  addPaths(toPaths, dataTo, isocodesTo, false);
}

export { recreateAlluvial };
