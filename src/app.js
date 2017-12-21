// @flow

import 'whatwg-fetch';
import 'babel-polyfill';

import $ from 'jquery';
import Navigo from 'navigo';
import Viz from './d3/viz';

(() => {
  // dirty hack avoiding babel to reorganise imports
  // semantic require window.jQuery to be set
  window.jQuery = $;
  global.jQuery = $;
  require('semantic-ui-dist/dist/semantic.min'); // eslint-disable-line
})();

const router = new Navigo(null, true);

const viz = new Viz('#viz', router);
viz.show();

router
  .on('w/:word/:lang', ({ word, lang }) => viz.selectWord(word, lang))
  .on('l/:lang', ({ lang }) => viz.selectLanguage(lang))
  .on('r/:lang1/:lang2', ({ lang1, lang2 }) => viz.selectLanguagePair(lang1, lang2))
  .resolve();

$('.ui.accordion').accordion({
  exclusive: false,
});

$('.menu .item').tab();

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
      viz.navigateToWord(word, lang);
    } else {
      viz.navigateToLanguage(lang);
    }
  },
});
