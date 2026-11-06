import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const STORE_AUTH = 'tsf_authorization';
const STORE_DEVICE_ID = 'tsf_device_id';
const STORE_DEVICE_KEY = 'tsf_device_key';
const MAX_SECURE_LENGTH = 2000;

export interface RailwayCredentials {
  authorization: string;
  deviceId: string;
  deviceKey: string;
}

export interface RailwaySessionSnapshot {
  hasAuthorization: boolean;
  hasDeviceId: boolean;
  hasDeviceKey: boolean;
  bridgeReady: boolean;
}

export interface PageGetResult {
  status: number;
  text: string;
}

interface Bridge {
  inject: (js: string) => void;
}

interface PendingGet {
  resolve: (result: PageGetResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export function sanitizeHeaderValue(value: unknown): string {
  if (value == null) return '';
  let text = String(value).trim();
  if (!text || text === 'null' || text === 'undefined' || text === '[HIDDEN]') return '';
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }
  return text;
}

export function sanitizeCityForApi(raw: string): string {
  const stripped = String(raw || '')
    .replace(/\b(railway station|station|junction|jn)\b\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.replace(/ /g, '_');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readSecure(key: string): Promise<string> {
  try {
    return sanitizeHeaderValue(await SecureStore.getItemAsync(key));
  } catch {
    return '';
  }
}

async function writeSecure(key: string, value: string): Promise<void> {
  try {
    if (!value) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
    if (value.length > MAX_SECURE_LENGTH) return;
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Session still lives in memory for this run.
  }
}

class RailwaySessionStore {
  private creds: RailwayCredentials = { authorization: '', deviceId: '', deviceKey: '' };
  private bridge: Bridge | null = null;
  private bridgeReady = false;
  private pending = new Map<string, PendingGet>();
  private listeners = new Set<() => void>();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private hydrated: Promise<void>;

  constructor() {
    this.hydrated = this.hydrate();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): RailwaySessionSnapshot {
    return {
      hasAuthorization: Boolean(this.creds.authorization),
      hasDeviceId: Boolean(this.creds.deviceId),
      hasDeviceKey: Boolean(this.creds.deviceKey),
      bridgeReady: this.bridgeReady,
    };
  }

  getCredentials(): RailwayCredentials {
    return { ...this.creds };
  }

  attach(bridge: Bridge): void {
    this.bridge = bridge;
  }

  detach(bridge: Bridge): void {
    if (this.bridge !== bridge) return;
    this.bridge = null;
    this.bridgeReady = false;
    this.rejectAll(new Error('Network error'));
    this.emit();
  }

  markReady(): void {
    if (this.bridgeReady) {
      this.pushAuthToPage();
      return;
    }
    this.bridgeReady = true;
    this.pushAuthToPage();
    this.emit();
  }

  applyCaptured(partial: Partial<RailwayCredentials>): void {
    const next: RailwayCredentials = { ...this.creds };
    const authorization = sanitizeHeaderValue(partial.authorization);
    const deviceId = sanitizeHeaderValue(partial.deviceId);
    const deviceKey = sanitizeHeaderValue(partial.deviceKey);
    // Empty fields mean "not seen yet". They must not wipe a session already saved.
    if (authorization) next.authorization = authorization;
    if (deviceId) next.deviceId = deviceId;
    if (deviceKey) next.deviceKey = deviceKey;
    if (
      next.authorization === this.creds.authorization &&
      next.deviceId === this.creds.deviceId &&
      next.deviceKey === this.creds.deviceKey
    ) {
      return;
    }
    this.creds = next;
    this.schedulePersist();
    this.emit();
  }

  setCredentials(authorization: string, deviceId: string, deviceKey: string): void {
    this.applyCaptured({ authorization, deviceId, deviceKey });
    this.pushAuthToPage();
  }

  clearAuthorization(): void {
    if (!this.creds.authorization) return;
    this.creds = { ...this.creds, authorization: '' };
    this.schedulePersist();
    this.emit();
  }

  completeGet(id: string, result: PageGetResult): void {
    const pending = this.pending.get(id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(id);
    pending.resolve(result);
  }

  failGet(id: string, message: string): void {
    const pending = this.pending.get(id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(id);
    pending.reject(new Error(message || 'Network error'));
  }

  canUseBridge(): boolean {
    return Boolean(this.bridge && this.bridgeReady);
  }

  async pageGet(url: string, timeoutMs = 20000): Promise<PageGetResult> {
    if (!this.bridge || !this.bridgeReady) {
      throw new Error('BRIDGE');
    }
    const id = Math.random().toString(36).slice(2);
    const result = new Promise<PageGetResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Network error'));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
    });
    const js =
      `(function(){` +
      `function go(){` +
      `if(!window.__tsfRunGet){setTimeout(go,100);return;}` +
      `window.__tsfRunGet(${JSON.stringify(id)}, ${JSON.stringify(url)});` +
      `}` +
      `go();})();true;`;
    this.bridge.inject(js);
    return result;
  }

  async nativeGet(url: string): Promise<PageGetResult> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: 'https://eticket.railway.gov.bd',
      Referer: 'https://eticket.railway.gov.bd/',
    };
    if (this.creds.authorization) headers.Authorization = this.creds.authorization;
    if (this.creds.deviceId) headers['X-Device-Id'] = this.creds.deviceId;
    if (this.creds.deviceKey) headers['X-Device-Key'] = this.creds.deviceKey;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
      const text = await response.text();
      return { status: response.status, text: text.length > 500000 ? text.slice(0, 500000) : text };
    } catch {
      throw new Error('Network error');
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Same retry rules as the extension: 401/403 and most 4xx stop immediately,
   * 429 and 5xx wait and try again. The in-page request is preferred because
   * that is where the extension's XMLHttpRequest runs.
   */
  async fetchJson(url: string): Promise<any> {
    await this.hydrated;
    if (!this.creds.authorization) {
      throw Object.assign(new Error('SESSION_EXPIRED'), { fatal: true });
    }

    let lastErr: Error = new Error('Failed');
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await this.requestOnce(url);
        if (response.status === 200) {
          try {
            return JSON.parse(response.text);
          } catch {
            throw Object.assign(new Error('The railway server returned an unreadable response.'), { fatal: true });
          }
        }
        if (response.status === 401 || response.status === 403) {
          this.clearAuthorization();
          throw Object.assign(new Error('SESSION_EXPIRED'), { fatal: true });
        }
        const message = explainStatus(response);
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw Object.assign(new Error(message), { fatal: true });
        }
        lastErr = new Error(message);
      } catch (error) {
        const err = error as Error & { fatal?: boolean };
        if (err.fatal) throw err;
        lastErr = err;
      }
      await sleep(3000 * attempt);
    }
    throw lastErr;
  }

  private async requestOnce(url: string): Promise<PageGetResult> {
    if (this.canUseBridge()) {
      try {
        return await this.pageGet(url);
      } catch (error) {
        const message = (error as Error).message || '';
        if (message !== 'BRIDGE' && message !== 'Network error') throw error;
      }
    }
    return this.nativeGet(url);
  }

  private pushAuthToPage(): void {
    if (!this.bridge || !this.bridgeReady) return;
    if (!this.creds.authorization && !this.creds.deviceId && !this.creds.deviceKey) return;
    const payload = JSON.stringify({
      authorization: this.creds.authorization,
      deviceId: this.creds.deviceId,
      deviceKey: this.creds.deviceKey,
    });
    this.bridge.inject(
      `(function(){if(window.__tsfSetAuth)window.__tsfSetAuth(${payload});})();true;`
    );
  }

  private async hydrate(): Promise<void> {
    const [authorization, deviceId, deviceKey] = await Promise.all([
      readSecure(STORE_AUTH),
      readSecure(STORE_DEVICE_ID),
      readSecure(STORE_DEVICE_KEY),
    ]);
    const next = { ...this.creds };
    if (!next.authorization && authorization) next.authorization = authorization;
    if (!next.deviceId && deviceId) next.deviceId = deviceId;
    if (!next.deviceKey && deviceKey) next.deviceKey = deviceKey;
    const changed =
      next.authorization !== this.creds.authorization ||
      next.deviceId !== this.creds.deviceId ||
      next.deviceKey !== this.creds.deviceKey;
    this.creds = next;
    if (changed) {
      this.pushAuthToPage();
      this.emit();
    }
  }

  private schedulePersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void writeSecure(STORE_AUTH, this.creds.authorization);
      void writeSecure(STORE_DEVICE_ID, this.creds.deviceId);
      void writeSecure(STORE_DEVICE_KEY, this.creds.deviceKey);
    }, 300);
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

function explainStatus(response: PageGetResult): string {
  if (response.status === 422) {
    return 'The railway site rejected a lookup (HTTP 422). Check the station spelling.';
  }
  let detail = '';
  try {
    const body = JSON.parse(response.text) as { error?: { message?: string }; message?: string };
    detail = body?.error?.message || body?.message || '';
  } catch {
    detail = '';
  }
  if (detail) return `HTTP ${response.status}: ${detail}`;
  return `HTTP ${response.status}`;
}

export const railwaySession = new RailwaySessionStore();

export function useRailwaySession(): RailwaySessionSnapshot {
  const [snapshot, setSnapshot] = useState<RailwaySessionSnapshot>(() => railwaySession.getSnapshot());
  useEffect(() => railwaySession.subscribe(() => setSnapshot(railwaySession.getSnapshot())), []);
  return snapshot;
}
