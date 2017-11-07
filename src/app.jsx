// @flow

import 'whatwg-fetch';
import 'babel-polyfill';

import React from 'react';
import {render} from 'react-dom';


class Viz extends React.Component {

  render() {
    const { value } = this.props;
    return <strong>Hello { value }</strong>;
  }

}

render(
  <Viz value={'world'} />,
  document.getElementById('react')
);
