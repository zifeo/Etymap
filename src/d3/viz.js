// @flow

import * as d3 from 'd3';
import $ from 'jquery';
import _ from 'lodash';
import Api from '../api';
import { geojson, langNetwork, allLanguages} from '../json/data';
import { cloneTemplate, openPanel } from '../utils';
import { recreateChord } from './chord';
import { recreateAlluvial } from './alluvial';
import { recreateEtymology } from './etymology';

const languagesCoo = langNetwork.locations;

const lineGenerator = d3.line().curve(d3.curveCardinal);

const vizMode = {
  None: 0,
  Language: 1,
  Pair: 2,
  Word: 3
}

class Viz {
  constructor(parentSelector) {
    this.parentSelector = parentSelector;
  }

  show() {
    this.mode = vizMode.None;
    this.selectedIsocodes = [];

    this.setUpSVG();
    this.addGeoJson();
    this.addAllLanguagesPoints();
  }

  setUpSVG() {
    this.svg = d3
      .select(this.parentSelector)
      .append('svg')
      .style('background-color', '#a4c0d1')
      .attr('class', 'main-map');

    this.g = this.svg.append('g').attr('id', 'g');
    this.gMap = this.g.append('g');
    this.gPath = this.g.append('g');

    this.scale = 1;

    this.zoom = d3
      .zoom()
      .translateExtent([[0, 0],[2000, 1000]]) 
      .scaleExtent([1, 30])
      .on('zoom', () => {
        this.g.attr('transform', d3.event.transform)
        this.scale = d3.event.transform.k;

        this.updateScaleAndOpacity();
        this.checkCollisions();
      });


    this.svg.call(this.zoom)
      .on("dblclick.zoom", null);
  }

  addGeoJson() {
    this.projection = d3
      .geoNaturalEarth1()
      .scale(this.width / 7)
      .translate([this.width / 2, this.height / 2]);

    this.geoPath = d3.geoPath().projection(this.projection);

    this.gMap
      .selectAll('path')
      .data(geojson.features)
      .enter()
      .append('path')
      .attr('fill', '#DDD')
      .attr('stroke', '#DDD')
      .attr('stroke-width', '0')
      .attr('d', this.geoPath)
      .attr('class', 'mapPath')
      .attr('id', d => `country-${d.properties.iso_a3}`)
      .on('click', () => this.deselect());
  }

  updateScaleAndOpacity() {
    const scale = Math.pow(this.scale, 0.9);
    d3.selectAll(`${this.parentSelector} .gLanguage`)
      .attr('transform', `scale(${1/scale})`);

    if (this.mode !== vizMode.None)
      return;

    const opacityFactor = Math.pow(this.scale, 2);
    d3.selectAll(`${this.parentSelector} .gLanguage`)
      .attr('opacity', iso => opacityFactor * langNetwork.stats[iso].count / 1000000);
  }

  get width() {
    return $(this.svg.node()).width();
  }

  get height() {
    return $(this.svg.node()).height();
  }

  addAllLanguagesPoints() {
    const gCircle = this.g
      .selectAll('none')
      .data(allLanguages)
      .enter()
        .append('g')
        .attr('transform', iso => `translate(${this.projection([languagesCoo[iso].longitude, languagesCoo[iso].latitude])})`)
        .append('g')
        .attr('class', 'gLanguage')
        .attr('id', iso => `gLanguageCircle-${iso}`);

    const gText = this.g
      .selectAll('none')
      .data(allLanguages)
      .enter()
        .append('g')
        .attr('transform', iso => `translate(${this.projection([languagesCoo[iso].longitude, languagesCoo[iso].latitude])})`)
        .append('g')
        .attr('class', 'gLanguage')
        .attr('id', iso => `gLanguageText-${iso}`);

    gCircle.append('circle')
      .attr('r', 3)
      .attr('stroke-width', 0.7)
      .attr('fill', 'white')
      .attr('stroke', 'blue')
      .attr('class', 'languageCircle')
      .attr('style', 'cursor:pointer;')
      .attr('id', iso => `circle-${iso}`)
      .on('click', iso => this.asyncSelectLanguage(iso));

    gText.append('text')
      .attr('class', 'languageText')
      .text(iso => languagesCoo[iso].name)
      .attr('text-anchor', 'middle')
      .attr('dy', '-3px')
      .attr('style', 'cursor:pointer;')
      .attr('id', iso => `languageText-${iso}`)
      .on('click', iso => this.asyncSelectLanguage(iso));

    this.updateScaleAndOpacity();
  }

  addLine(isocodes, strokeWidth, color, opacity, clickFct) {
    if (isocodes.length > 2) {
      const first = isocodes.slice();
      first.shift();
      const second = isocodes.slice();
      second.pop();
      const zipped = _.zip(first, second);
      zipped.forEach(pair => this.addLine(pair, strokeWidth, color, opacity, clickFct));
      return;
    }

    const positionsGeo = isocodes.map(isocode => [languagesCoo[isocode].longitude, languagesCoo[isocode].latitude]);

    const positionsGeoMiddle = [];
    for (let i = 0; i < positionsGeo.length - 1; i += 1) {
      positionsGeoMiddle.push(positionsGeo[i]);

      if (positionsGeo[i][0] === positionsGeo[i + 1][0] && positionsGeo[i][1] === positionsGeo[i + 1][1]) { //self loop
        const hash = isocodes[0].split("").reduce((a,b) => {a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);

        const angle = (hash % 20) / 20 * (2 * Math.PI);
        const first = angle - Math.PI / 8;
        const second = angle + Math.PI / 8;

        positionsGeoMiddle.push([
          positionsGeo[i][0] + 0.75 * Math.cos(first),
          positionsGeo[i][1] + 0.75 * Math.sin(first)
        ]);

        positionsGeoMiddle.push([
          positionsGeo[i][0] + Math.cos(angle),
          positionsGeo[i][1] + Math.sin(angle)
        ]);

        positionsGeoMiddle.push([
          positionsGeo[i][0] + 0.75 * Math.cos(second),
          positionsGeo[i][1] + 0.75 * Math.sin(second)
        ]);
      }
      else {
        positionsGeoMiddle.push([
          (positionsGeo[i][0] + positionsGeo[i + 1][0]) / 2,
          (positionsGeo[i][1] + positionsGeo[i + 1][1]) / 2
        ]);
      }
    }
    positionsGeoMiddle.push(positionsGeo[positionsGeo.length - 1]);

    const path = this.gPath
      .append('path') // Path that goes through each language
      .datum(positionsGeoMiddle)
      .attr('d', lineGenerator(positionsGeoMiddle.map(posGeo => this.projection(posGeo))))
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-opacity', opacity)
      .attr('stroke-width', strokeWidth)
      .attr('class', 'languagePath');

    if (clickFct) {
      path.on('click', clickFct);
    }

    const length = Math.ceil(path.node().getTotalLength());

    path
      .attr('stroke-dasharray', `${length} ${length}`)
      .attr('stroke-dashoffset', length)
      .transition()
      .duration(1000) // We animate the path
      .attr('stroke-dashoffset', 0);
  }

  focusOn(isocodes, mainIsocode) {
    this.selectedIsocodes = isocodes;
    this.mainIsocode = mainIsocode;

    //Low opacity for every language, the correct ones will be set during the zoom
    this.g.selectAll(`${this.parentSelector} .languageCircle`)
     .attr('opacity', 0.2);

    this.g.selectAll(`${this.parentSelector} .languageText`)
     .attr('opacity', 0);

    this.checkCollisions();

    if (isocodes.length < 2) return;

    const positions = isocodes.map(isocode =>
      this.projection([languagesCoo[isocode].longitude, languagesCoo[isocode].latitude])
    );

    const minX = Math.min(...positions.map(p => p[0]));
    const maxX = Math.max(...positions.map(p => p[0]));
    const minY = Math.min(...positions.map(p => p[1]));
    const maxY = Math.max(...positions.map(p => p[1]));

    const boundingWidth = maxX - minX;
    const boundingHeight = maxY - minY;

    const realWidth = this.width - 600;

    const scale = Math.min(1 / Math.max(boundingWidth / (0.95 * realWidth), boundingHeight / (0.95 * this.height)), 30);
    const translateX = this.width / 2 - scale * (maxX + minX) / 2 - 300;
    const translateY = this.height / 2 - scale * (maxY + minY) / 2;

    this.svg
      .transition()
      .duration(1000)
      .call(this.zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
  }

  removeAllLines() {
    this.g.selectAll('.languagePath')
     .attr('class', 'oldLanguagePath')
     .transition()
     .duration(500)
     .attr('stroke-width', 0)
     .on('end', () => this.g.selectAll('.oldLanguagePath').remove())
  }

  setCountryColors(isocode, color) {
    const countryIDs = langNetwork.spoken[languagesCoo[isocode].name];
    if (!countryIDs) //this language in no longer spoken
      return;

    countryIDs.forEach(countryID => {
      d3.select(`#country-${countryID}`).transition()
       .duration(400)
       .attr('fill', color)
       .attr('stroke', color)
    });
  }

  checkCollisions() {
    if (this.mode === vizMode.None) return;

    const bboxArray = [];
    let mainObj = null;
    this.selectedIsocodes.forEach(iso => {
      this.g.select(`#languageText-${iso}`)
       .attr('pointer-events', 'auto')
       .attr('opacity', 1);

      const bbox = this.g.select(`#languageText-${iso}`).node().getBoundingClientRect();

      if (iso === this.mainIsocode) {
        mainObj = {
          bbox: bbox,
          iso: iso
        }
      }
      else {
        bboxArray.push({
          bbox: bbox,
          iso: iso
        });
      }
    });

    const sorted = _.sortBy(bboxArray, obj => -langNetwork.stats[obj.iso].count);
    if (mainObj) {
      sorted.unshift(mainObj);
    }
    else {
      console.error(`${this.mainIsocode} not in selectedIsocodes`);
    }
    const visibleBBox = [];

    sorted.forEach(obj => {
      if (visibleBBox.filter(bbox => !this.bboxCollision(bbox, obj.bbox)).length === visibleBBox.length) {
        visibleBBox.push(obj.bbox);
      }
      else {
        this.g.select(`#languageText-${obj.iso}`)
          .attr('pointer-events', 'none')
          .attr('opacity', 0);
      }
    });
  }

  bboxCollision(bbox1, bbox2) {
    return !(bbox1.left > bbox2.right ||
             bbox2.left > bbox1.right ||
             bbox1.top > bbox2.bottom ||
             bbox2.top > bbox1.bottom);
    
  }

  resetHighlights() {
    this.g.selectAll(`${this.parentSelector} .mapPath`)
     .attr('fill', '#DDD')
     .attr('stroke', '#DDD');

    this.g.selectAll(`${this.parentSelector} .gLanguage`)
     .attr('opacity', 1);

    this.g.selectAll(`${this.parentSelector} .languageCircle`)
     .attr('opacity', 1);

    this.g.selectAll(`${this.parentSelector} .languageText`)
     .attr('pointer-events', 'auto')
     .attr('opacity', 1);
  }

  /* No selection */
  deselect() {
    this.mode = vizMode.None;
    this.selectedIsocodes = [];

    this.removeAllLines();
    this.resetHighlights();
    this.updateScaleAndOpacity();
  }

  /* Single Language */

  async asyncSelectLanguage(isocode) {
    const info = await Api.getLangData(isocode);
    this.selectLanguage(info);
  }

  selectLanguage(langInfo) {
    this.mode = vizMode.Language;

    openPanel();
    this.resetHighlights();
    this.addLanguageLines(langInfo);
    this.setCountryColors(langInfo.lang, '#ffa293');

    const allIso = Object.keys(langNetwork.relation[langInfo.lang]);
    allIso.push(langInfo.lang);
    this.focusOn(allIso, langInfo.lang);

    this.setRightPanelInfoLanguage(langInfo);
  }

  addLanguageLines(langInfo) {
    const isocode = langInfo.lang;
    this.removeAllLines();

    Object.keys(langNetwork.relationProportion[isocode]).forEach(otherLang => {
      const value = langNetwork.relationProportion[isocode][otherLang];

      this.addLine([isocode, otherLang], 0.5 + value, 'white', 0.5, () =>
        this.asyncSelectLanguagePair(isocode, otherLang)
      );
    });
  }

  /* Language pair */

  async asyncSelectLanguagePair(iso1, iso2) {
    const info1To2 = await Api.getLangPairData(iso1, iso2);
    const info2To1 = await Api.getLangPairData(iso2, iso1);
    this.selectLanguagePair(info1To2, info2To1);
  }

  selectLanguagePair(info1To2, info2To1) {
    this.mode = vizMode.Pair;

    openPanel();
    this.resetHighlights();
    this.addLanguagePairLines(info1To2, info2To1);
    this.focusOn([info1To2.lang_src, info1To2.lang_to], info1To2.lang_src);
    this.setCountryColors(info1To2.lang_src, '#ffa293');
    this.setCountryColors(info2To1.lang_src, '#89ffbe');
    this.setRightPanelInfoLanguagePair(info1To2, info2To1);
  }

  addLanguagePairLines(info1To2, info2To1) {
    const iso1 = info1To2.lang_src;
    const iso2 = info1To2.lang_to;

    const values = langNetwork.fromProportion[iso1].filter(pair => pair[0] === iso2);
    if (values.length === 0 || values[0] === 0) {
      console.error(`No relation between ${iso1} and ${iso2}`);
    }

    this.removeAllLines();
    this.addLine([iso1, iso2], 0.5 + values[0], 'white', 0.7);
  }

  /* Single word */

  async asyncSelectWord(word, lang) {
    const info = await Api.getWordData(word, lang);
    this.selectWord(info);
  }

  selectWord(wordInfo) {
    this.mode = vizMode.Word;

    openPanel();
    this.resetHighlights();
    this.addWordLines(wordInfo);
    this.setRightPanelInfoWord(wordInfo);
  }

  addWordLines(wordInfo) {
    this.removeAllLines();

    const allIso = new Set([wordInfo.lang]);
    for (const i in wordInfo.parents) {
      this.recursiveAddWordLines(allIso, [wordInfo.lang], wordInfo.parents[i]);
    }

    this.focusOn(Array.from(allIso), wordInfo.lang);
  }

  recursiveAddWordLines(allIso, previousLangs, obj) {
    let lang = obj[0][0];
    const word = obj[0][1];
    const parents = obj[1];

    const previousLangsCopy = previousLangs.slice(0);
    previousLangsCopy.push(lang);

    allIso.add(lang);

    if (parents.length === 0) {
      // no more ancestors
      this.addLine(previousLangsCopy, 0.4, 'white', 1);
    }
    for (const i in parents) {
      this.recursiveAddWordLines(allIso, previousLangsCopy, parents[i]);
    }
  }

  /* Right Panel */

  hideAllRightSubpanels() {
    $(`.right-panel .language-panel`).hide();
    $(`.right-panel .language-pair-panel`).hide();
    $(`.right-panel .word-panel`).hide();
  }

  setRightPanelInfoLanguage(langInfo) {
    const isocode = langInfo.lang;

    this.hideAllRightSubpanels();
    $(`.right-panel .language-panel`).show();

    $(`.right-panel .notTemplate`).remove();

    $(`.right-panel .panel-title`).html(languagesCoo[isocode].name); // Title

    const sampleTemplate = $(`.right-panel .sample-panel .template`);

    _.take(langInfo.samples, 6).forEach(word => {
      const clone = cloneTemplate(sampleTemplate);

      clone.find('.word-button').html(word);
      clone.find('.word-button').click(() => this.asyncSelectWord(word, isocode));

      $(`.right-panel .sample-panel`).append(clone);
    });

    // only takes the influencing languages, which account for at least 10% of the words
    const influencing = _.takeWhile(langNetwork.fromProportion[isocode], pair => pair[1] > 0.1);
    // only takes the influenced languages, which account for at least 10% of the words
    const influenced = _.takeWhile(langNetwork.toProportion[isocode], pair => pair[1] > 0.1);

    const dataFromNotNormalized = influencing.map(pair => pair[1]);
    const dataToNotNormalized = influenced.map(pair => pair[1]);

    const fromSum =
      dataFromNotNormalized.length > 0 ? dataFromNotNormalized.reduce((total, value) => total + value) : 1;
    const toSum = dataToNotNormalized.length > 0 ? dataToNotNormalized.reduce((total, value) => total + value) : 1;

    const dataFrom = dataFromNotNormalized.map(value => value / fromSum);
    const isocodesFrom = influencing.map(pair => pair[0]);
    const dataTo = dataToNotNormalized.map(value => value / toSum);
    const isocodesTo = influenced.map(pair => pair[0]);

    recreateAlluvial(this, isocode, `.language-panel .svg-container`, dataFrom, isocodesFrom, dataTo, isocodesTo);

    // Template for chord Diagram

    const isocodesNotFiltered = Object.keys(langNetwork.relation[isocode]);
    const tempArray = isocodesNotFiltered.map(iso => [iso, langNetwork.relation[isocode][iso]]);
    const isocodes = _.take(_.sortBy(tempArray, pair => -pair[1]), 4).map(pair => pair[0]);
    isocodes.push(isocode);

    const matrixRelations = [];
    isocodes.forEach(first => {
      const arr = [];

      isocodes.forEach(second => {
        const value = langNetwork.relation[first][second] || 0;
        arr.push(value);
      });

      matrixRelations.push(arr);
    })

    recreateChord(this, matrixRelations, isocodes);
  }

  setRightPanelInfoLanguagePair(info1To2, info2To1) {
    const iso1 = info1To2.lang_src;
    const iso2 = info1To2.lang_to;

    this.hideAllRightSubpanels();
    $(`.right-panel .language-pair-panel`).show();

    $(`.right-panel .notTemplate`).remove();

    this.setRightPanelInfoLanguagePairTitle(iso1, iso2, '.first-direction .title');
    this.setRightPanelInfoLanguagePairTitle(iso2, iso1, '.second-direction .title');

    this.setRightPanelInfoLanguagePairStats(iso1, iso2, '.first-direction .stats');
    this.setRightPanelInfoLanguagePairStats(iso2, iso1, '.second-direction .stats');

    this.setRightPanelInfoLanguagePairSample(iso1, iso2, info1To2, '.first-direction .samples');
    this.setRightPanelInfoLanguagePairSample(iso2, iso1, info2To1, '.second-direction .samples');

    d3.selectAll('.svg-alluvial').remove();

    this.setRightPanelInfoLanguagePairDiagram(iso1, '.first-direction .svg-container');
    this.setRightPanelInfoLanguagePairDiagram(iso2, '.second-direction .svg-container');
  }

  setRightPanelInfoLanguagePairTitle(from, to, selector) {
    $(`.right-panel ${selector} .panel-title`).html(`From ${languagesCoo[from].name} to ${languagesCoo[to].name}`); // Title

    $(`.right-panel ${selector} .language-button`)
      .html(languagesCoo[from].name)
      .click(() => this.asyncSelectLanguage(from));
  }

  setRightPanelInfoLanguagePairStats(from, to, selector) {
    $(`.right-panel ${selector} .panel-title`).html('Stats'); // Title

    const values = langNetwork.from[from] ? langNetwork.from[from].filter(pair => pair[0] === to) : [];
    const numWords = values.length > 0 ? values[0][1] : 0;

    $(`.right-panel ${selector} .absolute`).html(
      `${numWords} words come from ${languagesCoo[from].name} to ${languagesCoo[to].name}.`
    );
    $(`.right-panel ${selector} .proportion`).html(`That is ${53.2} % of ${languagesCoo[to].name}'s words.`);
  }

  setRightPanelInfoLanguagePairSample(from, to, info, selector) {
    $(`.right-panel ${selector} .panel-title`).html('Sample words'); // Title

    const template = $(`.right-panel ${selector} .template`); // Word button

    _.take(info.samples, 6).forEach(word => {
      const clone = cloneTemplate(template);

      clone.find('.word-button').html(word);
      clone.find('.word-button').click(() => this.asyncSelectWord(word, from));

      $(`.right-panel ${selector} .segments`).append(clone);
    });
  }

  setRightPanelInfoLanguagePairDiagram(from, selector) {
    $(`.right-panel ${selector} .panel-title`).html(`Other relations for ${languagesCoo[from].name}`); // Title

    // Template for alluvial Diagram

    const influencing = _.takeWhile(langNetwork.fromProportion[from], pair => pair[1] > 0.1); // only takes the influencing languages, which account for at least 10% of the words
    const influenced = _.takeWhile(langNetwork.toProportion[from], pair => pair[1] > 0.1); // only takes the influenced languages, which account for at least 10% of the words

    const dataFromNotNormalized = influencing.map(pair => pair[1]);
    const dataToNotNormalized = influenced.map(pair => pair[1]);

    const fromSum =
      dataFromNotNormalized.length > 0 ? dataFromNotNormalized.reduce((total, value) => total + value) : 1;
    const toSum = dataToNotNormalized.length > 0 ? dataToNotNormalized.reduce((total, value) => total + value) : 1;

    const dataFrom = dataFromNotNormalized.map(value => value / fromSum);
    const isocodesFrom = influencing.map(pair => pair[0]);
    const dataTo = dataToNotNormalized.map(value => value / toSum);
    const isocodesTo = influenced.map(pair => pair[0]);

    recreateAlluvial(this, from, selector, dataFrom, isocodesFrom, dataTo, isocodesTo);
  }

  setRightPanelInfoWord(wordInfo) {
    this.hideAllRightSubpanels();
    $(`.right-panel .word-panel`).show();

    $(`.right-panel .notTemplate`).remove();

    $(`.right-panel .panel-title`).html(wordInfo.word); // Title

    const wordTemplate = $(`.right-panel .synonyms-panel .template`);

    function addToWordsPanel(list, panelClass, visu) {
      list.forEach(pair => {
        const lang = pair[0];
        const word = pair[1];

        const clone = cloneTemplate(wordTemplate);

        clone.find('.word-button').html(word);
        clone.find('.word-button').click(() => visu.asyncSelectWord(word, lang));

        clone.find('.lang-button').html(languagesCoo[lang] ? languagesCoo[lang].name : lang);
        clone.find('.lang-button').click(() => visu.asyncSelectLanguage(lang));

        $(`.right-panel .${panelClass}`).append(clone);
      });
    }

    addToWordsPanel(wordInfo.synonyms.filter(pair => pair[0] === wordInfo.lang), 'synonyms-panel', this);
    addToWordsPanel(wordInfo.synonyms.filter(pair => pair[0] !== wordInfo.lang), 'translations-panel', this);

    // Graph

    $(`.right-panel .word-panel .svg-container .panel-title`).html(`Etymology of ${wordInfo.word}`); // Title of the graph

    recreateEtymology(this, wordInfo, false);
  }
}

export default Viz;
