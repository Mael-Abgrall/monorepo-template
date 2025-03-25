import { v5 } from 'uuid';
import { environment } from './environment';

/**
 * Generate a v5 UUID using the domain as the namespace
 * @param root named parameter
 * @param root.name the name of the entity to generate a UUID for
 * @returns a v5 UUID
 */
export function uuidV5({ name }: { name: string }): string {
  const namespace = v5(environment.DOMAIN, v5.DNS);
  return v5(name, namespace);
}
