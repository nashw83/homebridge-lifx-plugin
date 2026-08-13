import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic, AdaptiveLightingController } from 'homebridge';
import { LifxPlatformAccessory } from './platformAccessory';
import { LifxPlatformSwitchAccessory } from './platformSwitchAccessory';
export declare class LifxHomebridgePlatform implements DynamicPlatformPlugin {
    readonly log: Logger;
    readonly config: PlatformConfig;
    readonly api: API;
    readonly Service: typeof Service;
    readonly Characteristic: typeof Characteristic;
    readonly AdaptiveLightingController: typeof AdaptiveLightingController;
    private lifxClient;
    private bulbs;
    private switches;
    readonly cachedAccessories: PlatformAccessory[];
    readonly accessories: LifxPlatformAccessory[];
    readonly switchAccessories: LifxPlatformSwitchAccessory[];
    constructor(log: Logger, config: PlatformConfig, api: API);
    configureAccessory(accessory: PlatformAccessory): void;
    discoverDevices(): void;
    getUuid(light: any): string;
    getRelayUuid(light: any, index: any): string;
    findCachedAccessory(light: any): PlatformAccessory<import("homebridge").UnknownContext> | undefined;
    findCachedSwitchAccessory(light: any, index: any): PlatformAccessory<import("homebridge").UnknownContext> | undefined;
    registerNewAccessory(light: any, name: any): PlatformAccessory<import("homebridge").UnknownContext>;
    registerNewSwitchAccessory(light: any, name: any, index: any): PlatformAccessory<import("homebridge").UnknownContext>;
    hookAccessory(accessory: any, light: any): void;
    hookSwitchAccessory(accessory: any, light: any, index: any, name: any): void;
    removeAccessory(light: any): void;
    removeSwitchAccessory(light: any, index: any): void;
    handleLight(light: any, name: any): void;
    handleSwitch(light: any, name: any, index: any): void;
}
//# sourceMappingURL=platform.d.ts.map