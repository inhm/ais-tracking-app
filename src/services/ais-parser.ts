import { AISMessage, AISPosition, AISStaticData } from '../types/ais.types';

export class AISParser {
  private static readonly VESSEL_TYPES: { [key: number]: string } = {
    0: 'Not Available',
    20: 'Wing in Ground',
    21: 'Wing in Ground (Hazardous)',
    22: 'Wing in Ground (Reserved)',
    23: 'Wing in Ground (Reserved)',
    24: 'Wing in Ground (Reserved)',
    30: 'Fishing',
    31: 'Towing',
    32: 'Towing (Large)',
    33: 'Dredging',
    34: 'Diving',
    35: 'Military',
    36: 'Sailing',
    37: 'Pleasure Craft',
    40: 'High Speed Craft',
    41: 'High Speed Craft (Hazardous)',
    42: 'High Speed Craft (Reserved)',
    43: 'High Speed Craft (Reserved)',
    44: 'High Speed Craft (Reserved)',
    50: 'Pilot Vessel',
    51: 'Search and Rescue',
    52: 'Tug',
    53: 'Port Tender',
    54: 'Anti-pollution',
    55: 'Law Enforcement',
    56: 'Spare (Local)',
    57: 'Spare (Local)',
    58: 'Medical Transport',
    59: 'Non-combatant Ship',
    60: 'Passenger',
    61: 'Passenger (Hazardous)',
    62: 'Passenger (Reserved)',
    63: 'Passenger (Reserved)',
    64: 'Passenger (Reserved)',
    70: 'Cargo',
    71: 'Cargo (Hazardous)',
    72: 'Cargo (Reserved)',
    73: 'Cargo (Reserved)',
    74: 'Cargo (Reserved)',
    80: 'Tanker',
    81: 'Tanker (Hazardous)',
    82: 'Tanker (Reserved)',
    83: 'Tanker (Reserved)',
    84: 'Tanker (Reserved)',
    90: 'Other',
    91: 'Other (Hazardous)',
    92: 'Other (Reserved)',
    93: 'Other (Reserved)',
    94: 'Other (Reserved)',
  };

  static parseNMEA(nmeaString: string): AISMessage | null {
    try {
      const parts = nmeaString.split(',');
      if (parts.length < 6) return null;

      const payload = parts[5];
      if (!payload) return null;

      const messageType = this.extractMessageType(payload);
      const mmsi = this.extractMMSI(payload);

      if (!messageType || !mmsi) return null;

      const baseMessage: AISMessage = {
        messageType,
        mmsi,
        timestamp: new Date(),
        raw: nmeaString
      };

      switch (messageType) {
        case 1:
        case 2:
        case 3:
          return this.parsePositionMessage(payload, baseMessage);
        case 4:
          return this.parseBaseStationMessage(payload, baseMessage);
        case 5:
          return this.parseStaticDataMessage(payload, baseMessage);
        default:
          return baseMessage;
      }
    } catch (error) {
      console.error('Error parsing NMEA message:', error);
      return null;
    }
  }

  private static extractMessageType(payload: string): number | null {
    try {
      const bits = this.payloadToBits(payload);
      return this.extractBits(bits, 0, 6);
    } catch {
      return null;
    }
  }

  private static extractMMSI(payload: string): number | null {
    try {
      const bits = this.payloadToBits(payload);
      return this.extractBits(bits, 8, 30);
    } catch {
      return null;
    }
  }

  private static parsePositionMessage(payload: string, baseMessage: AISMessage): AISPosition {
    const bits = this.payloadToBits(payload);
    
    const navigationStatus = this.extractBits(bits, 38, 4);
    const rateOfTurn = this.extractSignedBits(bits, 42, 8);
    const speedOverGround = this.extractBits(bits, 50, 10) / 10;
    const positionAccuracy = this.extractBits(bits, 60, 1);
    const longitude = this.extractSignedBits(bits, 61, 28) / 600000;
    const latitude = this.extractSignedBits(bits, 89, 27) / 600000;
    const courseOverGround = this.extractBits(bits, 116, 12) / 10;
    const trueHeading = this.extractBits(bits, 128, 9);
    const timeStamp = this.extractBits(bits, 137, 6);

    return {
      ...baseMessage,
      latitude: latitude !== 91 ? latitude : undefined,
      longitude: longitude !== 181 ? longitude : undefined,
      speedOverGround: speedOverGround !== 1023 ? speedOverGround : undefined,
      courseOverGround: courseOverGround !== 3600 ? courseOverGround : undefined,
      trueHeading: trueHeading !== 511 ? trueHeading : undefined,
      navigationStatus: navigationStatus !== 15 ? navigationStatus : undefined,
      timestampUTC: timeStamp !== 60 ? new Date(Date.now() - (60 - timeStamp) * 1000) : undefined
    };
  }

  private static parseBaseStationMessage(payload: string, baseMessage: AISMessage): AISMessage {
    return baseMessage;
  }

  private static parseStaticDataMessage(payload: string, baseMessage: AISMessage): AISStaticData {
    const bits = this.payloadToBits(payload);
    
    const imoNumber = this.extractBits(bits, 70, 30);
    const callSign = this.extractString(bits, 70, 70);
    const vesselName = this.extractString(bits, 112, 120);
    const vesselType = this.extractBits(bits, 232, 8);
    const dimensionA = this.extractBits(bits, 240, 9);
    const dimensionB = this.extractBits(bits, 249, 9);
    const dimensionC = this.extractBits(bits, 258, 6);
    const dimensionD = this.extractBits(bits, 264, 6);
    const draught = this.extractBits(bits, 294, 8) / 10;
    const destination = this.extractString(bits, 302, 20);
    const eta = this.extractETA(bits, 274);

    return {
      ...baseMessage,
      imoNumber: imoNumber !== 0 ? imoNumber : undefined,
      callSign: callSign || undefined,
      vesselName: vesselName || undefined,
      vesselType: vesselType !== 0 ? vesselType : undefined,
      dimensions: {
        length: dimensionA + dimensionB || undefined,
        width: dimensionC + dimensionD || undefined,
        draught: draught !== 0 ? draught : undefined
      },
      destination: destination || undefined,
      eta: eta
    };
  }

  private static payloadToBits(payload: string): string {
    let bits = '';
    for (let i = 0; i < payload.length; i++) {
      const char = payload.charCodeAt(i);
      let value = char - 48;
      if (value > 40) value -= 8;
      bits += value.toString(2).padStart(6, '0');
    }
    return bits;
  }

  private static extractBits(bits: string, start: number, length: number): number {
    const substring = bits.substring(start, start + length);
    return parseInt(substring, 2);
  }

  private static extractSignedBits(bits: string, start: number, length: number): number {
    const substring = bits.substring(start, start + length);
    const value = parseInt(substring, 2);
    const signBit = 1 << (length - 1);
    return value & signBit ? value - (1 << length) : value;
  }

  private static extractString(bits: string, start: number, length: number): string {
    let result = '';
    for (let i = start; i < start + length; i += 6) {
      const charBits = bits.substring(i, i + 6);
      const charValue = parseInt(charBits, 2);
      if (charValue === 0) break;
      result += String.fromCharCode(charValue + 64);
    }
    return result.trim();
  }

  private static extractETA(bits: string, start: number): Date | undefined {
    const month = this.extractBits(bits, start, 4);
    const day = this.extractBits(bits, start + 4, 5);
    const hour = this.extractBits(bits, start + 9, 5);
    const minute = this.extractBits(bits, start + 14, 6);

    if (month === 0 || day === 0 || hour === 24 || minute === 60) {
      return undefined;
    }

    const currentYear = new Date().getFullYear();
    return new Date(currentYear, month - 1, day, hour, minute);
  }

  static getVesselTypeName(vesselType: number): string {
    return this.VESSEL_TYPES[vesselType] || 'Unknown';
  }
}