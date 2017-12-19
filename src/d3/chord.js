// @flow

import $ from 'jquery';
import * as d3 from 'd3';
import { langNetwork } from '../json/data';

const languagesCoo = langNetwork.locations;

function recreateChord(viz, matrix, isocodes, selectedLanguageIndex) {
  const width = $(`.right-panel .language-panel`).width() * 0.8;
  const height = width * 1.2;

  const outerRadius = width / 2.5;
  const innerRadius = width / 3;

  d3.selectAll('.svg-chord').remove();

  const svgChord = d3
    .select(`.right-panel .svg-chord-container`)
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
    .domain([0, isocodes.length - 1])
    .range(['#76B5DE', '#075486']);

  function getColor(index) {
    return index === selectedLanguageIndex ? 'red' : d3.rgb(color(index));
  }

  const g = svgChord
    .append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`)
    .datum(chord(matrix));

  const groups = g
    .append('g')
    .attr('class', 'groups')
    .selectAll('g')
    .data(chords => chords.groups)
    .enter()
    .append('g');

  groups
    .append('path')
    .style('fill-opacity', '0.7')
    .style('fill', d => getColor(d.index))
    .style('stroke', 'black')
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
    .on('click', d => viz.asyncSelectLanguage(isocodes[d.index]));

  function getXY(d, cosOrSin) {
    return innerRadius * cosOrSin((d.startAngle + d.endAngle) / 2 - Math.PI / 2);
  }

  const gradients = svgChord
    .append('defs')
    .selectAll('linearGradient')
    .data(chord(matrix))
    .enter()
    .append('linearGradient')
    .attr('id', d => `gradient${d.source.index}-${d.target.index}`)
    .attr('gradientUnits', 'userSpaceOnUse')
    .attr('x1', d => getXY(d.source, Math.cos))
    .attr('y1', d => getXY(d.source, Math.sin))
    .attr('x2', d => getXY(d.target, Math.cos))
    .attr('y2', d => getXY(d.target, Math.sin));

  gradients
    .append('stop')
    .attr('offset', '0%')
    .attr('stop-color', d => getColor(d.source.index));

  gradients
    .append('stop')
    .attr('offset', '100%')
    .attr('stop-color', d => getColor(d.target.index));

  g
    .append('g')
    .attr('class', 'ribbons')
    .selectAll('path')
    .data(chords => chords)
    .enter()
    .append('path')
    .attr('d', ribbon)
    .style('fill-opacity', '0.7')
    .style('fill', d => `url(#gradient${d.source.index}-${d.target.index})`)
    .style('stroke', 'black')
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
    .on('click', d => viz.asyncSelectLanguagePair(isocodes[d.source.index], isocodes[d.target.index]));

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
