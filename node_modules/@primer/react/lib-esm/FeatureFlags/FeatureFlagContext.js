import { createContext } from 'react';
import { DefaultFeatureFlags } from './DefaultFeatureFlags.js';

const FeatureFlagContext = /*#__PURE__*/createContext(DefaultFeatureFlags);

export { FeatureFlagContext };
