// @flow

import 'whatwg-fetch';
import 'babel-polyfill';

import $ from 'jquery';
import Viz from './d3/viz';

(() => {
  // dirty hack avoiding babel to reorganise imports
  // semantic require window.jQuery to set
  window.jQuery = $;
  global.jQuery = $;
  require('semantic-ui-dist/dist/semantic.min'); // eslint-disable-line
})();

const viz = new Viz('#viz');
viz.show();

$('.ui.accordion').accordion({
  exclusive: false,
});

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
      viz.asyncSelectWord(word, lang);
    } else {
      viz.asyncSelectLanguage(lang);
    }
  },
});
