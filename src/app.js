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

const lineGenerator = d3.line()
  .curve(d3.curveCardinal);

g.selectAll("path")
  .data(geojson.map.features)
  .enter()
    .append("path")
    .attr("fill", "#ffe3b7")
    .attr("stroke-width", "0")
    .attr("d", geoPath)
    .attr("class", "mapPath");

let languagesCoo = {};
d3.csv("https://raw.githubusercontent.com/zifeo/Etymap/master/data/languages_coordinates.csv", function(data) { //don't know what path to use to load from the server
  data.forEach(function(d) {
    if (d.longitude && d.latitude && isFinite(String(d.longitude)) && isFinite(String(d.latitude)) && d.isocode) {
      languagesCoo[d.isocode] = d;
    }
  });

  addLine(['fra', 'deu', 'lat']);
});

function addLine(isocodes) {
  let positionsGeo = [];
  for (let i in isocodes) {
    const isocode = isocodes[i];
    positionsGeo.push([languagesCoo[isocode].longitude, languagesCoo[isocode].latitude]);
  }

  g.selectAll("circle")
  .data(positionsGeo)
  .enter()
    .append("circle")
      .attr("cx", function(posGeo) {return projection(posGeo)[0]})
      .attr("cy", function(posGeo) {return projection(posGeo)[1]})
      .attr("r", 2);


  g.append("path")
    .data([positionsGeo])
    .attr('d', lineGenerator(positionsGeo.map(posGeo => projection(posGeo))))
    .attr("fill-opacity", 0)
    .attr("stroke", "black")
    .attr("class", "languagePath");
}

rescale();

$(window).resize(rescale);

function rescale() {
  width = $(window).width();
  height = $(window).height();

  projection
    .scale(width/7)
    .translate([width/2,height/2]);

  g.selectAll(".mapPath")
    .attr("d", geoPath);

  g.selectAll("circle")
    .attr("cx", function(posGeo) {return projection(posGeo)[0]})
    .attr("cy", function(posGeo) {return projection(posGeo)[1]});

  g.selectAll(".languagePath")
    .attr('d', function(positionsGeo) { return lineGenerator(positionsGeo.map(posGeo => projection(posGeo))) });
}