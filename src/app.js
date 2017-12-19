// @flow

import 'whatwg-fetch';
import 'babel-polyfill';

import $ from 'jquery';
import Viz from './viz';

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

const allVisu = [new Viz('#viz')];
allVisu.forEach(v => v.addAllLanguagesPoints());
