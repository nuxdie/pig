/* ---- persistence: localStorage where allowed, memory where not ---- */

export const KEY_RUN = 'pig.run.v1';
export const KEY_REC = 'pig.record.v1';

function build() {
  const mem: Record<string, string> = {};
  let live = false;
  try {
    const probe = '__pig_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    live = true;
  } catch { live = false; }

  return {
    live,
    get(k: string): string | null {
      try { return live ? window.localStorage.getItem(k) : (mem[k] ?? null); }
      catch { return mem[k] ?? null; }
    },
    set(k: string, v: string): void {
      try { if (live) window.localStorage.setItem(k, v); else mem[k] = v; }
      catch { mem[k] = v; }
    },
    del(k: string): void {
      try { if (live) window.localStorage.removeItem(k); else delete mem[k]; }
      catch { delete mem[k]; }
    }
  };
}

export const STORE = build();
