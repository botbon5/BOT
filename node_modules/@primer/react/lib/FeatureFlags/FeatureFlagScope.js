'use strict';

class FeatureFlagScope {
  static create(flags) {
    return new FeatureFlagScope(flags);
  }
  static merge(a, b) {
    const merged = new FeatureFlagScope();
    for (const [key, value] of a.flags) {
      merged.flags.set(key, value);
    }
    for (const [key, value] of b.flags) {
      merged.flags.set(key, value);
    }
    return merged;
  }
  constructor(flags = {}) {
    this.flags = new Map();
    for (const [key, value] of Object.entries(flags)) {
      this.flags.set(key, value !== null && value !== void 0 ? value : false);
    }
  }

  /**
   * Enable a feature flag
   */
  enable(name) {
    this.flags.set(name, true);
  }

  /**
   * Disable a feature flag
   */
  disable(name) {
    this.flags.set(name, false);
  }

  /**
   * Check if a feature flag is enabled
   */
  enabled(name) {
    var _this$flags$get;
    return (_this$flags$get = this.flags.get(name)) !== null && _this$flags$get !== void 0 ? _this$flags$get : false;
  }
}

exports.FeatureFlagScope = FeatureFlagScope;
