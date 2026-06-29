import { DefaultNamingStrategy, NamingStrategyInterface } from "typeorm";

const snake = (s: string): string =>
  s
    .replace(/([a-z\d])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();

// snake_case columns/tables so analytics SQL stays unquoted:
//   SELECT lesson_id, count(*) FROM tts_requests GROUP BY lesson_id;
export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  tableName(className: string, customName?: string): string {
    return customName || snake(className);
  }

  columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
    return snake([...embeddedPrefixes, customName || propertyName].join("_"));
  }

  relationName(propertyName: string): string {
    return snake(propertyName);
  }
}
