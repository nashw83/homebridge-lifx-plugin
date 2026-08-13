import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { LifxHomebridgePlatform } from './platform';
export declare class LifxPlatformSwitchAccessory {
    private readonly platform;
    readonly Accessory: PlatformAccessory;
    private readonly light;
    private readonly relayIndex;
    private readonly name;
    private service;
    private watcher;
    private device;
    private readonly index;
    private isOnline;
    readonly lightId: string;
    constructor(platform: LifxHomebridgePlatform, Accessory: PlatformAccessory, light: any, relayIndex: any, name: any, settings: any);
    setHardwareCharacteristics(): void;
    setSoftwareCharacteristics(): void;
    bindFunctions(): void;
    getOn(): Promise<CharacteristicValue>;
    setOn(value: CharacteristicValue): Promise<void>;
    handleError(err: any): void;
    private markNotResponding;
    setOffline(): void;
    setOnline(): void;
    watchState(): Promise<void>;
    resetWatcher(): Promise<void>;
    updateLightbuldCharacteristics(): Promise<void>;
    updateOn(): void;
    getName(): string;
}
//# sourceMappingURL=platformSwitchAccessory.d.ts.map