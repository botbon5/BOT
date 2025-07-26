/**
 * Create a callback that can be used within an effect without re-running the
 * effect when the values used change. The callback passed to this hook will
 * always see the latest snapshot of values that it uses and does not need to
 * use a dependency array.
 */
export declare function useEffectCallback<T extends (...args: any) => any>(callback: T): (...args: Parameters<T>) => ReturnType<T>;
//# sourceMappingURL=useEffectCallback.d.ts.map