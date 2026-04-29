export type TestData = Record<string, string>;

export function parseTestData(raw?: string): TestData {
  const data: TestData = {};
  for (const part of String(raw || '').split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!key || rest.length === 0) continue;
    data[key.trim()] = rest.join('=').trim();
  }
  return data;
}

export function firstDefined(data: TestData, keys: string[]): string | undefined {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== '') return data[key];
  }
  return undefined;
}
