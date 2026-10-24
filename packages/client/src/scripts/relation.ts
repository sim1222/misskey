export type EndoRelation<T> = (left: T, right: T) => boolean;
export type Predicate<T> = (value: T) => boolean;
