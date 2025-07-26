export type FeatureFlags = {
    [key: string]: boolean | undefined;
};
export declare class FeatureFlagScope {
    static create(flags?: FeatureFlags): FeatureFlagScope;
    static merge(a: FeatureFlagScope, b: FeatureFlagScope): FeatureFlagScope;
    flags: Map<string, boolean>;
    constructor(flags?: FeatureFlags);
    /**
     * Enable a feature flag
     */
    enable(name: string): void;
    /**
     * Disable a feature flag
     */
    disable(name: string): void;
    /**
     * Check if a feature flag is enabled
     */
    enabled(name: string): boolean;
}
//# sourceMappingURL=FeatureFlagScope.d.ts.map