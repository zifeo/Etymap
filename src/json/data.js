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

langNetwork.relation = {};
langNetwork.relationProportion = {};

const allLanguages = Array.from(new Set([...Object.keys(langNetwork.from), ...Object.keys(langNetwork.to)]));
allLanguages.forEach(iso => {
	const allRelatedIsocodes = new Set();
	if (!langNetwork.from[iso])
		langNetwork.from[iso] = [];

	langNetwork.from[iso].forEach(pair => allRelatedIsocodes.add(pair[0]));

	if (!langNetwork.to[iso])
		langNetwork.to[iso] = [];

	langNetwork.to[iso].forEach(pair => allRelatedIsocodes.add(pair[0]));

	langNetwork.relation[iso] = {};
	let sum = 0;
	allRelatedIsocodes.forEach(otherIso => {
		langNetwork.relation[iso][otherIso] = 0;

		const valuesFrom = langNetwork.from[iso].filter(pair => pair[0] === otherIso);
		if (valuesFrom.length > 0) {
			langNetwork.relation[iso][otherIso] += valuesFrom[0][1];
			sum  += valuesFrom[0][1];
		}
			


		const valuesTo = langNetwork.to[iso].filter(pair => pair[0] === otherIso);
		if (valuesTo.length > 0) {
			langNetwork.relation[iso][otherIso] += valuesTo[0][1];
			sum  += valuesTo[0][1];
		}
	});

	langNetwork.relationProportion[iso] = { ...langNetwork.relation[iso] };
	allRelatedIsocodes.forEach(otherIso => {
		langNetwork.relationProportion[iso][otherIso] /= sum;
	});
});

export { geojson, langNetwork, allLanguages};
