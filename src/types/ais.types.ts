export interface AISMessage {
  messageType: number;
  mmsi: number;
  timestamp: Date;
  raw: string;
}

export interface AISPosition extends AISMessage {
  latitude?: number;
  longitude?: number;
  speedOverGround?: number;
  courseOverGround?: number;
  trueHeading?: number;
  navigationStatus?: number;
  timestampUTC?: Date;
}

export interface AISStaticData extends AISMessage {
  imoNumber?: number;
  callSign?: string;
  vesselName?: string;
  vesselType?: number;
  dimensions?: {
    length?: number;
    width?: number;
    draught?: number;
  };
  destination?: string;
  eta?: Date;
}

export interface Ship {
  mmsi: number;
  imoNumber?: number;
  callSign?: string;
  vesselName?: string;
  vesselType?: number;
  vesselTypeName?: string;
  dimensions?: {
    length?: number;
    width?: number;
    draught?: number;
  };
  destination?: string;
  eta?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemHealth {
  isAISConnected: boolean;
  messageCount: number;
  shipCount: number;
  positionUpdates: number;
  positionCount: number;
  lastMessageTime?: Date;
}