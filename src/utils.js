// @flow

import $ from 'jquery';

function cloneTemplate(element) {
  const clone = element.clone();
  clone.removeClass('template');
  clone.addClass('notTemplate');
  clone.show();

  return clone;
}

function openPanel() {
  $('.ui.sidebar')
  	.sidebar({
      dimPage: false,
      closable: false
    })
    .sidebar('setting', 'transition', 'overlay')
    .sidebar('show');
}

function closePanel() {
  $('.ui.sidebar').sidebar('hide');
}

export { cloneTemplate, openPanel, closePanel };
