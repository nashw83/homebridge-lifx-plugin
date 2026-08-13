"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LifxHomebridgePlatform = void 0;
const settings_1 = require("./settings");
const platformAccessory_1 = require("./platformAccessory");
const platformSwitchAccessory_1 = require("./platformSwitchAccessory");
const lifx_lan_client_1 = __importDefault(require("lifx-lan-client"));
class LifxHomebridgePlatform {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        this.AdaptiveLightingController = this.api.hap.AdaptiveLightingController;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.lifxClient = new lifx_lan_client_1.default.Client();
        this.cachedAccessories = [];
        this.accessories = [];
        this.switchAccessories = [];
        this.log.debug('Finished initializing platform:', this.config.name);
        if (this.config.bulbs) {
            this.bulbs = this.config.bulbs.map(bulb => bulb.address);
        }
        if (this.config.switches) {
            this.switches = this.config.switches.map(device => device.address);
        }
        this.api.on('didFinishLaunching', () => {
            log.debug('Executed didFinishLaunching callback');
            this.discoverDevices();
        });
    }
    configureAccessory(accessory) {
        this.log.debug('Loading accessory from cache:', accessory.displayName);
        const service = accessory.getService(this.Service.AccessoryInformation);
        service.removeCharacteristic(service.getCharacteristic(this.Characteristic.FirmwareRevision));
        this.cachedAccessories.push(accessory);
    }
    discoverDevices() {
        var _a;
        this.log.debug('Register eventhandlers');
        this.lifxClient.on('light-new', (light) => {
            if (this.config.excludes) {
                if (this.config.excludes.some(x => x.id === light.id || x.address === light.address)) {
                    this.removeAccessory(light);
                    this.log.info('Device removed');
                    return;
                }
            }
            light.getLabel((err, value) => {
                const label = value || light.address || 'LIFX Bulb';
                this.log.debug('Light detected:', label);
                light.hasRelays((hasRelays) => {
                    if (hasRelays) {
                        for (let i = 0; i < 4; i++) {
                            this.handleSwitch(light, label + ' ' + (i + 1), i);
                        }
                    }
                    else {
                        this.handleLight(light, label);
                    }
                });
            });
        });
        this.lifxClient.on('light-offline', (light) => {
            this.log.info('Light offline:', light.id);
            this.accessories
                .filter(a => a.lightId === light.id)
                .forEach(a => a.setOffline());
            this.switchAccessories
                .filter(a => a.lightId === light.id)
                .forEach(a => a.setOffline());
        });
        this.lifxClient.on('light-online', (light) => {
            this.log.info('Light online:', light.id);
            this.accessories
                .filter(a => a.lightId === light.id)
                .forEach(a => a.setOnline());
            this.switchAccessories
                .filter(a => a.lightId === light.id)
                .forEach(a => a.setOnline());
        });
        // After the initial discovery window, mark any cached accessory that never
        // got a light-new event (i.e. the bulb was completely unreachable at startup)
        // as SERVICE_COMMUNICATION_FAILURE so HomeKit shows "Not Responding".
        // lightOfflineTolerance (default 3) × discoveryInterval (5 s) = ~15 s.
        const discoveryWindowMs = (((_a = this.config.lightOfflineTolerance) !== null && _a !== void 0 ? _a : 3) + 1) * 5000;
        setTimeout(() => {
            for (const cached of this.cachedAccessories) {
                const alreadyHooked = this.accessories.some(a => a.Accessory.UUID === cached.UUID) ||
                    this.switchAccessories.some(a => a.Accessory.UUID === cached.UUID);
                if (!alreadyHooked) {
                    const hapError = new this.api.hap.HapStatusError(-70402 /* this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
                    for (const svc of [
                        cached.getService(this.Service.Lightbulb),
                        cached.getService(this.Service.Switch),
                    ]) {
                        if (!svc) {
                            continue;
                        }
                        // Register onGet so every future poll returns the error.
                        // updateValue sets the cached statusCode for immediate effect.
                        svc.getCharacteristic(this.Characteristic.On)
                            .onGet(() => {
                            throw hapError;
                        })
                            .updateValue(hapError);
                    }
                    this.log.info('Marking unreachable at startup:', cached.displayName);
                }
            }
        }, discoveryWindowMs);
        if (!this.config.autoDiscover) {
            this.config.broadcast = '0.0.0.0';
        }
        this.log.debug('Initialising lan client');
        try {
            this.lifxClient.init({
                address: this.config.default,
                broadcast: this.config.broadcast,
                lightOfflineTolerance: this.config.lightOfflineTolerance,
                messageHandlerTimeout: this.config.messageHandlerTimeout,
                resendPacketDelay: this.config.resendPacketDelay,
                resendMaxTimes: this.config.resendMaxTimes,
                debug: this.config.debug,
                lights: (this.bulbs || []).concat(this.switches || []),
            });
        }
        catch (error) {
            this.log.error('Error initializing listener', error);
        }
    }
    //should bulbs be defined here?
    getUuid(light) {
        return this.api.hap.uuid.generate(light.id);
    }
    getRelayUuid(light, index) {
        return this.api.hap.uuid.generate(index + light.id);
    }
    findCachedAccessory(light) {
        return this.cachedAccessories.find(accessory => accessory.UUID === this.getUuid(light));
    }
    findCachedSwitchAccessory(light, index) {
        return this.cachedAccessories.find(accessory => accessory.UUID === this.getRelayUuid(light, index));
    }
    registerNewAccessory(light, name) {
        const accessory = new this.api.platformAccessory(name, this.getUuid(light));
        this.api.registerPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [accessory]);
        return accessory;
    }
    registerNewSwitchAccessory(light, name, index) {
        const uuid = this.getRelayUuid(light, index);
        this.log.info('Device registered: ' + uuid);
        this.log.info('Device name: ' + name);
        const accessory = new this.api.platformAccessory(name, uuid);
        this.api.registerPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [accessory]);
        return accessory;
    }
    hookAccessory(accessory, light) {
        var _a, _b;
        this.accessories.push(new platformAccessory_1.LifxPlatformAccessory(this, accessory, light, {
            Duration: this.config.duration,
            BrightnessDuration: this.config.brightnessDuration,
            ColorDuration: this.config.colorDuration,
            AdaptiveMinKelvin: (_a = this.config.adaptiveMinKelvin) !== null && _a !== void 0 ? _a : 3000,
            AdaptiveMaxKelvin: (_b = this.config.adaptiveMaxKelvin) !== null && _b !== void 0 ? _b : 6500,
        }));
    }
    hookSwitchAccessory(accessory, light, index, name) {
        this.switchAccessories.push(new platformSwitchAccessory_1.LifxPlatformSwitchAccessory(this, accessory, light, index, name, {}));
    }
    removeAccessory(light) {
        const accessory = this.findCachedAccessory(light);
        if (accessory) {
            this.api.unregisterPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [accessory]);
        }
    }
    removeSwitchAccessory(light, index) {
        const accessory = this.findCachedSwitchAccessory(light, index);
        if (accessory) {
            this.api.unregisterPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [accessory]);
        }
    }
    handleLight(light, name) {
        let accessory = this.findCachedAccessory(light);
        if (accessory) {
            this.log.debug('Restoring existing accessory from cache:', name);
        }
        else {
            this.log.debug('Adding new accessory:', name);
            accessory = this.registerNewAccessory(light, name);
        }
        this.log.debug('Hooking light to accessory', name);
        this.hookAccessory(accessory, light);
    }
    handleSwitch(light, name, index) {
        let accessory = this.findCachedSwitchAccessory(light, index);
        if (accessory) {
            this.log.debug('Restoring existing accessory from cache:', name);
        }
        else {
            this.log.debug('Adding new accessory:', name);
            accessory = this.registerNewSwitchAccessory(light, name, index);
        }
        this.log.debug('Hooking light to accessory', name);
        this.hookSwitchAccessory(accessory, light, index, name);
    }
}
exports.LifxHomebridgePlatform = LifxHomebridgePlatform;
//# sourceMappingURL=platform.js.map