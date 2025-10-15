// Type definitions for sproto.js
export interface SprotoInstance {
  encode(type: string, data: any): number[] | null;
  decode(type: string, buffer: number[]): any | null;
  pack(data: number[]): number[];
  unpack(data: number[]): number[];
  pencode(type: string, data: any): number[] | null;
  pdecode(type: string, buffer: number[]): any | null;
  queryproto(protocolName: string | number): ProtocolInfo | null;
  objlen(type: string, buffer: number[]): number | null;
  dump(): void;
}

export interface ProtocolInfo {
  tag: number;
  name: string;
  request: any;
  response: any;
}

export interface SprotoHost {
  attach(sp: SprotoInstance): (name: string, args?: any, session?: number) => number[];
  dispatch(buffer: number[]): DispatchResult;
}

export interface DispatchResult {
  type: 'REQUEST' | 'RESPONSE';
  pname?: string;
  result?: any;
  responseFunc?: (args?: any) => number[];
  session?: number;
}

export interface SprotoStatic {
  createNew(buffer: number[] | ArrayBuffer | Uint8Array): SprotoInstance;
  pack(data: number[]): number[];
  unpack(data: number[]): number[];
}

declare const sproto: SprotoStatic;
export default sproto;

declare global {
  interface Window {
    sproto: SprotoStatic;
  }
}