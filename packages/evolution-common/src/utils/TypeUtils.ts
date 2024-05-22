// this type will return all the properties of a type T that are not functions (exclude methods)
export type ExcludeFunctionPropertyNames<T> = Pick<
    T,
    {
        // eslint-disable-next-line @typescript-eslint/ban-types
        [K in keyof T]: T[K] extends Function ? never : K;
    }[keyof T]
>;
