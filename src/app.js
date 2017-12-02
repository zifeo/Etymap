// @flow

import 'whatwg-fetch';
import 'babel-polyfill';

import $ from 'jquery';
import * as d3 from 'd3';

//import './semantic.min';


var dummyData = {
  "car" : {
    syn: ["automobile"],
    ant: ["radek"],
    hom: ["kapoue"],
    lang: ["eng", "fra", "deu", "lat"]
  },
  "automobile" : {
    syn: ["car"],
    ant: [],
    hom: ["kapoue"],
    lang: ["eng", "spa", "rus"]
  },
  "radek" : {
    syn: ["cringe"],
    ant: [],
    hom: [],
    lang: ["eng", "pol", "jpn"]
  },
  "kapoue" : {
    syn: [],
    ant: [],
    hom: ["car"],
    lang: ["eng", "fra", "jpn"]
  },
  "cringe" : {
    syn: ["radek"],
    ant: [],
    hom: [],
    lang: ["eng", "spa", "rus"]
  }
}


const geojson = require('./world.geo.json');

let width = $(window).width();
let height = $(window).height();

let maskID = 0;

const svg = d3.select("body")
  .append("svg")
  .attr("style", "background-color:#b7d2ff;")
  .call(d3.zoom()
    .scaleExtent([1 / 2, 8])
    .on("zoom", () => {
      g.attr("transform", d3.event.transform);
      defs.attr("transform", d3.event.transform);
    }));

const defs = svg.append("defs")
  .append("g")
  .attr("id", "defs");

const g = svg.append("g")
  .attr("id", "g");

const projection = d3.geoNaturalEarth1()
  .scale(100);

const geoPath = d3.geoPath().projection(projection);

const lineGenerator = d3.line()
  .curve(d3.curveCardinal);


g.selectAll("path")
  .data(geojson.features)
  .enter()
  .append("path")
  .attr("fill", "#ffe3b7")
  .attr("stroke-width", "0")
  .attr("d", geoPath)
  .attr("class", "mapPath");


let languagesCoo = {};
const allLanguages = [];
d3.csv("https://raw.githubusercontent.com/zifeo/Etymap/master/data/filtered_languages_coordinates.csv", (data) => { // FIXME don't know what path to use to load from the server
  data.forEach((d) => {
    if (d.longitude && d.latitude && isFinite(String(d.longitude)) && isFinite(String(d.latitude)) && d.isocode) {
      languagesCoo[d.isocode] = d;
      allLanguages.push(d);
    }
  });

  addAllLanguagesPoints();

  selectWord("car");
});

const languagesRelations = {};
d3.csv("https://raw.githubusercontent.com/zifeo/Etymap/master/data/relations.csv", (data) => { // FIXME still don't know what path to use to load from the server
  data.forEach((d) => {
    if (d.src_lang !== d.to_lang) {
      if (!languagesRelations[d.src_lang]) {
        languagesRelations[d.src_lang] = [];
      }
      languagesRelations[d.src_lang].push({"lang" : d.to_lang, "count" : d.count});
    }
  });
});

function addLine(isocodes, strokeWidth, color, strokeDasharray) {
  let positionsGeo = [];
  for (let i in isocodes) {
    const isocode = isocodes[i];
    positionsGeo.push([languagesCoo[isocode].longitude, languagesCoo[isocode].latitude]);
  }


  let path = g.append("path") //Path that goes through each language
    .data([positionsGeo])
    .attr('d', lineGenerator(positionsGeo.map(posGeo => projection(posGeo))))
    .attr("fill", "none")
    .attr("stroke", color)
    .attr("stroke-width", strokeWidth)
    .attr("stroke-dasharray", strokeDasharray)
    .attr("pointer-events", "none")
    .attr("class", "languagePath");

  //We clone the path to create a mask, to animate the original path
  const cloneID = "clone" + (maskID ++);

  const cloneMask = defs.append("mask")
    .attr("id", cloneID);

  let clone = path.node().cloneNode();
  clone.id = cloneID + "Path";
  $("#" + cloneID).append(clone);

  var length = Math.ceil(path.node().getTotalLength());

  //We animate the mask
  d3.select("#" + cloneID + "Path")
    .data([positionsGeo])
    .attr("class", "maskLanguagePath")
    .attr("stroke", "white")
    .attr("stroke-dasharray", length + ' ' + length)
    .attr("stroke-dashoffset", length)
    .transition()
    .duration(1000)
    .attr("stroke-dashoffset", 0);


  path.attr("mask", "url(#" + cloneID + ")")
}

function removeAllLines() {
  d3.selectAll(".languagePath").remove();
  d3.selectAll(".maskLanguagePath").remove();
}

function addAllLanguagesPoints() {
  g.selectAll("none") //Circles for each language
    .data(allLanguages)
    .enter()
    .append("circle")
    .attr("cx", (d) => projection([d.longitude, d.latitude])[0])
    .attr("cy", (d) => projection([d.longitude, d.latitude])[1])
    .attr("r", 2)
    .attr("fill", "black")
    .on("mouseover", function (d) {
      /*removeAllLines();
      //console.log(d.isocode)
      d3.selectautomobile

(this).transition()
        .duration("200")
        .attr("fill", "white")
        .attr("r", 4);

      if (d.isocode in languagesRelations) {
        for (var i in languagesRelations[d.isocode]) {
          var otherLang = languagesRelations[d.isocode][i].lang;
          if (otherLang in languagesCoo) {
            addLine([d.isocode, otherLang], 1 + Math.log(languagesRelations[d.isocode][i].count));
          }
        }
      }*/
    })
    .on("mouseout", function(d) { // function as this-context needed
      d3.select(this).transition()
        .duration("200")
        .attr("fill", "black")
        .attr("r", 2);
    });
}

function selectWord(word) {
  removeAllLines();
  $("#ui").html("");
  let html = "<p class='selected-word'>" + word + "</p>";

  const langCount = {};

  addLine(dummyData[word].lang, 1, "white", "");
  addToCount(langCount, dummyData[word].lang);

  html += "<p class='category'>Synonyms:</p>";
  for (let syn in dummyData[word].syn) {
    const synonym = dummyData[word].syn[syn];
    addLine(dummyData[synonym].lang, 1, "green", "2,2");
    html += "<p class='other-word' id='word-" + synonym + "'>" + synonym + "</p>";
    addToCount(langCount, dummyData[synonym].lang);
  }

  html += "<p class='category'>Antonyms:</p>";
  for (let ant in dummyData[word].ant) {
    const antonym = dummyData[word].ant[ant];
    addLine(dummyData[antonym].lang, 1, "red", "2,2");
    html += "<p class='other-word' id='word-" + antonym + "'>" + antonym + "</p>";
    addToCount(langCount, dummyData[antonym].lang);
  }

  html += "<p class='category'>Homonyms:</p>";
  for (let hom in dummyData[word].hom) {
    const homonym = dummyData[word].hom[hom];
    addLine(dummyData[homonym].lang, 1, "blue", "2,2");
    html += "<p class='other-word' id='word-" + homonym + "'>" + homonym + "</p>";
    addToCount(langCount, dummyData[homonym].lang);
  }
  
  g.selectAll("circle")
    .attr("fill-opacity", function(d) {
      if (!langCount[d.isocode]) 
        return 0;
      else
        return Math.min(langCount[d.isocode] / 2, 1);
    });

  $("#ui").html(html);

  $(".other-word").click(function() {selectWord(this.id.replace("word-", ""))});
}

function addToCount(langCount, langs) {
  for (let i in langs) {
    if (langCount[langs[i]]) {
      langCount[langs[i]] ++;
    }
    else {
      langCount[langs[i]] = 1;
    }
  }
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
    .attr("cx", (d) => projection([d.longitude, d.latitude])[0])
    .attr("cy", (d) => projection([d.longitude, d.latitude])[1]);

  g.selectAll(".languagePath")
    .attr('d', (positionsGeo) => lineGenerator(positionsGeo.map(posGeo => projection(posGeo))) );

  g.selectAll(".maskLanguagePath")
    .attr('d', (positionsGeo) => lineGenerator(positionsGeo.map(posGeo => projection(posGeo))) );
}