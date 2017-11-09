// @flow

import 'whatwg-fetch';
import 'babel-polyfill';
import $ from 'jquery';
import * as d3 from 'd3';
import Datamap from 'datamaps';

const onReload = module.onReload || (() => {});
onReload(() => {
  // eslint-disable-next-line
  console.info('hot reloading');
  // d3.select('#map').remove();
});

$('#content')
  .html('hello')
  .addClass('jq');

d3
  .select('body')
  .append('div')
  .text('world!')
  .attr('id', 'map');

const dm = new Datamap({
  element: document.getElementById('map'),
});
dm.legend();
