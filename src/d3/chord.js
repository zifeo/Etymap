// @flow

import $ from 'jquery';
import * as d3 from 'd3';
import { langNetwork } from '../json/data';

const languagesCoo = langNetwork.locations;

function recreateChord(viz, params, selector) {
  const matrix = params[0];
  const isocodes = params[1];

  const selectedLanguageIndex = isocodes.length - 1;
  const width = $(`.right-panel .language-panel`).width() * 0.8;
  const height = width * 1.2;

  const outerRadius = width / 2.5;
  const innerRadius = width / 3;

  const svgChord = d3
    .select(`.right-panel ${selector}`)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'svg-chord');

  const chord = d3
    .chord()
    .padAngle(0.05)
    .sortSubgroups(d3.descending);

  const arc = d3
    .arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

  const ribbon = d3.ribbon().radius(innerRadius);

  const color = d3
    .scaleLinear()
    .domain([0, 1, 2, 3, 4])
    .range(['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00']);

  function getColor(index) {
    return d3.rgb(color(index));
  }

  const g = svgChord
    .append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`)
    .datum(chord(matrix));

  const groups = g
    .append('g')
    .attr('class', 'groups clickable')
    .selectAll('g')
    .data(chords => chords.groups)
    .enter()
    .append('g');

  groups
    .append('path')
    .style('fill-opacity', '0.7')
    .style('fill', d => getColor(d.index))
    .style('stroke', 'none')
    .attr('id', d => `arc${d.index}`)
    .attr('d', arc)
    .on('mouseover', (d, i) => {
      d3
        .select(`#arc${d.index}`)
        .transition()
        .duration(300)
        .style('fill-opacity', '1');
    })
    .on('mouseout', (d, i) => {
      d3
        .select(`#arc${d.index}`)
        .transition()
        .duration(300)
        .style('fill-opacity', '0.7');
    })
    .on('click', d => viz.asyncSelectLanguage(isocodes[d.index]))
    .append('title')
    .text(d => `${languagesCoo[isocodes[d.index]].name}`);

  function getXY(d, cosOrSin) {
    return innerRadius * cosOrSin((d.startAngle + d.endAngle) / 2 - Math.PI / 2);
  }

  g
    .append('g')
    .attr('class', 'ribbons clickable')
    .selectAll('path')
    .data(chords => chords)
    .enter()
    .append('path')
    .attr('d', ribbon)
    .style('fill-opacity', '0.7')
    .style('fill', d => getColor(d.target.index))
    .style('stroke', 'none')
    .attr('id', d => `ribbon${d.source.index}-${d.target.index}`)
    .on('mouseover', (d, i) => {
      d3
        .select(`#ribbon${d.source.index}-${d.target.index}`)
        .transition()
        .duration(300)
        .style('fill-opacity', '1');
    })
    .on('mouseout', (d, i) => {
      d3
        .select(`#ribbon${d.source.index}-${d.target.index}`)
        .transition()
        .duration(300)
        .style('fill-opacity', '0.7');
    })
    .on('click', d => viz.asyncSelectLanguagePair(isocodes[d.source.index], isocodes[d.target.index]))
    .append('title')
    .text(d => `${languagesCoo[isocodes[d.target.index]].name} ↔ ${languagesCoo[isocodes[d.source.index]].name}`);

  groups
    .append('text')
    .attr('dy', '.35em')
    .attr(
      'transform',
      d =>
        `rotate(${(d.startAngle + d.endAngle) * 90 / Math.PI - 90})` +
        `translate(${outerRadius * 1.05})${d.startAngle + d.endAngle > 2 * Math.PI ? 'scale(-1)' : ''}`
    )
    .style('text-anchor', d => (d.startAngle + d.endAngle > 2 * Math.PI ? 'end' : null))
    .text(d => languagesCoo[isocodes[d.index]].name);
}

export { recreateChord };
