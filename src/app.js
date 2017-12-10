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

$('#search').search({
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
    console.log(result, response);

    const info = await Api.getDummyDataFor(result.word);
    console.log(info);
  },
});

type WordInfo = {
  syn: Array<string>,
  ant: Array<string>,
  hom: Array<string>,
  lang: Array<string>,
};

function getDummyDataFor(word: string): Promise<WordInfo> {
  fetch('');
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

class Visu {
  constructor(parentSelector) {
    this.parentSelector = parentSelector;

    this.setUpSVG();
    this.addGeoJson();

    this.hideRightPanel();
  }

  setUpSVG() {
    this.svg = d3.select(this.parentSelector)
      .append('svg')
      .style('background-color', 'black');

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
        .attr('stroke-width', '1')
        .attr('d', this.geoPath)
        .attr('class', 'mapPath');
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
        .attr('fill', 'black')
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
    const positions = isocodes.map(isocode => this.projection([languagesCoo[isocode].longitude, languagesCoo[isocode].latitude]));

    const minX = Math.min(...positions.map(p => p[0]));
    const maxX = Math.max(...positions.map(p => p[0]));
    const minY = Math.min(...positions.map(p => p[1]));
    const maxY = Math.max(...positions.map(p => p[1]));

    const boundingWidth = maxX - minX;
    const boundingHeight = maxY - minY;

    const scale = 1 / Math.max(boundingWidth / (0.58 * this.width), boundingHeight / (0.9 * this.height));
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

  selectWord(word) {
    this.addWordLines(word);
    this.setRightPanelInfoWord(word);
  }

  addWordLines(word) {
    this.removeAllLines();

    const allIso = [];
    this.addLine(dummyData[word].lang, 2, 'white', 1);
    dummyData[word].lang.forEach(iso => allIso.push(iso));

    dummyData[word].syn.forEach(w => {
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
    });

    this.focusOn(allIso);
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

    //Languages that share at least 1 word
    const languageRelationTemplate = $(`${this.parentSelector} .languages-related-panel .template`);

    languagesRelations[isocode].forEach(rel => {
      const otherLang = rel.lang;
      if (otherLang in languagesCoo) {
        const clone = cloneTemplate(languageRelationTemplate);

        clone.find('.other-language-button').html(languagesCoo[otherLang].name);
        clone.find('.other-language-button').click(() => this.selectLanguage(otherLang));

        clone.find('.relation-button').html(`${languagesCoo[isocode].name}-${languagesCoo[otherLang].name}`);
        clone.find('.relation-button').click(() => this.selectLanguagePair(isocode, otherLang));

        $(`${this.parentSelector} .languages-related-panel`).append(clone);
      }
    });

    this.showRightPanel();
  }

  setRightPanelInfoLanguagePair(iso1, iso2) {
    this.hideAllRightSubpanels();
    $(`${this.parentSelector} .language-pair-panel`).show();

    $(`${this.parentSelector} .right-panel .notTemplate`).remove();

    $(`${this.parentSelector} .panel-title`).html(`${languagesCoo[iso1].name}-${languagesCoo[iso2].name}`); //Title

    $(`${this.parentSelector} .first-language-button`).html(languagesCoo[iso1].name);
    $(`${this.parentSelector} .first-language-button`).click(() => this.selectLanguage(iso1));
    $(`${this.parentSelector} .second-language-button`).html(languagesCoo[iso2].name);
    $(`${this.parentSelector} .second-language-button`).click(() => this.selectLanguage(iso2));

    const dummyWords = ["kapoue", "car", "automobile", "radek", "cringe"];

    const wordPairTemplate = $(`${this.parentSelector} .words-language-pair-panel .template`);

    dummyWords.forEach(word => {
      const clone = cloneTemplate(wordPairTemplate);

      clone.find('.word-language-pair-button').html(word);
      clone.find('.word-language-pair-button').click(() => this.selectWord(word));

      $(`${this.parentSelector} .words-language-pair-panel`).append(clone);
    });

    this.showRightPanel();
  }

  setRightPanelInfoWord(word) {
    this.hideAllRightSubpanels();
    $(`${this.parentSelector} .word-panel`).show();

    $(`${this.parentSelector} .right-panel .notTemplate`).remove();

    $(`${this.parentSelector} .panel-title`).html(word); //Title

    const buttonTemplate = $(`${this.parentSelector} .languages-button-panel .template`); //Languages button
    buttonTemplate.hide();

    dummyData[word].lang.forEach(iso => {
      const clone = cloneTemplate(buttonTemplate);

      clone.html(languagesCoo[iso].name);
      clone.click(() => this.selectLanguage(iso));

      $(`${this.parentSelector} .languages-button`).append(clone);
    });

    const dummyWords = ["kapoue", "car", "automobile", "radek", "cringe"];

    const wordTemplate = $(`${this.parentSelector} .synonyms-panel .template`);

    this.addToWordsPanel(dummyData[word].syn, 'synonyms-panel', wordTemplate);
    this.addToWordsPanel(dummyData[word].ant, 'antonyms-panel', wordTemplate);
    this.addToWordsPanel(dummyData[word].hom, 'homonyms-panel', wordTemplate);

    this.showRightPanel();
  }

  addToWordsPanel(list, panelClass, wordTemplate) {
    list.forEach(word => {
      const clone = cloneTemplate(wordTemplate);

      clone.find('.word-button').html(word);
      clone.find('.word-button').click(() => this.selectWord(word));

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