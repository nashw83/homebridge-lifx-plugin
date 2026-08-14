"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LifxPlatformAccessory = void 0;
const bulb_1 = __importDefault(require("./bulb"));
class LifxPlatformAccessory {
    constructor(platform, Accessory, light, settings) {
        this.platform = platform;
        this.Accessory = Accessory;
        this.light = light;
        this.settings = settings;
        this.isOnline = false; // offline until Init() succeeds
        this.failureCount = 0; // consecutive poll failures
        this.FAILURE_THRESHOLD = 3; // failures before going offline
        this.lightId = light.id;
        this.bulb = new bulb_1.default(light, settings);
        this.service = this.Accessory.getService(this.platform.Service.Lightbulb) || this.Accessory.addService(this.platform.Service.Lightbulb);
        // Register onGet immediately so HomeKit gets SERVICE_COMMUNICATION_FAILURE
        // even before Init() completes or if the bulb is unreachable at startup.
        this.service.getCharacteristic(this.platform.Characteristic.On)
            .onGet(this.getOn.bind(this));
        this.bulb.Init((reachable) => {
            this.setHardwareCharacteristics();
            this.setSoftwareCharacteristics();
            this.bindFunctions();
            if (reachable) {
                this.isOnline = true;
                this.resetWatcher();
            }
            else {
                // Bulb did not respond during Init – mark as not responding immediately.
                this.markNotResponding();
                this.platform.log.info('Device unreachable at startup:', this.bulb.getName());
            }
        }, (error) => this.handleError(error));
    }
    setHardwareCharacteristics() {
        var _a, _b;
        this.Accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, (_a = this.bulb.getVendorName()) !== null && _a !== void 0 ? _a : 'LIFX')
            .setCharacteristic(this.platform.Characteristic.Model, (_b = this.bulb.getProductName()) !== null && _b !== void 0 ? _b : 'Unknown')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, this.bulb.getSerialNumber());
    }
    setSoftwareCharacteristics() {
        const version = this.bulb.getVersion();
        if (version !== '0.0' && this.platform.config.updates) {
            const service = this.Accessory.getService(this.platform.Service.AccessoryInformation);
            service.addCharacteristic(this.platform.Characteristic.FirmwareRevision);
            service.setCharacteristic(this.platform.Characteristic.FirmwareRevision, version);
        }
        this.service.setCharacteristic(this.platform.Characteristic.Name, this.bulb.getName());
    }
    bindFunctions() {
        this.service.getCharacteristic(this.platform.Characteristic.On)
            .onGet(this.getOn.bind(this))
            .onSet(this.setOn.bind(this));
        this.service.getCharacteristic(this.platform.Characteristic.Brightness)
            .onSet(this.setBrightness.bind(this));
        if (this.bulb.hasKelvin()) {
            this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature)
                .setProps({ minValue: this.bulb.getMinColorTemperatur(), maxValue: this.bulb.getMaxColorTemperatur() })
                .onSet(this.setKelvin.bind(this));
            if (this.adaptiveLightingSupport()) {
                this.adaptiveLightingController = new this.platform.AdaptiveLightingController(this.service);
                this.Accessory.configureController(this.adaptiveLightingController);
            }
        }
        else {
            this.service.removeCharacteristic(this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature));
        }
        if (this.bulb.hasColors()) {
            this.service.getCharacteristic(this.platform.Characteristic.Hue)
                .onSet(this.setHue.bind(this));
            this.service.getCharacteristic(this.platform.Characteristic.Saturation)
                .onSet(this.setSaturation.bind(this));
        }
        else {
            this.service.removeCharacteristic(this.service.getCharacteristic(this.platform.Characteristic.Hue));
            this.service.removeCharacteristic(this.service.getCharacteristic(this.platform.Characteristic.Saturation));
        }
    }
    async getOn() {
        if (!this.isOnline) {
            throw new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
        }
        return this.bulb.getOn();
    }
    async setOn(value) {
        this.setValue('On', this.bulb.setOn, this.bulb, value);
    }
    async setBrightness(value) {
        this.setValue('Brightness', this.bulb.setBrightness, this.bulb, value);
    }
    async setHue(value) {
        this.setValue('Hue', this.bulb.setHue, this.bulb, value);
    }
    async setSaturation(value) {
        this.setValue('Saturation', this.bulb.setSaturation, this.bulb, value);
    }
    async setKelvin(value) {
        this.setValue('Color Temperature', this.bulb.setKelvin, this.bulb, this.clampColorTemperatureMiredForAdaptiveLighting(value));
        this.updateLightbulbCharacteristics();
    }
    setValue(name, func, obj, value) {
        func.call(obj, value);
        this.platform.log.debug(`Set Characteristic ${name} -> `, value);
    }
    handleError(err) {
        this.platform.log.warn('Bulb ' + this.bulb.getName() + ' throughs error', err);
    }
    /**
     * Marks the accessory as offline and notifies HomeKit immediately.
     * updateValue(Error) only sets the statusCode but does NOT emit a change
     * event, so HomeKit never gets notified proactively. We therefore first
     * force a change event (by flipping the value) so HomeKit re-polls, and
     * the onGet handler will then return SERVICE_COMMUNICATION_FAILURE.
     */
    markNotResponding() {
        // Set the HAP statusCode to SERVICE_COMMUNICATION_FAILURE (-70402).
        // The next time HomeKit polls this characteristic (Home app opened, Siri,
        // automation etc.) the onGet handler will throw a HapStatusError and
        // HomeKit will show "No Response". HAP event notifications only carry
        // values, not error codes, so there is no way to proactively push this.
        const hapError = new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
        this.service.getCharacteristic(this.platform.Characteristic.On)
            .updateValue(hapError);
    }
    setOffline() {
        if (!this.isOnline) {
            return;
        }
        this.isOnline = false;
        this.failureCount = 0;
        // Keep the watcher running while offline. Stopping it removes the only
        // path back: a successful poll is what calls setOnline(), and the
        // light-online event cannot help here because the LAN client only emits it
        // after it has itself marked the device offline — which never happens for a
        // device that answers discovery but is slow to answer a status request.
        this.markNotResponding();
        this.platform.log.info('Device offline:', this.bulb.getName());
    }
    setOnline() {
        if (this.isOnline) {
            return;
        }
        this.isOnline = true;
        this.resetWatcher();
        this.platform.log.info('Device online:', this.bulb.getName());
    }
    async watchState() {
        this.watcher = setInterval(() => {
            this.bulb.updateStates((reachable) => {
                if (!reachable) {
                    // Already offline: keep polling quietly so a reply can bring it back,
                    // without counting or logging on every attempt.
                    if (!this.isOnline) {
                        return;
                    }
                    this.failureCount++;
                    this.platform.log.warn(`${this.bulb.getName()}: poll failed (${this.failureCount}/${this.FAILURE_THRESHOLD})`);
                    if (this.failureCount >= this.FAILURE_THRESHOLD) {
                        this.failureCount = 0;
                        this.setOffline();
                    }
                    return;
                }
                // Successful poll – reset failure counter.
                this.failureCount = 0;
                // Self-recovery: bulb answered again after being offline.
                // setOnline() will restart the watcher, so we return immediately.
                if (!this.isOnline) {
                    this.setOnline();
                    return;
                }
                this.updateLightbulbCharacteristics();
                this.platform.log.debug('updated', this.bulb.getName());
            });
        }, 5000);
    }
    async resetWatcher() {
        if (this.watcher) {
            clearInterval(this.watcher);
        }
        this.watchState();
    }
    async updateLightbulbCharacteristics() {
        // Do not push any value updates while offline – doing so would reset the
        // HAP statusCode to SUCCESS and make HomeKit show "Off" instead of
        // "Not Responding".
        if (!this.isOnline) {
            return;
        }
        this.updateOn();
        if (this.bulb.hasColors()) {
            this.updateHue();
            this.updateSaturation();
        }
        this.updateBrightness();
        if (this.bulb.hasKelvin()) {
            this.updateKelvin();
        }
    }
    updateOn() {
        this.service.updateCharacteristic(this.platform.Characteristic.On, this.bulb.getOn());
    }
    updateHue() {
        this.service.updateCharacteristic(this.platform.Characteristic.Hue, this.bulb.getHue());
    }
    updateSaturation() {
        this.service.updateCharacteristic(this.platform.Characteristic.Saturation, this.bulb.getSaturation());
    }
    updateBrightness() {
        this.service.updateCharacteristic(this.platform.Characteristic.Brightness, this.bulb.getBrightness());
    }
    updateKelvin() {
        this.service.updateCharacteristic(this.platform.Characteristic.ColorTemperature, this.bulb.getColorTemperatur());
    }
    // True only while HomeKit is actively driving the colour temperature via Adaptive Lighting.
    // Guarded so an absent controller or an older Homebridge can never throw.
    isAdaptiveLightingActive() {
        var _a, _b;
        try {
            return ((_b = (_a = this.adaptiveLightingController) === null || _a === void 0 ? void 0 : _a.isAdaptiveLightingActive) === null || _b === void 0 ? void 0 : _b.call(_a)) === true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Clamps an Adaptive Lighting colour temperature request to the configured Kelvin range.
     * HomeKit works in mireds, so the value is converted to Kelvin, clamped, and converted back.
     * Manual colour temperature changes are never affected: when Adaptive Lighting is inactive
     * the value is returned unmodified. The value is also returned unmodified if the configured
     * range is missing or inverted, so a bad config degrades to stock behaviour rather than failing.
     */
    clampColorTemperatureMiredForAdaptiveLighting(value) {
        var _a, _b;
        if (!this.isAdaptiveLightingActive()) {
            return value;
        }
        const mired = Number(value);
        if (!Number.isFinite(mired) || mired <= 0) {
            return value;
        }
        const minKelvin = Number((_a = this.settings) === null || _a === void 0 ? void 0 : _a.AdaptiveMinKelvin);
        const maxKelvin = Number((_b = this.settings) === null || _b === void 0 ? void 0 : _b.AdaptiveMaxKelvin);
        if (!Number.isFinite(minKelvin) || !Number.isFinite(maxKelvin) || minKelvin <= 0 || minKelvin >= maxKelvin) {
            return value;
        }
        const kelvin = Math.min(Math.max(1000000 / mired, minKelvin), maxKelvin);
        return 1000000 / kelvin;
    }
    // Checks homebridge version to see if Adaptive Lighting is supported
    adaptiveLightingSupport() {
        return (this.platform.api.versionGreaterOrEqual && this.platform.api.versionGreaterOrEqual('v1.3.0-beta.23'));
    }
}
exports.LifxPlatformAccessory = LifxPlatformAccessory;
//# sourceMappingURL=platformAccessory.js.map