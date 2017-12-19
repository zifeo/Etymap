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

$('.ui.accordion').accordion({
  exclusive: false,
});

const geojson = require('./world.geo.json');
const langNetwork = require('./lang_network.json');

Object.keys(langNetwork.from).forEach(key => {
  const filtered = langNetwork.from[key].filter(pair => pair[0] !== key);
  langNetwork.from[key] = _.sortBy(filtered, pair => -pair[1]);
});

langNetwork.fromProportion = Object.assign({}, langNetwork.from);
Object.keys(langNetwork.fromProportion).forEach(key => {
  const size = _.sum(langNetwork.fromProportion[key].map(pair => pair[1]));
  langNetwork.fromProportion[key] = langNetwork.fromProportion[key].map(pair => [pair[0], pair[1] / size]);
});

Object.keys(langNetwork.to).forEach(key => {
  const filtered = langNetwork.to[key].filter(pair => pair[0] !== key);
  langNetwork.to[key] = _.sortBy(filtered, pair => -pair[1]);
});

langNetwork.toProportion = Object.assign({}, langNetwork.to);
Object.keys(langNetwork.toProportion).forEach(key => {
  const size = _.sum(langNetwork.toProportion[key].map(pair => pair[1]));
  langNetwork.toProportion[key] = langNetwork.toProportion[key].map(pair => [pair[0], pair[1] / size]);
});

const languagesCoo = langNetwork.locations;
const allLanguages = Object.keys(languagesCoo);

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
    this.svg = d3
      .select(this.parentSelector)
      .append('svg')
      .style('background-color', 'black')
      .attr('class', 'main-map');

    this.g = this.svg.append('g').attr('id', 'g');

    this.zoom = d3
      .zoom()
      .scaleExtent([1, 30])
      .on('zoom', () => this.g.attr('transform', d3.event.transform));

    this.svg.call(this.zoom);
  }

  addGeoJson() {
    this.projection = d3
      .geoNaturalEarth1()
      .scale(this.width / 7)
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
        url: '/search/{query}',
      },
      type: 'category',
      cache: false,
      minCharacters: 1,
      onSelect: result => {
        const { word, lang } = result;
        if (word) {
          this.asyncSelectWord(word, lang);
        } else {
          this.asyncSelectLanguage(lang);
        }
      },
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
      .attr('cx', iso => this.projection([languagesCoo[iso].longitude, languagesCoo[iso].latitude])[0])
      .attr('cy', iso => this.projection([languagesCoo[iso].longitude, languagesCoo[iso].latitude])[1])
      .attr('r', 1)
      .attr('stroke-width', 0.2)
      .attr('fill', 'white')
      .attr('stroke', 'blue')
      .attr('id', iso => `circle-${iso}`)
      .on('click', iso => this.asyncSelectLanguage(iso));
  }

  addLine(isocodes, strokeWidth, color, opacity, clickFct) {
    const positionsGeo = isocodes.map(isocode => [languagesCoo[isocode].longitude, languagesCoo[isocode].latitude]);

    const positionsGeoMiddle = [];
    for (let i = 0; i < positionsGeo.length - 1; i++) {
      positionsGeoMiddle.push(positionsGeo[i]);
      positionsGeoMiddle.push([
        (positionsGeo[i][0] + positionsGeo[i + 1][0]) / 2,
        (positionsGeo[i][1] + positionsGeo[i + 1][1]) / 2,
      ]);
    }
    positionsGeoMiddle.push(positionsGeo[positionsGeo.length - 1]);

    const path = this.g
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

  focusOn(isocodes) {
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

    const scale = 1 / Math.max(boundingWidth / (0.95 * this.width), boundingHeight / (0.95 * this.height));
    const translateX = this.width / 2 - scale * (maxX + minX) / 2;
    const translateY = this.height / 2 - scale * (maxY + minY) / 2;

    this.svg
      .transition()
      .duration(1000)
      .call(this.zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
  }

  removeAllLines() {
    this.g.selectAll('.languagePath').remove();
  }

  /* Single Language */

  async asyncSelectLanguage(isocode) {
    const info = await Api.getLangData(isocode);
    this.selectLanguage(info);
  }

  selectLanguage(langInfo) {
    this.addLanguageLines(langInfo);
    this.setRightPanelInfoLanguage(langInfo);
  }

  addLanguageLines(langInfo) {
    const isocode = langInfo.lang;
    this.removeAllLines();

    const allIsocodesRelated = [isocode];
    langNetwork.fromProportion[isocode].forEach(rel => {
      const otherLang = rel[0];
      const value = rel[1];

      allIsocodesRelated.push(otherLang);
      this.addLine([isocode, otherLang], 0.5 + value, 'white', 0.5, () =>
        this.asyncSelectLanguagePair(isocode, otherLang)
      );
    });

    if (allIsocodesRelated.length > 1) {
      this.focusOn(allIsocodesRelated);
    }
  }

  /* Language pair */

  async asyncSelectLanguagePair(iso1, iso2) {
    const info1To2 = await Api.getLangPairData(iso1, iso2);
    const info2To1 = await Api.getLangPairData(iso2, iso1);
    this.selectLanguagePair(info1To2, info2To1);
  }

  selectLanguagePair(info1To2, info2To1) {
    this.addLanguagePairLines(info1To2, info2To1);
    this.focusOn([info1To2.lang_src, info1To2.lang_to]);
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
    this.addWordLines(wordInfo);
    this.setRightPanelInfoWord(wordInfo);
  }

  addWordLines(wordInfo) {
    this.removeAllLines();

    const allIso = new Set([wordInfo.lang]);
    for (const i in wordInfo.parents) {
      this.recursiveAddWordLines(allIso, [wordInfo.lang], wordInfo.parents[i]);
    }

    this.focusOn(Array.from(allIso));
  }

  recursiveAddWordLines(allIso, previousLangs, obj) {
    let lang = obj[0][0];
    const word = obj[0][1];
    const parents = obj[1];

    if (!(lang in languagesCoo)) {
      lang = 'por'; // temporary, only for testing
    }

    const previousLangsCopy = previousLangs.slice(0);
    previousLangsCopy.push(lang);

    allIso.add(lang);

    if (parents.length === 0) {
      // no more ancestors
      this.addLine(previousLangsCopy, 1, 'white', 1);
    }
    for (const i in parents) {
      this.recursiveAddWordLines(allIso, previousLangsCopy, parents[i]);
    }
  }

  /* Right Panel */

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

  setRightPanelInfoLanguage(langInfo) {
    const isocode = langInfo.lang;

    this.hideAllRightSubpanels();
    $(`${this.parentSelector} .language-panel`).show();

    $(`${this.parentSelector} .right-panel .notTemplate`).remove();

    $(`${this.parentSelector} .panel-title`).html(languagesCoo[isocode].name); // Title

    const sampleTemplate = $(`${this.parentSelector} .sample-panel .template`);

    _.take(langInfo.samples, 6).forEach(word => {
      const clone = cloneTemplate(sampleTemplate);

      clone.find('.word-button').html(word);
      clone.find('.word-button').click(() => this.asyncSelectWord(word, isocode));

      $(`${this.parentSelector} .sample-panel`).append(clone);
    });

    const influencing = _.takeWhile(langNetwork.fromProportion[isocode], pair => pair[1] > 0.1); // only takes the influencing languages, which account for at least 10% of the words
    const influenced = _.takeWhile(langNetwork.toProportion[isocode], pair => pair[1] > 0.1); // only takes the influenced languages, which account for at least 10% of the words

    const dataFromNotNormalized = influencing.map(pair => pair[1]);
    const dataToNotNormalized = influenced.map(pair => pair[1]);

    const fromSum =
      dataFromNotNormalized.length > 0 ? dataFromNotNormalized.reduce((total, value) => total + value) : 1;
    const toSum = dataToNotNormalized.length > 0 ? dataToNotNormalized.reduce((total, value) => total + value) : 1;

    const dataFrom = dataFromNotNormalized.map(value => value / fromSum);
    const isocodesFrom = influencing.map(pair => pair[0]);
    const dataTo = dataToNotNormalized.map(value => value / toSum);
    const isocodesTo = influenced.map(pair => pair[0]);

    this.showRightPanel();

    d3.selectAll('.svg-alluvial').remove();
    this.alluvialHelper(isocode, `.language-panel .svg-container`, dataFrom, isocodesFrom, dataTo, isocodesTo);

    // Template for chord Diagram

    const isocodes = ['fra', 'por', 'spa', 'eng', 'rus']; // temporary
    isocodes.push(isocode);
    const selectedLanguageIndex = isocodes.length - 1; // temporary

    const matrixRelations = [];
    for (const i in isocodes) {
      const arr = [];
      for (const j in isocodes) {
        let value = 0;

        if (i !== j && isocodes[i] in langNetwork.from) {
          const values = langNetwork.from[isocodes[i]].filter(pair => pair[0] === isocodes[j]);
          if (values.length > 0) {
            value = values[0][1];
          }
        }

        arr.push(value);
      }
      matrixRelations.push(arr);
    }

    const width = $(`${this.parentSelector} .language-panel`).width() * 0.8;
    const height = width * 1.2;

    const outerRadius = width / 2.5;
    const innerRadius = width / 3;

    d3.selectAll('.svg-chord').remove();

    const svgChord = d3
      .select(`${this.parentSelector} .svg-chord-container`)
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
      .datum(chord(matrixRelations));

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
      .on('click', d => this.asyncSelectLanguage(isocodes[d.index]));

    function getXY(d, cosOrSin) {
      return innerRadius * cosOrSin((d.startAngle + d.endAngle) / 2 - Math.PI / 2);
    }

    const gradients = svgChord
      .append('defs')
      .selectAll('linearGradient')
      .data(chord(matrixRelations))
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
      .on('click', d => this.asyncSelectLanguagePair(isocodes[d.source.index], isocodes[d.target.index]));

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

  setRightPanelInfoLanguagePair(info1To2, info2To1) {
    const iso1 = info1To2.lang_src;
    const iso2 = info1To2.lang_to;

    this.hideAllRightSubpanels();
    $(`${this.parentSelector} .language-pair-panel`).show();

    $(`${this.parentSelector} .right-panel .notTemplate`).remove();

    this.setRightPanelInfoLanguagePairTitle(iso1, iso2, '.first-direction .title');
    this.setRightPanelInfoLanguagePairTitle(iso2, iso1, '.second-direction .title');

    this.setRightPanelInfoLanguagePairStats(iso1, iso2, '.first-direction .stats');
    this.setRightPanelInfoLanguagePairStats(iso2, iso1, '.second-direction .stats');

    this.setRightPanelInfoLanguagePairSample(iso1, iso2, info1To2, '.first-direction .samples');
    this.setRightPanelInfoLanguagePairSample(iso2, iso1, info2To1, '.second-direction .samples');

    d3.selectAll('.svg-alluvial').remove();

    this.setRightPanelInfoLanguagePairDiagram(iso1, '.first-direction .svg-container');
    this.setRightPanelInfoLanguagePairDiagram(iso2, '.second-direction .svg-container');

    this.showRightPanel();
  }

  setRightPanelInfoLanguagePairTitle(from, to, selector) {
    $(`${this.parentSelector} ${selector} .panel-title`).html(
      `From ${languagesCoo[from].name} to ${languagesCoo[to].name}`
    ); // Title

    $(`${this.parentSelector} ${selector} .language-button`).html(languagesCoo[from].name);
    $(`${this.parentSelector} ${selector} .language-button`).click(() => this.asyncSelectLanguage(from));
  }

  setRightPanelInfoLanguagePairStats(from, to, selector) {
    $(`${this.parentSelector} ${selector} .panel-title`).html('Stats'); // Title

    const values = langNetwork.from[from] ? langNetwork.from[from].filter(pair => pair[0] === to) : [];
    const numWords = values.length > 0 ? values[0][1] : 0;

    $(`${this.parentSelector} ${selector} .absolute`).html(
      `${numWords} words come from ${languagesCoo[from].name} to ${languagesCoo[to].name}.`
    );
    $(`${this.parentSelector} ${selector} .proportion`).html(`That is ${53.2} % of ${languagesCoo[to].name}'s words.`);
  }

  setRightPanelInfoLanguagePairSample(from, to, info, selector) {
    $(`${this.parentSelector} ${selector} .panel-title`).html('Sample words'); // Title

    const template = $(`${this.parentSelector} ${selector} .template`); // Word button

    _.take(info.samples, 6).forEach(word => {
      const clone = cloneTemplate(template);

      clone.find('.word-button').html(word);
      clone.find('.word-button').click(() => this.asyncSelectWord(word, from));

      $(`${this.parentSelector} ${selector} .segments`).append(clone);
    });
  }

  setRightPanelInfoLanguagePairDiagram(from, selector) {
    $(`${this.parentSelector} ${selector} .panel-title`).html(`Other relations for ${languagesCoo[from].name}`); // Title

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

    this.alluvialHelper(from, selector, dataFrom, isocodesFrom, dataTo, isocodesTo);
  }

  setRightPanelInfoWord(wordInfo) {
    this.hideAllRightSubpanels();
    $(`${this.parentSelector} .word-panel`).show();

    $(`${this.parentSelector} .right-panel .notTemplate`).remove();

    $(`${this.parentSelector} .panel-title`).html(wordInfo.word); // Title

    const wordTemplate = $(`${this.parentSelector} .synonyms-panel .template`);

    function addToWordsPanel(list, panelClass, visu) {
      list.forEach(pair => {
        const lang = pair[0];
        const word = pair[1];

        const clone = cloneTemplate(wordTemplate);

        clone.find('.word-button').html(word);
        clone.find('.word-button').click(() => visu.asyncSelectWord(word, lang));

        clone.find('.lang-button').html(languagesCoo[lang] ? languagesCoo[lang].name : lang);
        clone.find('.lang-button').click(() => visu.asyncSelectLanguage(lang));

        $(`${visu.parentSelector} .${panelClass}`).append(clone);
      });
    }

    addToWordsPanel(wordInfo.synonyms.filter(pair => pair[0] === wordInfo.lang), 'synonyms-panel', this);
    addToWordsPanel(wordInfo.synonyms.filter(pair => pair[0] !== wordInfo.lang), 'translations-panel', this);

    // Graph
    $(`${this.parentSelector} .word-panel .svg-container .panel-title`).html(`Etymology of ${wordInfo.word}`); // Title of the graph

    this.showRightPanel();
    const width = $(`${this.parentSelector} .word-panel`).width() * 0.8;
    const height = width;

    d3.select(`${this.parentSelector} .word-panel .svg-container .svg-tree`).remove();

    let maxDepth = 0;
    function recursiveCreateData(obj, newDepth) {
      const lang = obj[0][0];
      const word = obj[0][1];
      const parents = obj[1];

      if (maxDepth < newDepth) {
        maxDepth = newDepth;
      }

      const recursiveData = {
        name: word,
        lang,
      };

      if (parents.length > 0) {
        // more ancestors
        const dataParents = [];
        for (const i in parents) {
          dataParents.push(recursiveCreateData(parents[i], newDepth + 1));
        }
        recursiveData.parents = dataParents;
      }

      return recursiveData;
    }

    const data = {
      name: wordInfo.word,
      lang: wordInfo.lang,
    };

    if (wordInfo.parents.length > 0) {
      const parents = [];
      for (const i in wordInfo.parents) {
        parents.push(recursiveCreateData(wordInfo.parents[i], 1));
      }
      data.parents = parents;
    }

    const svgTree = d3
      .select(`${this.parentSelector} .word-panel .svg-container`)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'svg-tree');

    const gPaths = svgTree.append('g').attr('transform', 'translate(0,0)');

    const gNodes = svgTree.append('g').attr('transform', 'translate(0,0)');

    const tree = d3.tree().size([height, width]);

    const root = d3.hierarchy(data, d => d.parents);

    const descendants = tree(root).descendants();

    const dataNodes = descendants;
    const dataLinks = descendants.slice(1);

    dataNodes.forEach(d => {
      d.y = (1 + d.depth) * width / (maxDepth + 2);
    });

    let i = 0;
    const nodes = gNodes
      .selectAll('none')
      .data(dataNodes, d => (d.id = ++i))
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.y},${d.x})`);

    nodes
      .append('circle')
      .attr('r', 10)
      .attr('fill', '#76B5DE')
      .attr('stroke', '#075486')
      .attr('stroke-width', 2)
      .attr('class', (d, i) => `circle${i}`)
      .on('mouseover', (d, i) => {
        d3
          .select(`${this.parentSelector} .word-panel .svg-container .circle${i}`)
          .transition()
          .duration(300)
          .attr('fill', '#F66')
          .attr('stroke', '#F00');
      })
      .on('mouseout', (d, i) => {
        d3
          .select(`${this.parentSelector} .word-panel .svg-container .circle${i}`)
          .transition()
          .duration(300)
          .attr('fill', '#76B5DE')
          .attr('stroke', '#075486');
      })
      .on('click', d => this.asyncSelectWord(d.data.name, d.data.lang));

    nodes
      .append('text')
      .attr('dy', '-15px')
      .attr('text-anchor', 'middle')
      .text(d => d.data.name);

    nodes
      .append('text')
      .attr('dy', '23px')
      .attr('text-anchor', 'middle')
      .attr('style', 'cursor:pointer;')
      .text(d => languagesCoo[d.data.lang].name)
      .on('click', d => this.asyncSelectLanguage(d.data.lang));

    const links = gPaths
      .selectAll('none')
      .data(dataLinks, d => d.id)
      .enter()
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', '#AAA')
      .attr('stroke-width', 3)
      .attr(
        'd',
        d3
          .linkHorizontal()
          .source(d => d)
          .target(d => d.parent)
          .x(d => d.y) // reversed as the tree is horizontal
          .y(d => d.x)
      );
  }

  alluvialHelper(from, selector, dataFrom, isocodesFrom, dataTo, isocodesTo) {
    const width = $(`${this.parentSelector} ${selector} `).width() * 0.8;
    const height = width;

    const nodeWidth = width / 20;
    const margin = 0.05;

    const dataFromCum = [];
    let curr = 0;
    for (const i in dataFrom) {
      dataFromCum.push(curr);
      curr += dataFrom[i];
    }
    const fromCumSum = 1 + margin * (dataFrom.length - 1);

    const dataToCum = [];
    curr = 0;
    for (const i in dataTo) {
      dataToCum.push(curr);
      curr += dataTo[i];
    }
    const toCumSum = 1 + margin * (dataTo.length - 1);

    const maxSum = Math.max(fromCumSum, toCumSum);

    const color = d3
      .scaleLinear()
      .domain([0, 1])
      .range(['#76B5DE', '#075486']);

    const svgAlluvial = d3
      .select(`${this.parentSelector} ${selector}`)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'svg-alluvial');

    const gPaths = svgAlluvial.append('g');
    const gNodes = svgAlluvial.append('g');

    const gFrom = gNodes.append('g');

    const gTo = gNodes.append('g').attr('transform', `translate(${width - nodeWidth})`);

    // Nodes & text
    function addNodes(data, dataCum, isocodes, group, isFrom, visu) {
      const baseID = isFrom ? 0 : 1;
      group
        .selectAll('none')
        .data(dataCum)
        .enter()
        .append('rect')
        .attr('fill', 'black')
        .attr('width', nodeWidth)
        .attr('height', (d, i) => data[i] * height / maxSum)
        .attr('y', (d, i) => (d + i * margin) * height / maxSum)
        .attr('class', (d, i) => `node-${baseID}-${i}`)
        .on('mouseover', (d, i) => {
          d3
            .select(`${selector} .node-${baseID}-${i}`)
            .transition()
            .duration(300)
            .attr('fill', '#F66');
        })
        .on('mouseout', (d, i) => {
          d3
            .select(`${selector} .node-${baseID}-${i}`)
            .transition()
            .duration(300)
            .attr('fill', 'black');
        })
        .on('click', (d, i) => {
          visu.asyncSelectLanguage(isocodes[i]);
        });

      group
        .selectAll('none')
        .data(isocodes)
        .enter()
        .append('text')
        .attr('fill', 'black')
        .attr('x', isFrom ? nodeWidth + 5 : -5)
        .attr('y', (d, i) => (dataCum[i] + data[i] / 2 + i * margin) * height / maxSum + 5)
        .attr('text-anchor', isFrom ? 'start' : 'end')
        .text(d => languagesCoo[d].name);
    }

    addNodes(dataFrom, dataFromCum, isocodesFrom, gFrom, true, this);
    addNodes(dataTo, dataToCum, isocodesTo, gTo, false, this);

    gNodes
      .append('rect') // Central node
      .attr('width', nodeWidth)
      .attr('height', height / maxSum)
      .attr('x', width / 2 - nodeWidth / 2)
      .attr('y', 0);

    // Links
    const fromPaths = [];
    for (const i in dataFrom) {
      const newPath = [];
      newPath.push([0, (dataFromCum[i] + i * margin + dataFrom[i] / 2) * height / maxSum]);
      newPath.push([nodeWidth, (dataFromCum[i] + i * margin + dataFrom[i] / 2) * height / maxSum]);
      newPath.push([width / 2 - nodeWidth / 2, (dataFromCum[i] + dataFrom[i] / 2) * height / maxSum]);
      newPath.push([width / 2 + nodeWidth / 2, (dataFromCum[i] + dataFrom[i] / 2) * height / maxSum]);
      fromPaths.push(newPath);
    }

    const toPaths = [];
    for (const i in dataTo) {
      const newPath = [];
      newPath.push([width / 2 - nodeWidth / 2, (dataToCum[i] + dataTo[i] / 2) * height / maxSum]);
      newPath.push([width / 2 + nodeWidth / 2, (dataToCum[i] + dataTo[i] / 2) * height / maxSum]);
      newPath.push([width - nodeWidth, (dataToCum[i] + i * margin + dataTo[i] / 2) * height / maxSum]);
      newPath.push([width, (dataToCum[i] + i * margin + dataTo[i] / 2) * height / maxSum]);
      toPaths.push(newPath);
    }

    function addPaths(paths, data, isocodes, visu, isFrom) {
      const baseID = isFrom ? 0 : 1;
      gPaths
        .selectAll('none')
        .data(paths)
        .enter()
        .append('path')
        .attr('class', (d, i) => `path-${baseID}-${i}`)
        .attr('fill', 'none')
        .attr('initial-stroke', (d, i) => d3.rgb(color(i / data.length)))
        .attr('stroke', (d, i) => d3.select(`${selector} .path-${baseID}-${i}`).attr('initial-stroke'))
        .attr('stroke-opacity', 0.8)
        .attr('stroke-width', (d, i) => data[i] * height / maxSum)
        .attr('d', lineGeneratorAlluvial)
        .on('mouseover', (d, i) => {
          d3
            .select(`${selector} .path-${baseID}-${i}`)
            .transition()
            .duration(300)
            .attr('stroke', '#F66');
        })
        .on('mouseout', (d, i) => {
          d3
            .select(`${selector} .path-${baseID}-${i}`)
            .transition()
            .duration(300)
            .attr('stroke', d3.select(`${selector} .path-${baseID}-${i}`).attr('initial-stroke'));
        })
        .on('click', (d, i) => {
          if (isFrom) {
            visu.asyncSelectLanguagePair(from, isocodes[i]);
          } else {
            visu.asyncSelectLanguagePair(isocodes[i], from);
          }
        });
    }

    addPaths(fromPaths, dataFrom, isocodesFrom, this, true);
    addPaths(toPaths, dataTo, isocodesTo, this, false);
  }
}

const allVisu = [new Visu('#viz')];
allVisu.forEach(v => v.addAllLanguagesPoints());

function cloneTemplate(element) {
  const clone = element.clone();
  clone.removeClass('template');
  clone.addClass('notTemplate');
  clone.show();

  return clone;
}
