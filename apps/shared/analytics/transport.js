import { QueueStorage } from './storage';
const DEFAULT_FLUSH_INTERVAL = 5000;
const DEFAULT_MAX_BATCH = 50;
const MAX_RETRIES = 3;
const BACKOFF_BASE = 250;
const BACKOFF_MAX = 10000;
// Token patterns to redact
const REDACTION_PATTERNS = [
    /token/i,
    /secret/i,
    /password/i,
    /api[_-]?key/i,
    /auth/i,
    /credential/i
];
export class AnalyticsClient {
    config = {
        baseUrl: '',
        app: 'player',
        flushInterval: DEFAULT_FLUSH_INTERVAL,
        maxBatch: DEFAULT_MAX_BATCH,
        dntRespect: true,
        enabled: true,
        debug: false
    };
    context = {};
    queue = new QueueStorage();
    flushTimer;
    isOnline = true;
    isFlushing = false;
    retryTimeout;
    privacySettings = {
        optOut: false,
        dnt: false
    };
    constructor() {
        // Check for Do Not Track
        if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') {
            this.privacySettings.dnt = true;
        }
        // Check for stored opt-out preference
        if (typeof localStorage !== 'undefined') {
            const optOut = localStorage.getItem('analytics-opt-out');
            if (optOut === 'true') {
                this.privacySettings.optOut = true;
            }
        }
        // Listen for online/offline events
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                this.isOnline = true;
                this.flush();
            });
            window.addEventListener('offline', () => {
                this.isOnline = false;
            });
            // Flush on page visibility change
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.flush({ sync: true });
                }
            });
            // Flush before unload
            window.addEventListener('beforeunload', () => {
                this.flush({ sync: true });
            });
        }
    }
    init(config) {
        this.config = { ...this.config, ...config };
        if (this.config.baseUrl) {
            this.config.baseUrl = this.config.baseUrl.replace(/\/$/, '');
        }
        if (this.config.debug) {
            console.log('[Analytics] Initialized with config:', this.config);
        }
        // Start flush timer
        this.startFlushTimer();
    }
    setContext(ctx) {
        this.context = { ...this.context, ...ctx };
        if (this.config.debug) {
            console.log('[Analytics] Context updated:', this.context);
        }
    }
    async track(name, props = {}) {
        // Check privacy settings
        if (!this.shouldTrack()) {
            if (this.config.debug) {
                console.log('[Analytics] Event blocked by privacy settings:', name);
            }
            return;
        }
        // Redact sensitive properties
        const cleanProps = this.redactSensitiveData(props);
        // Create event
        const event = {
            id: this.generateId(),
            ts: Date.now(),
            app: this.config.app || 'player',
            name,
            env: this.config.env || 'offline',
            dnt: this.privacySettings.dnt,
            ...this.context,
            ctx: this.getClientContext(),
            props: cleanProps,
            queuedAt: Date.now()
        };
        if (this.config.debug) {
            console.log('[Analytics] Event tracked:', event);
        }
        // Queue event
        await this.queue.push(event);
        // Check if we should flush
        const count = await this.queue.count();
        if (count >= (this.config.maxBatch || DEFAULT_MAX_BATCH)) {
            this.flush();
        }
    }
    async flush(options) {
        if (!this.config.enabled || !this.config.baseUrl || this.isFlushing) {
            return;
        }
        if (!this.isOnline && !options?.sync) {
            if (this.config.debug) {
                console.log('[Analytics] Offline, skipping flush');
            }
            return;
        }
        this.isFlushing = true;
        try {
            const batch = await this.queue.drain(this.config.maxBatch || DEFAULT_MAX_BATCH);
            if (batch.length === 0) {
                this.isFlushing = false;
                return;
            }
            if (this.config.debug) {
                console.log(`[Analytics] Flushing ${batch.length} events`);
            }
            // Send batch
            await this.sendBatch(batch, options);
        }
        catch (err) {
            console.error('[Analytics] Flush error:', err);
            // Events are already dequeued, they're lost
        }
        finally {
            this.isFlushing = false;
        }
    }
    async sendBatch(batch, options) {
        const url = `${this.config.baseUrl}/analytics/events`;
        const body = JSON.stringify(batch);
        // Prepare headers
        const headers = {
            'Content-Type': 'application/json'
        };
        // Add HMAC signature if configured
        if (this.config.hmacKey) {
            const signature = await this.computeHMAC(body, this.config.hmacKey);
            headers['X-Analytics-Signature'] = `sha256=${signature}`;
        }
        // Prepare fetch options
        const fetchOptions = {
            method: 'POST',
            headers,
            body
        };
        // Use keepalive for sync flush (beforeunload)
        if (options?.sync && 'keepalive' in Request.prototype) {
            fetchOptions.keepalive = true;
        }
        try {
            const response = await fetch(url, fetchOptions);
            if (!response.ok && response.status >= 500) {
                // Server error, should retry
                throw new Error(`Server error: ${response.status}`);
            }
            if (this.config.debug) {
                console.log('[Analytics] Batch sent successfully');
            }
        }
        catch (err) {
            if (this.config.debug) {
                console.error('[Analytics] Send failed:', err);
            }
            // Schedule retry with backoff
            this.scheduleRetry(batch);
            throw err;
        }
    }
    scheduleRetry(batch) {
        // Re-queue events for retry
        batch.forEach(event => {
            event.retries = (event.retries || 0) + 1;
            if (event.retries <= MAX_RETRIES) {
                this.queue.push(event);
            }
        });
        // Schedule flush with backoff
        const delay = Math.min(BACKOFF_BASE * Math.pow(2, batch[0]?.retries || 0), BACKOFF_MAX);
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
        }
        this.retryTimeout = window.setTimeout(() => {
            this.flush();
        }, delay);
    }
    async computeHMAC(data, key) {
        try {
            const encoder = new TextEncoder();
            const keyData = encoder.encode(key);
            const messageData = encoder.encode(data);
            const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
            const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
            // Convert to hex string
            return Array.from(new Uint8Array(signature))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        }
        catch (err) {
            console.error('[Analytics] HMAC computation failed:', err);
            return '';
        }
    }
    shouldTrack() {
        if (!this.config.enabled)
            return false;
        if (this.privacySettings.optOut)
            return false;
        if (this.config.dntRespect && this.privacySettings.dnt)
            return false;
        if (typeof window !== 'undefined' && window.analyticsOptOut === true)
            return false;
        return true;
    }
    redactSensitiveData(data) {
        const cleaned = {};
        for (const [key, value] of Object.entries(data)) {
            // Check if key matches redaction patterns
            const shouldRedact = REDACTION_PATTERNS.some(pattern => pattern.test(key));
            if (shouldRedact) {
                cleaned[key] = '[REDACTED]';
            }
            else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // Recursively clean nested objects
                cleaned[key] = this.redactSensitiveData(value);
            }
            else {
                cleaned[key] = value;
            }
        }
        return cleaned;
    }
    getClientContext() {
        const ctx = {};
        if (typeof navigator !== 'undefined') {
            // User agent summary (browser and version only)
            const ua = navigator.userAgent;
            const browser = this.detectBrowser(ua);
            if (browser) {
                ctx.browser = browser;
            }
            // Platform
            ctx.platform = navigator.platform || 'unknown';
            // Language
            ctx.language = navigator.language;
            // Screen resolution
            if (typeof screen !== 'undefined') {
                ctx.screen = {
                    width: screen.width,
                    height: screen.height,
                    pixelRatio: window.devicePixelRatio || 1
                };
            }
        }
        // App version from config or env
        ctx.version = this.config.app;
        return ctx;
    }
    detectBrowser(ua) {
        if (ua.includes('Firefox/')) {
            const match = ua.match(/Firefox\/(\d+)/);
            return match ? `Firefox/${match[1]}` : 'Firefox';
        }
        if (ua.includes('Chrome/')) {
            const match = ua.match(/Chrome\/(\d+)/);
            return match ? `Chrome/${match[1]}` : 'Chrome';
        }
        if (ua.includes('Safari/') && !ua.includes('Chrome')) {
            const match = ua.match(/Version\/(\d+)/);
            return match ? `Safari/${match[1]}` : 'Safari';
        }
        if (ua.includes('Edge/')) {
            const match = ua.match(/Edge\/(\d+)/);
            return match ? `Edge/${match[1]}` : 'Edge';
        }
        return null;
    }
    generateId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback UUID v4 implementation
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
    startFlushTimer() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        this.flushTimer = window.setInterval(() => {
            this.flush();
        }, this.config.flushInterval || DEFAULT_FLUSH_INTERVAL);
    }
    // Public methods for privacy control
    setOptOut(optOut) {
        this.privacySettings.optOut = optOut;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('analytics-opt-out', optOut.toString());
        }
        if (optOut) {
            // Clear any queued events when opting out
            this.queue.clear();
        }
    }
    getPrivacySettings() {
        return { ...this.privacySettings };
    }
    async getQueueSize() {
        return this.queue.count();
    }
    async clearQueue() {
        return this.queue.clear();
    }
}
