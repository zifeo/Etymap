// @flow

import 'whatwg-fetch';
import 'babel-polyfill';

import $ from 'jquery';
import Navigo from 'Navigo';
import Viz from './d3/viz';

(() => {
  // dirty hack avoiding babel to reorganise imports
  // semantic require window.jQuery to be set
  window.jQuery = $;
  global.jQuery = $;
  require('semantic-ui-dist/dist/semantic.min'); // eslint-disable-line
})();

const viz = new Viz('#viz');
viz.show();

const router = new Navigo(null, true);

router
  .on('w/:word/:lang', ({word, lang}) => viz.asyncSelectWord(word, lang))
  .on('l/:lang', ({lang}) => {
    console.log('->', lang)
    viz.asyncSelectLanguage(lang).then(() => console.log('achanged'));
  })
  .on('r/:lang1/:lang2', ({lang1, lang2}) => viz.asyncSelectLanguagePair(lang1, lang2))
    .resolve();


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
