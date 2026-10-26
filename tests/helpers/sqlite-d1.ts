// D1 de teste sobre SQLite real (node:sqlite): ao contrário do D1 falso de worker.test.ts,
// executa o SQL de verdade, então serve para validar consultas novas.
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

type Param = string | number | null;

function clean(params: unknown[]): Param[] {
  return params.map((p) => (p === undefined ? null : (p as Param)));
}

export function createSqliteD1(): { db: D1Database; raw: DatabaseSync } {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync(path.join(here, '..', '..', 'migrations', '0001_init.sql'), 'utf-8'));

  const prepare = (sql: string) => {
    let bound: Param[] = [];
    const stmt = {
      bind(...params: unknown[]) {
        bound = clean(params);
        return stmt;
      },
      async first<T>() {
        return (raw.prepare(sql).get(...bound) as T | undefined) ?? null;
      },
      async all<T>() {
        return { results: raw.prepare(sql).all(...bound) as T[], success: true, meta: {} };
      },
      async run() {
        const info = raw.prepare(sql).run(...bound);
        return { success: true, meta: { changes: Number(info.changes) } };
      }
    };
    return stmt;
  };

  return { db: { prepare } as unknown as D1Database, raw };
}

/** Insere um repositório mínimo no catálogo (todas as colunas NOT NULL preenchidas). */
export function insertCatalogRepo(raw: DatabaseSync, fullName: string): void {
  const [owner, name] = fullName.split('/');
  raw
    .prepare(
      `INSERT INTO repositories (
        repo_key, full_name, owner, name, repo_url, category, template_type, hook_title,
        intro_text, features_json, scenario_title, scenario_intro, scenario_prompt,
        scenario_steps_json, killer_title, killer_text, summary_text, punchline, whatsapp_text
      ) VALUES (?, ?, ?, ?, ?, 'Outros', 'app-tool', 'h', 'i', '[]', 's', 's', 's', '[]', 'k', 'k', 's', 'p', 'w')`
    )
    .run(fullName.toLowerCase(), fullName, owner, name, `https://github.com/${fullName}`);
}
