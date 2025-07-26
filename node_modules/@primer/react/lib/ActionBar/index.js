'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var ActionBar$1 = require('./ActionBar.js');

const ActionBar = Object.assign(ActionBar$1.ActionBar, {
  IconButton: ActionBar$1.ActionBarIconButton,
  Divider: ActionBar$1.VerticalDivider
});

exports.ActionBar = ActionBar;
exports.default = ActionBar;
