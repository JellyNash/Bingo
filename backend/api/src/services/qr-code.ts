import QRCode from 'qrcode';
import { config } from '../config.js';

class QRCodeService {
  private cache = new Map<string, { data: string; timestamp: number }>();
  private readonly ttl = (Number(process.env.QR_CACHE_MINUTES ?? '60')) * 60 * 1000;

  async generateGameQRCode(pin: string): Promise<string> {
    const cacheKey = pin;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    const joinUrl = `${config.playerAppUrl.replace(/\/$/, '')}/join?pin=${pin}`;
    const dataUrl = await QRCode.toDataURL(joinUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 240,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    this.cache.set(cacheKey, { data: dataUrl, timestamp: Date.now() });
    return dataUrl;
  }
}

export const qrCodeService = new QRCodeService();
