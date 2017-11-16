// @flow

import 'whatwg-fetch';
import 'babel-polyfill';
import $ from 'jquery';
import * as d3 from 'd3';


const geojson = require('./world.geo');

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

let languagesCoo = [];
d3.csv("https://raw.githubusercontent.com/zifeo/Etymap/master/data/languages_coordinates.csv", function(data) { //don't know what path to use to load from the server
  data.forEach(function(d) {
    if (d.longitude && d.latitude && isFinite(String(d.longitude)) && isFinite(String(d.latitude))) {
      languagesCoo.push(d);
    }
  });

  g.selectAll("circle")
  .data(languagesCoo)
  .enter()
    .append("circle")
    .attr("cx", function(datum) {return projection([datum.longitude, datum.latitude])[0]})
    .attr("cy", function(datum) {return projection([datum.longitude, datum.latitude])[1]})
    .attr("r", 2)
    .on("mouseover", function(datum) {console.log(datum.name)});
});
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

  g.selectAll("circle")
    .attr("cx", function(datum) {return projection([datum.longitude, datum.latitude])[0]})
    .attr("cy", function(datum) {return projection([datum.longitude, datum.latitude])[1]});
}