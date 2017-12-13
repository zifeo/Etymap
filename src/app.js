// @flow

import 'whatwg-fetch';
import 'babel-polyfill';

import $ from 'jquery';
import * as d3 from 'd3';
import _ from 'lodash';
import Api from './api';

(() => {
  // dirty hack avoiding babel to reorganise imports
  // semantic require window.jQuery to set
  window.jQuery = $;
  global.jQuery = $;
  require('semantic-ui-dist/dist/semantic.min'); // eslint-disable-line
})();

type WordInfo = {
  syn: Array<string>,
  ant: Array<string>,
  hom: Array<string>,
  lang: Array<string>,
};

function getDummyDataFor(word: string): Promise<WordInfo> {
  fetch(word);
}

const dummyData = {
  car: {
    syn: ['automobile'],
    ant: ['radek'],
    hom: ['kapoue'],
    lang: ['eng', 'fra', 'deu', 'lat'],
  },
  automobile: {
    syn: ['car'],
    ant: [],
    hom: ['kapoue'],
    lang: ['eng', 'spa', 'rus'],
  },
  radek: {
    syn: ['cringe'],
    ant: [],
    hom: [],
    lang: ['eng', 'pol', 'jpn'],
  },
  kapoue: {
    syn: ['radek'],
    ant: [],
    hom: ['car'],
    lang: ['eng', 'fra', 'jpn'],
  },
  cringe: {
    syn: ['radek'],
    ant: [],
    hom: [],
    lang: ['eng', 'spa', 'rus'],
  },
};

const languagesCoo = {};
const allLanguages = [];

d3.csv('https://raw.githubusercontent.com/zifeo/Etymap/master/data/filtered_languages_coordinates.csv', data => {
  // FIXME don't know what path to use to load from the server
  data.forEach(d => {
    if (d.longitude && d.latitude && isFinite(String(d.longitude)) && isFinite(String(d.latitude)) && d.isocode) {
      languagesCoo[d.isocode] = d;
      allLanguages.push(d);
    }
  });

  allVisu.forEach(v => v.addAllLanguagesPoints());
});

const languagesRelations = {};

d3.csv('https://raw.githubusercontent.com/zifeo/Etymap/master/data/relations.csv', data => {
  // FIXME still don't know what path to use to load from the server
  data.forEach(d => {
    if (d.src_lang !== d.to_lang) {
      if (!languagesRelations[d.src_lang]) {
        languagesRelations[d.src_lang] = [];
      }
      languagesRelations[d.src_lang].push({ lang: d.to_lang, count: d.count });
    }
  });
});

const geojson = require('./world.geo.json');

const lineGenerator = d3.line().curve(d3.curveCardinal);
const lineGeneratorAlluvial = d3.line().curve(d3.curveMonotoneX);

class Visu {
  constructor(parentSelector) {
    this.parentSelector = parentSelector;

    this.setUpSVG();
    this.addGeoJson();

    this.hideRightPanel();

    this.setupSearch();
  }

  setUpSVG() {
    this.svg = d3.select(this.parentSelector)
      .append('svg')
      .style('background-color', 'black')
      .attr('class', 'main-map');

    this.g = this.svg.append('g')
      .attr('id', 'g');

    this.zoom = d3.zoom()
      .scaleExtent([0.01, 16])
      .on('zoom', () => this.g.attr('transform', d3.event.transform));

    this.svg
      .call(this.zoom)
  }

  addGeoJson() {
    this.projection = d3.geoNaturalEarth1()
      .scale(this.width/7)
      .translate([this.width / 2, this.height / 2]);

    this.geoPath = d3.geoPath().projection(this.projection);

    this.g
      .selectAll('path')
      .data(geojson.features)
      .enter()
        .append('path')
        .attr('fill', '#DDD')
        .attr('stroke', '#DDD')
        .attr('stroke-width', '0')
        .attr('d', this.geoPath)
        .attr('class', 'mapPath');
  }

  setupSearch() {
  	$('.search').search({
  	  apiSettings: {
  	    url: '/search/word/{query}',
  	  },
      fields: {
        description: 'lang',
        title: 'word',
      },
  	  cache: false,
  	  minCharacters: 2,
  	  onSelect: async (result, response) => {
  	    this.asyncSelectWord(result['word'], result['lang']);
  	  }
	  });
  }

  get width() {
    return $(this.svg.node()).width();
  }

  get height() {
    return $(this.svg.node()).height();
  }

  addAllLanguagesPoints() {
    this.g
      .selectAll('none')
      .data(allLanguages)
      .enter()
        .append('circle')
        .attr('cx', d => this.projection([d.longitude, d.latitude])[0])
        .attr('cy', d => this.projection([d.longitude, d.latitude])[1])
        .attr('r', 2)
        .attr('fill', 'white')
        .attr('id', d => `circle-${d.isocode}`)
        //.on('mouseover', d => this.selectLanguage(d.isocode))
        .on('click', d => this.selectLanguage(d.isocode));
  }

  addLine(isocodes, strokeWidth, color, opacity, clickFct) {
    const positionsGeo = isocodes.map(isocode => [languagesCoo[isocode].longitude, languagesCoo[isocode].latitude]);

    const path = this.g
      .append('path') // Path that goes through each language
      .datum(positionsGeo)
      .attr('d', lineGenerator(positionsGeo.map(posGeo => this.projection(posGeo))))
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-opacity', opacity)
      .attr('stroke-width', strokeWidth)
      .attr('class', 'languagePath');

    if (clickFct) {
      path.on('click', clickFct);
    }
      
    const length = Math.ceil(path.node().getTotalLength());

    path.attr('stroke-dasharray', `${length} ${length}`)
      .attr('stroke-dashoffset', length)
      .transition()
      .duration(1000) // We animate the path
      .attr('stroke-dashoffset', 0);
  }

  focusOn(isocodes) {
    if (isocodes.length < 2)
      return;
    
    const positions = isocodes.map(isocode => this.projection([languagesCoo[isocode].longitude, languagesCoo[isocode].latitude]));

    const minX = Math.min(...positions.map(p => p[0]));
    const maxX = Math.max(...positions.map(p => p[0]));
    const minY = Math.min(...positions.map(p => p[1]));
    const maxY = Math.max(...positions.map(p => p[1]));

    const boundingWidth = maxX - minX;
    const boundingHeight = maxY - minY;

    const scale = 1 / Math.max(boundingWidth / (0.95 * this.width), boundingHeight / (0.95 * this.height));
    const translateX = this.width / 2 - scale * (maxX + minX) / 2;
    const translateY = this.height / 2 - scale * (maxY + minY) / 2;

    this.svg.transition()
      .duration(1000)
      .call(this.zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
  }

  removeAllLines() {
    this.g.selectAll('.languagePath').remove();
  }

  /*Single Language*/

  selectLanguage(isocode) {
    this.addLanguageLines(isocode);
    this.setRightPanelInfoLanguage(isocode);
  }

  addLanguageLines(isocode) {
    if (!(isocode in languagesRelations))
      return;

    this.removeAllLines();

    let allIsocodesRelated = [isocode];
    languagesRelations[isocode].forEach(rel => {
      const otherLang = rel.lang;
      if (otherLang in languagesCoo) {
        allIsocodesRelated.push(otherLang);
        this.addLine([isocode, otherLang], 1 + Math.log(rel.count), 'white', 0.5, () => this.selectLanguagePair(isocode, otherLang));
      }
    });

    if (allIsocodesRelated.length > 1) {
      this.focusOn(allIsocodesRelated);
    }
  }

  /*Language pair*/

  selectLanguagePair(iso1, iso2) {
    this.addLanguagePairLines(iso1, iso2);
    this.focusOn([iso1, iso2]);
    this.setRightPanelInfoLanguagePair(iso1, iso2);
  }

  addLanguagePairLines(iso1, iso2) {
    if (!(iso1 in languagesRelations) || !(iso2 in languagesRelations))
      return;

    this.removeAllLines();

    const filteredRelations = languagesRelations[iso1].filter(rel => rel.lang === iso2);

    if (filteredRelations.length === 0)
      return;

    const count = filteredRelations[0].count;
    this.addLine([iso1, iso2], 1 + Math.log(count), 'white', 0.7);
  }

  /*Single word*/

  async asyncSelectWord(word, lang) {
    const info = await Api.getWordData(word, lang);
    this.selectWord(info);
  }

  selectWord(wordInfo) {
    this.addWordLines(wordInfo);
    this.setRightPanelInfoWord(wordInfo);
  }

  addWordLines(wordInfo) {
    this.removeAllLines();

    const allIso = new Set([wordInfo.lang]);
    for (const i in wordInfo.parents) {
      this.recursiveAddWordLines(allIso, [wordInfo.lang], wordInfo.parents[i]);
    }
    
    //const allIso = [];
    //const wordLang = wordInfo.lang.map(d => d[0]).filter(iso => languagesCoo[iso]); //TODO Add all languages (eg: old french is missing in coordinates)
    //this.addLine(wordLang, 2, 'white', 1);
    //wordLang.forEach(iso => allIso.push(iso));

    /*wordInfo.syn.forEach(w => {
      this.addLine(dummyData[w].lang, 1, 'blue', 0.7);
      dummyData[w].lang.forEach(iso => allIso.push(iso));
    });

    dummyData[word].ant.forEach(w => {
      this.addLine(dummyData[w].lang, 1, 'red', 0.7);
      dummyData[w].lang.forEach(iso => allIso.push(iso));
    });

    dummyData[word].hom.forEach(w => {
      this.addLine(dummyData[w].lang, 1, 'green', 0.7);
      dummyData[w].lang.forEach(iso => allIso.push(iso));
    });*/

    this.focusOn(Array.from(allIso));
  }

  recursiveAddWordLines(allIso, previousLangs, obj) {
    let lang = obj[0][0];
    const word = obj[0][1];
    const parents = obj[1];

    if (!(lang in languagesCoo)) {
      lang = 'por'; //temporary, only for testing
    }

    const previousLangsCopy = previousLangs.slice(0);
    previousLangsCopy.push(lang);

    allIso.add(lang);

    if (parents.length === 0) { //no more ancestors
      this.addLine(previousLangsCopy, 2, 'white', 1);
    }
    for (const i in parents) {
      this.recursiveAddWordLines(allIso, previousLangsCopy, parents[i]);
    }
  }

  /*Right Panel*/

  hideRightPanel() {
    $(`${this.parentSelector} .right-panel`).hide();
  }

  showRightPanel() {
    $(`${this.parentSelector} .right-panel`).show();
  }

  hideAllRightSubpanels() {
    $(`${this.parentSelector} .language-panel`).hide();
    $(`${this.parentSelector} .language-pair-panel`).hide();
    $(`${this.parentSelector} .word-panel`).hide();
  }

  setRightPanelInfoLanguage(isocode) {
    this.hideAllRightSubpanels();
    $(`${this.parentSelector} .language-panel`).show();

    $(`${this.parentSelector} .right-panel .notTemplate`).remove();

    $(`${this.parentSelector} .panel-title`).html(languagesCoo[isocode].name); //Title

    const sampleTemplate = $(`${this.parentSelector} .sample-panel .template`);

    ["kapoue", "test", "radek"].forEach(word => {
      const clone = cloneTemplate(sampleTemplate);

      clone.find('.word-button').html(word);
      //clone.find('.word-button').click(() => this.selectWord(word));

      $(`${this.parentSelector} .sample-panel`).append(clone);
    });

    const influenceTemplate = $(`${this.parentSelector} .influence-from-panel .template`); //Influences
    ["English", "French"].forEach(lang => {
      const clone = cloneTemplate(influenceTemplate);

      clone.find('.lang-button').html(lang);
      clone.find('.lang-button').click(() => this.selectLang(lang));

      $(`${this.parentSelector} .influence-from-panel`).append(clone);
    });

    ["Spanish", "Portuguese"].forEach(lang => {
      const clone = cloneTemplate(influenceTemplate);

      clone.find('.lang-button').html(lang);
      clone.find('.lang-button').click(() => this.selectLang(lang));

      $(`${this.parentSelector} .influence-to-panel`).append(clone);
    });

    $(`${this.parentSelector} .svg-chord-container .panel-title`).html('Other languages')

    //Template for chord Diagram

    const matrixRelations = [
      [0,  1951, 3010, 1013],
      [1951, 0, 4145, 990],
      [3010, 4145, 0, 940],
      [1013,   990,  940, 0]
    ];  //temporary

    const isocodes = ['fra', 'eng', 'spa', 'por'];  //temporary

    this.showRightPanel();

    const width = $(`${this.parentSelector} .language-panel`).width() * 0.8;
    const height = width * 1.2;

    const outerRadius = width / 2.5;
    const innerRadius = width / 3;

    d3.selectAll('.svg-chord').remove();

    const svgChord = d3.select(`${this.parentSelector} .svg-chord-container`)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'svg-chord');
    
    const chord = d3.chord()
     .padAngle(0.05)
     .sortSubgroups(d3.descending);

    const arc = d3.arc()
     .innerRadius(innerRadius)
     .outerRadius(outerRadius);

    const ribbon = d3.ribbon()
     .radius(innerRadius);

    const color = d3.scaleLinear()
     .domain([0, isocodes.length-1])
     .range(['#76B5DE', '#075486']);

    const selectedLanguageIndex = 1; //temporary

    function getColor(index) {
      return index === selectedLanguageIndex ? 'red' : d3.rgb(color(index));
    }

    const g = svgChord.append('g')
     .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')')
     .datum(chord(matrixRelations));

    const groups = g.append('g')
     .attr('class', 'groups')
     .selectAll('g')
     .data(chords => chords.groups)
      .enter().append('g');

    groups.append('path')
     .style('fill-opacity', '0.7')
     .style('fill', d => getColor(d.index))
     .style('stroke', 'black')
     .attr('id', d => `arc${d.index}`)
     .attr('d', arc)
     .on('mouseover', (d, i) => {
          d3.select(`#arc${d.index}`)
            .transition()
             .duration(300)
             .style('fill-opacity', '1')
        })
       .on('mouseout', (d, i) => {
          d3.select(`#arc${d.index}`)
            .transition()
             .duration(300)
             .style('fill-opacity', '0.7')
        })
       .on('click', d => this.selectLanguage(isocodes[d.index]));

    function getXY(d, cosOrSin) {
      return innerRadius * cosOrSin((d.startAngle + d.endAngle) / 2 - Math.PI / 2);
    }

    const gradients = svgChord.append('defs')
     .selectAll('linearGradient')
     .data(chord(matrixRelations))
     .enter()
      .append('linearGradient')
      .attr('id', d => `gradient${d.source.index}-${d.target.index}`)
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', d => getXY(d.source, Math.cos))
      .attr('y1', d => getXY(d.source, Math.sin))
      .attr('x2', d => getXY(d.target, Math.cos))
      .attr('y2', d => getXY(d.target, Math.sin))

    gradients.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', d => getColor(d.source.index))

    gradients.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', d => getColor(d.target.index))

    g.append('g')
     .attr('class', 'ribbons')
     .selectAll('path')
     .data(chords => chords)
      .enter().append('path')
       .attr('d', ribbon)
       .style('fill-opacity', '0.7')
       .style('fill', d => `url(#gradient${d.source.index}-${d.target.index})`)
       .style('stroke', 'black')
       .attr('id', d => `ribbon${d.source.index}-${d.target.index}`)
       .on('mouseover', (d, i) => {
          d3.select(`#ribbon${d.source.index}-${d.target.index}`)
            .transition()
             .duration(300)
             .style('fill-opacity', '1')
        })
       .on('mouseout', (d, i) => {
          d3.select(`#ribbon${d.source.index}-${d.target.index}`)
            .transition()
             .duration(300)
             .style('fill-opacity', '0.7')
        })
       .on('click', d => this.selectLanguagePair(isocodes[d.source.index], isocodes[d.target.index]));

    groups.append("text")
     .attr("dy", ".35em")
     .attr("transform", d => { return "rotate(" + ((d.startAngle + d.endAngle) * 90 / Math.PI - 90) + ")"
            + "translate(" + (outerRadius * 1.05) + ")"
            + ((d.startAngle + d.endAngle) > 2 * Math.PI ? "scale(-1)" : "");
     })
     .style("text-anchor", d => (d.startAngle + d.endAngle) > 2 * Math.PI ? "end" : null)
     .text(d => languagesCoo[isocodes[d.index]].name);
  }

  setRightPanelInfoLanguagePair(iso1, iso2) {
    this.hideAllRightSubpanels();
    $(`${this.parentSelector} .language-pair-panel`).show();

    $(`${this.parentSelector} .right-panel .notTemplate`).remove();

    this.setRightPanelInfoLanguagePairTitle(iso1, iso2, '.first-direction .title');
    this.setRightPanelInfoLanguagePairTitle(iso2, iso1, '.second-direction .title');

    this.setRightPanelInfoLanguagePairStats(iso1, iso2, '.first-direction .stats');
    this.setRightPanelInfoLanguagePairStats(iso2, iso1, '.second-direction .stats');

    this.setRightPanelInfoLanguagePairSample(iso1, iso2, '.first-direction .samples');
    this.setRightPanelInfoLanguagePairSample(iso2, iso1, '.second-direction .samples');

    d3.selectAll('.svg-alluvial').remove();

    this.setRightPanelInfoLanguagePairDiagram(iso1, '.first-direction .svg-container');
    this.setRightPanelInfoLanguagePairDiagram(iso2, '.second-direction .svg-container');

    this.showRightPanel();
  }

  setRightPanelInfoLanguagePairTitle(from, to, selector) {
    $(`${this.parentSelector} ${selector} .panel-title`).html(`From ${languagesCoo[from].name} to ${languagesCoo[to].name}`); //Title

    $(`${this.parentSelector} ${selector} .language-button`).html(languagesCoo[from].name);
    $(`${this.parentSelector} ${selector} .language-button`).click(() => this.selectLanguage(from));
  }

  setRightPanelInfoLanguagePairStats(from, to, selector) {
    $(`${this.parentSelector} ${selector} .panel-title`).html('Stats'); //Title

    $(`${this.parentSelector} ${selector} .absolute`).html(`${123} words come from ${languagesCoo[from].name} to ${languagesCoo[to].name}.`);
    $(`${this.parentSelector} ${selector} .proportion`).html(`That is ${53.2} % of ${languagesCoo[to].name}'s words.`);
  }

  setRightPanelInfoLanguagePairSample(from, to, selector) {
    $(`${this.parentSelector} ${selector} .panel-title`).html('Sample words'); //Title

    const template = $(`${this.parentSelector} ${selector} .template`); //Word button

    ['Kapoue', 'Radek', 'Cringe'].forEach(word => {
      const clone = cloneTemplate(template);

      clone.find('.word-button').html(word);
      //clone.find('.word-button').click(() => this.asyncSelectWord(word, lang));

      $(`${this.parentSelector} ${selector} .segments`).append(clone);
    });
  }

  setRightPanelInfoLanguagePairDiagram(from, selector) {
    $(`${this.parentSelector} ${selector} .panel-title`).html(`Other relations for ${languagesCoo[from].name}`); //Title

    //Template for alluvial Diagram

    const dataFrom = [0.1, 0.3, 0.6];
    const isocodesFrom = ['fra', 'eng', 'por'];
    const dataTo = [0.2, 0.2, 0.3, 0.2, 0.1];
    const isocodesTo = ['fra', 'eng', 'por', 'eng', 'por'];

    const width = $(`${this.parentSelector} ${selector} `).width() * 0.8;
    const height = width;

    const nodeWidth = width / 10;
    const margin = 0.05;

    const dataFromCum = [];
    let curr = 0;
    for (const i in dataFrom) {
      dataFromCum.push(curr);
      curr += dataFrom[i];
    }
    const fromCumSum = 1 + margin * (dataFrom.length-1);

    const dataToCum = [];
    curr = 0;
    for (const i in dataTo) {
      dataToCum.push(curr);
      curr += dataTo[i];
    }
    const toCumSum = 1 + margin * (dataTo.length-1);

    const maxSum = Math.max(fromCumSum, toCumSum);

    const svgAlluvial = d3.select(`${this.parentSelector} ${selector}`)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'svg-alluvial');

    const gPaths = svgAlluvial.append('g');
    const gNodes = svgAlluvial.append('g');

    const gFrom = gNodes.append('g');

    const gTo = gNodes.append('g')
      .attr('transform', 'translate(' + (width - nodeWidth) + ')');

    //Nodes & text
    function addNodes(data, dataCum, isocodes, group, isFrom, visu) {
      const baseID = isFrom ? 0 : 1;
      group.selectAll('none')
       .data(dataCum)
       .enter()
        .append('rect')
        .attr('fill', 'black')
        .attr('width', nodeWidth)
        .attr('height', (d, i) => data[i] * height / maxSum)
        .attr('y', (d, i) => (d + i * margin) * height / maxSum)
        .attr('class', (d, i) => `node-${baseID}-${i}`)
        .on('mouseover', (d, i) => {
          d3.select(`${selector} .node-${baseID}-${i}`)
            .transition()
             .duration(300)
             .attr('fill', '#F66')
        })
        .on('mouseout', (d, i) => {
          d3.select(`${selector} .node-${baseID}-${i}`)
            .transition()
             .duration(300)
             .attr('fill', 'black')
        })
        .on('click', (d, i) => {
          visu.selectLanguage(isocodes[i]);
        });

     group.selectAll('none')
       .data(isocodes)
       .enter()
        .append('text')
        .attr('fill', 'steelblue')
        .attr('x', isFrom ? nodeWidth + 5 : -5)
        .attr('y', (d, i) => (dataCum[i] + data[i] / 2 + i * margin) * height / maxSum + 5)
        .attr('text-anchor', isFrom ? 'start' : 'end')
        .text(d => languagesCoo[d].name);
    }

    addNodes(dataFrom, dataFromCum, isocodesFrom, gFrom, true, this);
    addNodes(dataTo, dataToCum, isocodesTo, gTo, false, this);


    gNodes.append('rect') //Central node
      .attr('width', nodeWidth)
      .attr('height', height / maxSum)
      .attr('x', width/2 - nodeWidth/2)
      .attr('y', 0);

    //Links
    const fromPaths = [];
    for (const i in dataFrom) {
      const newPath = [];
      newPath.push([0, (dataFromCum[i] + i * margin + dataFrom[i] / 2) * height / maxSum]);
      newPath.push([nodeWidth, (dataFromCum[i] + i * margin + dataFrom[i] / 2) * height / maxSum]);
      newPath.push([width/2 - nodeWidth/2, (dataFromCum[i] + dataFrom[i] / 2) * height / maxSum]);
      newPath.push([width/2 + nodeWidth/2, (dataFromCum[i] + dataFrom[i] / 2) * height / maxSum]);
      fromPaths.push(newPath);
    }

    const toPaths = [];
    for (const i in dataTo) {
      const newPath = [];
      newPath.push([width/2 - nodeWidth/2, (dataToCum[i] + dataTo[i] / 2) * height / maxSum]);
      newPath.push([width/2 + nodeWidth/2, (dataToCum[i] + dataTo[i] / 2) * height / maxSum]);
      newPath.push([width - nodeWidth, (dataToCum[i] + i * margin + dataTo[i] / 2) * height / maxSum]);
      newPath.push([width, (dataToCum[i] + i * margin + dataTo[i] / 2) * height / maxSum]);
      toPaths.push(newPath);
    }

    function addPaths(paths, data, isocodes, visu, isFrom) {
      const baseID = isFrom ? 0 : 1;
      gPaths.selectAll('none')
       .data(paths)
       .enter()
        .append('path')
        .attr('fill', 'none')
        .attr('stroke', '#666')
        .attr('stroke-opacity', 0.5)
        .attr('stroke-width', (d, i) => data[i] * height / maxSum)
        .attr('d', lineGeneratorAlluvial)
        .attr('class', (d, i) => `path-${baseID}-${i}`)
        .on('mouseover', (d, i) => {
          d3.select(`${selector} .path-${baseID}-${i}`)
            .transition()
             .duration(300)
             .attr('stroke', 'red')
        })
        .on('mouseout', (d, i) => {
          d3.select(`${selector} .path-${baseID}-${i}`)
            .transition()
             .duration(300)
             .attr('stroke', '#666')
        })
        .on('click', (d, i) => {
          if (isFrom) {
            visu.selectLanguagePair(from, isocodes[i]);
          }
          else {
            visu.selectLanguagePair(isocodes[i], from);
          }
        });
    }

    addPaths(fromPaths, dataFrom, isocodesFrom, this, true);
    addPaths(toPaths, dataTo, isocodesTo, this, false);
  }

  setRightPanelInfoWord(wordInfo) {
    this.hideAllRightSubpanels();
    $(`${this.parentSelector} .word-panel`).show();

    $(`${this.parentSelector} .right-panel .notTemplate`).remove();

    $(`${this.parentSelector} .panel-title`).html(wordInfo.word); //Title

    const buttonTemplate = $(`${this.parentSelector} .languages-button-panel .template`); //Languages button
    buttonTemplate.hide();

    const clone = cloneTemplate(buttonTemplate);

    clone.html(languagesCoo[wordInfo.lang].name);
    clone.click(() => this.selectLanguage(wordInfo.lang));

    $(`${this.parentSelector} .languages-button`).append(clone);


    const wordTemplate = $(`${this.parentSelector} .synonyms-panel .template`);

    this.addToWordsPanel(wordInfo.synonyms, 'synonyms-panel', wordTemplate);
    /*this.addToWordsPanel(dummyData[word].ant, 'antonyms-panel', wordTemplate);
    this.addToWordsPanel(dummyData[word].hom, 'homonyms-panel', wordTemplate);*/

    this.showRightPanel();
  }

  addToWordsPanel(list, panelClass, wordTemplate) {
    list.forEach(pair => {
      const lang = pair[0];
      const word = pair[1];

      const clone = cloneTemplate(wordTemplate);

      clone.find('.word-button').html(word);
      clone.find('.word-button').click(() => this.asyncSelectWord(word, lang));

      clone.find('.lang-button').html(languagesCoo[lang] ? languagesCoo[lang].name : lang);
      clone.find('.lang-button').click(() => this.selectLanguage(lang));

      $(`${this.parentSelector} .${panelClass}`).append(clone);


    });
  }
}

const allVisu = [new Visu("#viz")];

function cloneTemplate(element) {
  const clone = element.clone();
  clone.removeClass('template');
  clone.addClass('notTemplate');
  clone.show();

  return clone;
}