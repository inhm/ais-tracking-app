import { Socket } from 'net';
import { EventEmitter } from 'events';
import { AISMessage } from '../types/ais.types';
import { AISParser } from './ais-parser';

export class AISClient extends EventEmitter {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private buffer = '';

  constructor(
    private host: string = '153.44.253.27',
    private port: number = 5631
  ) {
    super();
  }

  connect(): void {
    if (this.isConnected) {
      return;
    }

    this.socket = new Socket();
    
    this.socket.connect(this.port, this.host, () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
      console.log(`Connected to AIS stream at ${this.host}:${this.port}`);
    });

    this.socket.on('data', (data: Buffer) => {
      this.handleData(data);
    });

    this.socket.on('error', (error: Error) => {
      this.emit('error', error);
      console.error('AIS connection error:', error);
      this.handleDisconnection();
    });

    this.socket.on('close', () => {
      this.handleDisconnection();
    });

    this.socket.on('timeout', () => {
      console.warn('AIS connection timeout');
      this.handleDisconnection();
    });

    this.socket.setTimeout(30000);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.isConnected = false;
    this.emit('disconnected');
  }

  isConnectedToStream(): boolean {
    return this.isConnected;
  }

  private handleData(data: Buffer): void {
    this.buffer += data.toString();
    const lines = this.buffer.split('\n');
    
    this.buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim()) {
        this.processMessage(line.trim());
      }
    }
  }

  private processMessage(message: string): void {
    try {
      if (message.startsWith('!AIVDM') || message.startsWith('!AIVDO')) {
        const parsedMessage = AISParser.parseNMEA(message);
        if (parsedMessage) {
          this.emit('message', parsedMessage);
        }
      }
    } catch (error) {
      console.error('Error processing AIS message:', error);
    }
  }

  private handleDisconnection(): void {
    this.isConnected = false;
    this.emit('disconnected');
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('reconnectFailed');
    }
  }
}