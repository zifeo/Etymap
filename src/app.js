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
    syn: [],
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

    this.mode = "languages";
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

  addLine(isocodes, strokeWidth, color) {
    const positionsGeo = isocodes.map(isocode => [languagesCoo[isocode].longitude, languagesCoo[isocode].latitude]);

    const path = this.g
      .append('path') // Path that goes through each language
      .datum(positionsGeo)
      .attr('d', lineGenerator(positionsGeo.map(posGeo => this.projection(posGeo))))
      .attr('stroke', color)
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', strokeWidth)
      .attr('class', 'languagePath');

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

    const scale = 0.8 / Math.max(boundingWidth / this.width, boundingHeight / this.height);
    const translateX = this.width / 2 - scale * (maxX + minX) / 2;
    const translateY = this.height / 2 - scale * (maxY + minY) / 2;

    this.svg.transition()
      .duration(1000)
      .call(this.zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
  }

  removeAllLines() {
    this.g.selectAll('.languagePath').remove();
  }

  selectLanguage(isocode) {
    this.addLanguageLines(isocode);
    this.setRightPanelInfoLanguage(isocode);
  }

  addLanguageLines(isocode) {
    if (this.mode !== "languages")
      return;

    if (!(isocode in languagesRelations))
      return;

    this.removeAllLines();

    let allIsocodesRelated = [isocode];
    languagesRelations[isocode].forEach(rel => {
      const otherLang = rel.lang;
      if (otherLang in languagesCoo) {
        allIsocodesRelated.push(otherLang);
        this.addLine([isocode, otherLang], 1 + Math.log(rel.count), 'white');
      }
    });

    if (allIsocodesRelated.length > 1) {
      this.focusOn(allIsocodesRelated);
    }
  }

  hideRightPanel() {
    $(`${this.parentSelector} .right-panel`).hide();
  }

  showRightPanel() {
    $(`${this.parentSelector} .right-panel`).show();
  }

  hideAllRightSubpanels() {
    $(`${this.parentSelector} .language-panel`).hide();
  }

  setRightPanelInfoLanguage(isocode) {
    this.hideAllRightSubpanels();
    $(`${this.parentSelector} .language-panel`).show();

    $(`${this.parentSelector} .right-panel .notTemplate`).remove();

    $(`${this.parentSelector} .language-panel-title`).html(languagesCoo[isocode].name); //Title

    //Languages that share at least 1 word
    const languageRelationTemplate = $(`${this.parentSelector} .languages-related-panel .template`);

    languagesRelations[isocode].forEach(rel => {
      const otherLang = rel.lang;
      if (otherLang in languagesCoo) {
        const clone = languageRelationTemplate.clone();
        clone.removeClass('template');
        clone.addClass('notTemplate');

        clone.find('.other-language-button').html(languagesCoo[otherLang].name);
        clone.find('.other-language-button').click(() => this.selectLanguage(otherLang));

        clone.find('.relation-button').html(`${languagesCoo[otherLang].name}-${languagesCoo[isocode].name}`);

        $(`${this.parentSelector} .languages-related-panel`).append(clone);
      }
    });

    this.showRightPanel();
  }
}

const allVisu = [new Visu("#viz")];

/*

function selectWord(word) {
  removeAllLines();

  const relations = $('#relations');

  relations.html('');
  let html = `<p class='selected-word'>${word}</p>`;

  const langCount = {};

  addLine(dummyData[word].lang, 1, 'white', '');
  addToCount(langCount, dummyData[word].lang);

  html += "<p class='category'>Synonyms:</p>";
  for (const syn in dummyData[word].syn) {
    const synonym = dummyData[word].syn[syn];
    addLine(dummyData[synonym].lang, 1, 'green', '2,2');
    html += `<p class='other-word' id='word-${synonym}'>${synonym}</p>`;
    addToCount(langCount, dummyData[synonym].lang);
  }

  html += "<p class='category'>Antonyms:</p>";
  for (const ant in dummyData[word].ant) {
    const antonym = dummyData[word].ant[ant];
    addLine(dummyData[antonym].lang, 1, 'red', '2,2');
    html += `<p class='other-word' id='word-${antonym}'>${antonym}</p>`;
    addToCount(langCount, dummyData[antonym].lang);
  }

  html += "<p class='category'>Homonyms:</p>";
  for (const hom in dummyData[word].hom) {
    const homonym = dummyData[word].hom[hom];
    addLine(dummyData[homonym].lang, 1, 'blue', '2,2');
    html += `<p class='other-word' id='word-${homonym}'>${homonym}</p>`;
    addToCount(langCount, dummyData[homonym].lang);
  }

  g.selectAll('circle').attr('fill-opacity', d => {
    if (!langCount[d.isocode]) return 0;
    return Math.min(langCount[d.isocode] / 2, 1);
  });

  relations.html(html);

  $('.other-word').click(() => {
    selectWord(this.id.replace('word-', ''));
  });
}

function addToCount(langCount, langs) {
  for (const i in langs) {
    if (langCount[langs[i]]) {
      langCount[langs[i]] += 1;
    } else {
      langCount[langs[i]] = 1;
    }
  }
}*/
