// @flow

import _ from 'lodash';

const geojson = require('./world.geo.json');
const langNetwork = require('./lang_network.json');

Object.keys(langNetwork.from).forEach(key => {
  const filtered = langNetwork.from[key].filter(pair => pair[0] !== key);
  langNetwork.from[key] = _.sortBy(filtered, pair => -pair[1]);
});

langNetwork.fromProportion = { ...langNetwork.from };
Object.keys(langNetwork.fromProportion).forEach(key => {
  const size = _.sum(langNetwork.fromProportion[key].map(pair => pair[1]));
  langNetwork.fromProportion[key] = langNetwork.fromProportion[key].map(pair => [pair[0], pair[1] / size]);
});

Object.keys(langNetwork.to).forEach(key => {
  const filtered = langNetwork.to[key].filter(pair => pair[0] !== key);
  langNetwork.to[key] = _.sortBy(filtered, pair => -pair[1]);
});

langNetwork.toProportion = { ...langNetwork.to };
Object.keys(langNetwork.toProportion).forEach(key => {
  const size = _.sum(langNetwork.toProportion[key].map(pair => pair[1]));
  langNetwork.toProportion[key] = langNetwork.toProportion[key].map(pair => [pair[0], pair[1] / size]);
});

export { geojson, langNetwork };
