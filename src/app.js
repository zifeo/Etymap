// @flow

import 'whatwg-fetch';
import 'babel-polyfill';
import $ from 'jquery';
import * as d3 from 'd3';


const geojson = require('./world.geo');

const onReload = module.onReload || (() => {});
onReload(() => {
  // eslint-disable-next-line
  console.info('hot reloading');
  d3.select('#map').remove();
});

let width = $(window).width();
let height = $(window).height();

const svg = d3.select("body")
  .append("svg")
  .attr("style", "background-color:#b7d2ff;")
  .call(d3.zoom()
    .scaleExtent([1 / 2, 8])
    .on("zoom", function() {g.attr("transform", d3.event.transform); }));

const g = svg.append("g");

const projection = d3.geoNaturalEarth1()
    .scale(100);

const geoPath = d3.geoPath().projection(projection);

g.selectAll("path")
  .data(geojson.map.features)
  .enter()
    .append("path")
    .attr("fill", "#ffe3b7")
    .attr("stroke-width", "0")
    .attr("d", geoPath);

rescale();

$(window).resize(rescale);

function rescale() {
  width = $(window).width();
  height = $(window).height();

  projection
    .scale(width/7)
    .translate([width/2,height/2]);

  g.selectAll("path")
    .attr("d", geoPath);
}