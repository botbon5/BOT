import React from 'react';
type Labelled = {
    'aria-label': string;
    'aria-labelledby'?: never;
} | {
    'aria-label'?: never;
    'aria-labelledby': string;
};
type ScrollableRegionProps = React.ComponentPropsWithoutRef<'div'> & Labelled;
declare function ScrollableRegion({ 'aria-label': label, 'aria-labelledby': labelledby, children, ...rest }: ScrollableRegionProps): React.JSX.Element;
export { ScrollableRegion };
export type { ScrollableRegionProps };
//# sourceMappingURL=ScrollableRegion.d.ts.map