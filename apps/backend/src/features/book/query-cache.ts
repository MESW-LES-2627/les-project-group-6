/**
 * What the catalogue needs from a cache. `LRUCache` from lru-cache already has this
 * shape; a Redis or Valkey class with the same two methods can replace it when the
 * backend runs on more than one instance.
 */
export interface QueryCache<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): unknown;
}
