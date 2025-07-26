'use strict';

var React = require('react');
var DefaultFeatureFlags = require('./DefaultFeatureFlags.js');

const FeatureFlagContext = /*#__PURE__*/React.createContext(DefaultFeatureFlags.DefaultFeatureFlags);

exports.FeatureFlagContext = FeatureFlagContext;
