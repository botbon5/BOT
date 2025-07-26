import type { ResponsiveValue } from '../../hooks/useResponsiveValue';
/**
 * Helper utility to get the value for a prop based on control args. This is
 * helpful when an arg can have both responsive values and a plain value. In
 * cases where both are defined, responsive values will take preference
 */
export declare function getResponsiveControlValues<T>(value: T, responsiveValue: ResponsiveValue<T>): T | ResponsiveValue<T>;
//# sourceMappingURL=getResponsiveControlValues.d.ts.map