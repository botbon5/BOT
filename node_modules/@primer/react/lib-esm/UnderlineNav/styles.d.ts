import type { Theme } from '../ThemeProvider';
import type { BetterSystemStyleObject } from '../sx';
export declare const getDividerStyle: (theme?: Theme) => {
    display: string;
    borderLeft: string;
    width: string;
    borderLeftColor: string;
    marginRight: number;
    height: string;
};
export declare const moreBtnStyles: {
    margin: number;
    border: number;
    background: string;
    fontWeight: string;
    boxShadow: string;
    paddingY: number;
    paddingX: number;
    '& > span[data-component="trailingVisual"]': {
        marginLeft: number;
    };
};
export declare const menuItemStyles: {
    '& > span': {
        display: string;
    };
    textDecoration: string;
};
export declare const baseMenuMinWidth = 192;
export declare const baseMenuStyles: BetterSystemStyleObject;
/**
 *
 * @param containerRef The Menu List Container Reference.
 * @param listRef The Underline Nav Container Reference.
 * @description This calculates the position of the menu
 */
export declare const menuStyles: (containerRef: Element | null, listRef: Element | null) => BetterSystemStyleObject;
//# sourceMappingURL=styles.d.ts.map