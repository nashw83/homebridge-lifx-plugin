import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { LifxHomebridgePlatform } from './platform';
export declare class LifxPlatformAccessory {
    private readonly platform;
    readonly Accessory: PlatformAccessory;
    private readonly light;
    private readonly settings;
    private service;
    private watcher;
    private adaptiveLightingController;
    private bulb;
    private isOnline;
    readonly lightId: string;
    constructor(platform: LifxHomebridgePlatform, Accessory: PlatformAccessory, light: any, settings: any);
    setHardwareCharacteristics(): void;
    setSoftwareCharacteristics(): void;
    bindFunctions(): void;
    getOn(): Promise<CharacteristicValue>;
    setOn(value: CharacteristicValue): Promise<void>;
    setBrightness(value: CharacteristicValue): Promise<void>;
    setHue(value: CharacteristicValue): Promise<void>;
    setSaturation(value: CharacteristicValue): Promise<void>;
    setKelvin(value: CharacteristicValue): Promise<void>;
    setValue(name: any, func: any, obj: any, value: any): void;
    handleError(err: any): void;
    /**
     * Marks the accessory as offline and notifies HomeKit immediately.
     * updateValue(Error) only sets the statusCode but does NOT emit a change
     * event, so HomeKit never gets notified proactively. We therefore first
     * force a change event (by flipping the value) so HomeKit re-polls, and
     * the onGet handler will then return SERVICE_COMMUNICATION_FAILURE.
     */
    private markNotResponding;
    setOffline(): void;
    setOnline(): void;
    watchState(): Promise<void>;
    resetWatcher(): Promise<void>;
    updateLightbulbCharacteristics(): Promise<void>;
    updateOn(): void;
    updateHue(): void;
    updateSaturation(): void;
    updateBrightness(): void;
    updateKelvin(): void;
    private isAdaptiveLightingActive;
    /**
     * Clamps an Adaptive Lighting colour temperature request to the configured Kelvin range.
     * HomeKit works in mireds, so the value is converted to Kelvin, clamped, and converted back.
     * Manual colour temperature changes are never affected: when Adaptive Lighting is inactive
     * the value is returned unmodified. The value is also returned unmodified if the configured
     * range is missing or inverted, so a bad config degrades to stock behaviour rather than failing.
     */
    private clampColorTemperatureMiredForAdaptiveLighting;
    adaptiveLightingSupport(): boolean;
}
//# sourceMappingURL=platformAccessory.d.ts.map