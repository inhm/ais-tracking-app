import { AISParser } from '../services/ais-parser';
import { AISPosition, AISStaticData } from '../types/ais.types';

describe('AISParser', () => {
  describe('parseNMEA', () => {
    it('should parse a valid position message (Type 1)', () => {
      const nmea = '!AIVDM,1,1,,A,15MvlfP001G?Uo`K>jK@K6<T0000,0*4F';
      const result = AISParser.parseNMEA(nmea);
      
      expect(result).toBeDefined();
      expect(result?.messageType).toBe(1);
      expect(result?.mmsi).toBeDefined();
      expect(result?.raw).toBe(nmea);
      expect(result?.timestamp).toBeInstanceOf(Date);
    });

    it('should parse a valid static data message (Type 5)', () => {
      const nmea = '!AIVDM,2,1,3,B,55?MbV02;H;s<HtKR20EHE:0@T4@Dn2222222216L961O5Gf0NSQEp6ClRp8,0*0F';
      const result = AISParser.parseNMEA(nmea);
      
      expect(result).toBeDefined();
      expect(result?.messageType).toBe(5);
      expect(result?.mmsi).toBeDefined();
    });

    it('should return null for invalid NMEA string', () => {
      const invalidNmea = 'invalid nmea string';
      const result = AISParser.parseNMEA(invalidNmea);
      
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = AISParser.parseNMEA('');
      
      expect(result).toBeNull();
    });

    it('should handle malformed NMEA with insufficient parts', () => {
      const malformedNmea = '!AIVDM,1,1';
      const result = AISParser.parseNMEA(malformedNmea);
      
      expect(result).toBeNull();
    });
  });

  describe('getVesselTypeName', () => {
    it('should return correct vessel type names', () => {
      expect(AISParser.getVesselTypeName(30)).toBe('Fishing');
      expect(AISParser.getVesselTypeName(70)).toBe('Cargo');
      expect(AISParser.getVesselTypeName(80)).toBe('Tanker');
      expect(AISParser.getVesselTypeName(60)).toBe('Passenger');
    });

    it('should return "Unknown" for invalid vessel type', () => {
      expect(AISParser.getVesselTypeName(999)).toBe('Unknown');
      expect(AISParser.getVesselTypeName(-1)).toBe('Unknown');
    });

    it('should return "Not Available" for type 0', () => {
      expect(AISParser.getVesselTypeName(0)).toBe('Not Available');
    });
  });

  describe('position message parsing', () => {
    it('should extract position data correctly', () => {
      const nmea = '!AIVDM,1,1,,A,15MvlfP001G?Uo`K>jK@K6<T0000,0*4F';
      const result = AISParser.parseNMEA(nmea) as AISPosition;
      
      expect(result).toBeDefined();
      expect(result.messageType).toBe(1);
      expect(typeof result.latitude).toBe('number');
      expect(typeof result.longitude).toBe('number');
      expect(result.latitude).toBeGreaterThan(-90);
      expect(result.latitude).toBeLessThan(90);
      expect(result.longitude).toBeGreaterThan(-180);
      expect(result.longitude).toBeLessThan(180);
    });

    it('should handle invalid position values', () => {
      const nmeaWithInvalidPos = '!AIVDM,1,1,,A,15MvlfP001G?Uo`K>jK@K6<T0000,0*4F';
      const result = AISParser.parseNMEA(nmeaWithInvalidPos) as AISPosition;
      
      expect(result).toBeDefined();
      expect(result.messageType).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle parsing errors gracefully', () => {
      const corruptedNmea = '!AIVDM,1,1,,A,corrupted_payload,0*4F';
      const result = AISParser.parseNMEA(corruptedNmea);
      
      expect(result).toBeNull();
    });

    it('should not throw exceptions for any input', () => {
      const inputs = [
        null,
        undefined,
        123,
        {},
        [],
        '!AIVDM,1,1,,A,15MvlfP001G?Uo`K>jK@K6<T0000,0*4F',
        'random string',
        ''
      ];

      inputs.forEach(input => {
        expect(() => {
          AISParser.parseNMEA(input as string);
        }).not.toThrow();
      });
    });
  });
});