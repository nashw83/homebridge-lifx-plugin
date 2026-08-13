"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable max-len */
const products_json_1 = __importDefault(require("lifx-lan-client/src/lifx/products.json"));
const LIFX = { products: products_json_1.default[0].products };
const lodash_1 = require("lodash");
class Bulb {
    constructor(light, Settings) {
        this.light = light;
        this.Settings = Settings;
        this.States = {
            color: { hue: 120, saturation: 0, brightness: 100, kelvin: 8994 },
            power: 0,
            label: '',
        };
        this.FirmwareVersion = {
            majorVersion: 0,
            minorVersion: 0,
        };
    }
    async Init(callback, error) {
        this.setFirmwareVersion(() => {
            this.setHardwareInformation(() => {
                this.updateStates((reachable) => {
                    callback(reachable);
                });
            }, err => {
                // Hardware info could not be retrieved (e.g. unknown device, timeout).
                // Log the error but continue so the plugin does not crash (#7, #22, #27, #34).
                error(err);
                this.updateStates((reachable) => {
                    callback(reachable);
                });
            });
        }, err => {
            // Firmware version could not be retrieved – continue gracefully.
            error(err);
            this.setHardwareInformation(() => {
                this.updateStates((reachable) => {
                    callback(reachable);
                });
            }, hardwareErr => {
                error(hardwareErr);
                this.updateStates((reachable) => {
                    callback(reachable);
                });
            });
        });
    }
    getName() {
        return this.States.label;
    }
    getVersion() {
        var _a, _b;
        return (((_a = this.FirmwareVersion) === null || _a === void 0 ? void 0 : _a.majorVersion) || 0) + '.' + (((_b = this.FirmwareVersion) === null || _b === void 0 ? void 0 : _b.minorVersion) || 0);
    }
    getSerialNumber() {
        return this.light.id;
    }
    getProductId() {
        var _a;
        return (_a = this.HardwareInfo) === null || _a === void 0 ? void 0 : _a.productId;
    }
    getVendorName() {
        var _a;
        return (_a = this.HardwareInfo) === null || _a === void 0 ? void 0 : _a.vendorName;
    }
    getProductName() {
        var _a;
        return (_a = this.HardwareInfo) === null || _a === void 0 ? void 0 : _a.productName;
    }
    hasColors() {
        var _a, _b, _c;
        return (_c = (_b = (_a = this.HardwareInfo) === null || _a === void 0 ? void 0 : _a.productFeatures) === null || _b === void 0 ? void 0 : _b.color) !== null && _c !== void 0 ? _c : false;
    }
    hasKelvin() {
        var _a, _b, _c, _d;
        return ((_d = (_c = (_b = (_a = this.HardwareInfo) === null || _a === void 0 ? void 0 : _a.productFeatures) === null || _b === void 0 ? void 0 : _b.temperature_range) === null || _c === void 0 ? void 0 : _c.reduce((a, b) => b - a)) !== null && _d !== void 0 ? _d : 0) > 0;
    }
    getMinKelvin() {
        var _a, _b, _c;
        const min = Math.min(...((_c = (_b = (_a = this.HardwareInfo) === null || _a === void 0 ? void 0 : _a.productFeatures) === null || _b === void 0 ? void 0 : _b.temperature_range) !== null && _c !== void 0 ? _c : []));
        return isFinite(min) ? min : 2500;
    }
    getMaxKelvin() {
        var _a, _b, _c;
        const max = Math.max(...((_c = (_b = (_a = this.HardwareInfo) === null || _a === void 0 ? void 0 : _a.productFeatures) === null || _b === void 0 ? void 0 : _b.temperature_range) !== null && _c !== void 0 ? _c : []));
        return isFinite(max) ? max : 9000;
    }
    getMinColorTemperatur() {
        return Math.floor(Bulb.convertKelvinMirek(this.getMaxKelvin()));
    }
    getMaxColorTemperatur() {
        return Math.ceil(Bulb.convertKelvinMirek(this.getMinKelvin()));
    }
    async updateStates(callback) {
        this.getStates((state) => {
            if (state !== null && (state === null || state === void 0 ? void 0 : state.color)) {
                this.States = state;
                callback(true);
            }
            else {
                // State was null/invalid but no error – treat as unreachable to be safe.
                callback(false);
            }
        }, () => {
            // Error / timeout: keep last known state, report unreachable.
            callback(false);
        });
    }
    static getProductInfo(id) {
        return LIFX.products.find((x) => x.pid === id);
    }
    setPower(value) {
        this.States.power = value;
    }
    async setFirmwareVersion(callback, error) {
        this.getFirmwareVersion((version) => {
            this.FirmwareVersion = version;
            callback();
        }, (err) => error('setFirmwareVersion' + err));
    }
    async setHardwareInformation(callback, error) {
        this.getHardwareInformation((info) => {
            if (info) {
                this.HardwareInfo = (0, lodash_1.cloneDeep)(info);
                this.assignUpgrades();
            }
            callback();
        }, (err) => error('setHardwareInformation' + err));
    }
    getStates(callback, errorFallback) {
        this.light.getState((err, value) => {
            if (err) {
                errorFallback(err);
                return;
            }
            callback(value);
        });
    }
    getHardwareInformation(callback, errorFallback) {
        this.light.getHardwareVersion((err, value) => {
            if (err) {
                errorFallback(err);
                return;
            }
            callback(value);
        });
    }
    getFirmwareVersion(callback, errorFallback) {
        this.light.getFirmwareVersion((err, value) => {
            if (err) {
                errorFallback(err);
                return;
            }
            callback(value);
        });
    }
    update(state, duration) {
        if (!(state === null || state === void 0 ? void 0 : state.color)) {
            return;
        }
        this.light.color(state.color.hue, state.color.saturation, state.color.brightness, state.color.kelvin, duration);
    }
    updateKelvin(state, duration) {
        if (!(state === null || state === void 0 ? void 0 : state.color)) {
            return;
        }
        this.light.color(0, 0, state.color.brightness, state.color.kelvin, duration);
    }
    async setOn(value) {
        this.States.power = value;
        if (this.States.power > 0) {
            this.light.on(this.Settings.Duration);
        }
        else {
            this.light.off(this.Settings.Duration);
        }
    }
    async setBrightness(value) {
        this.States.color.brightness = value;
        this.update(this.States, this.Settings.BrightnessDuration);
    }
    async setHue(value) {
        this.States.color.hue = value;
        this.update(this.States, this.Settings.ColorDuration);
    }
    async setSaturation(value) {
        this.States.color.saturation = value;
        this.update(this.States, this.Settings.ColorDuration);
    }
    async setKelvin(value) {
        const color = Bulb.convertHomeKitColorTemperatureToHomeKitColor(value);
        this.States.color.hue = color.h;
        this.States.color.saturation = color.s;
        this.States.color.kelvin = Math.min(Math.max(this.getMinKelvin(), Bulb.convertKelvinMirek(value)), this.getMaxKelvin());
        this.updateKelvin(this.States, this.Settings.ColorDuration);
    }
    getOn() {
        return this.States.power;
    }
    getBrightness() {
        return this.States.color.brightness;
    }
    getHue() {
        return this.States.color.hue;
    }
    getSaturation() {
        return this.States.color.saturation;
    }
    getColorTemperatur() {
        const mired = Bulb.convertKelvinMirek(this.States.color.kelvin);
        return Math.min(Math.max(this.getMinColorTemperatur(), mired), this.getMaxColorTemperatur());
    }
    assignUpgrades() {
        var _a;
        const ProductInfo = Bulb.getProductInfo((_a = this.HardwareInfo) === null || _a === void 0 ? void 0 : _a.productId);
        for (const key in ProductInfo === null || ProductInfo === void 0 ? void 0 : ProductInfo.upgrades) {
            if (Object.prototype.hasOwnProperty.call(ProductInfo === null || ProductInfo === void 0 ? void 0 : ProductInfo.upgrades, key)) {
                const element = ProductInfo === null || ProductInfo === void 0 ? void 0 : ProductInfo.upgrades[key];
                if (this.isVersionHigherOrEqual(element)) {
                    if (this.HardwareInfo && this.HardwareInfo.productFeatures) {
                        this.HardwareInfo.productFeatures = Object.assign(this.HardwareInfo.productFeatures, element.features);
                    }
                }
            }
        }
    }
    isVersionHigherOrEqual(version) {
        var _a, _b, _c;
        return version.major > ((_a = this.FirmwareVersion) === null || _a === void 0 ? void 0 : _a.majorVersion) || (version.major === ((_b = this.FirmwareVersion) === null || _b === void 0 ? void 0 : _b.majorVersion) && version.minor <= ((_c = this.FirmwareVersion) === null || _c === void 0 ? void 0 : _c.minorVersion));
    }
    static convertHomeKitColorTemperatureToHomeKitColor(value) {
        const dKelvin = 10000 / value;
        const rgb = [
            dKelvin > 66 ? 351.97690566805693 + 0.114206453784165 * (dKelvin - 55) - 40.25366309332127 * Math.log(dKelvin - 55) : 255,
            dKelvin > 66 ? 325.4494125711974 + 0.07943456536662342 * (dKelvin - 50) - 28.0852963507957 * Math.log(dKelvin - 55) : 104.49216199393888 * Math.log(dKelvin - 2) - 0.44596950469579133 * (dKelvin - 2) - 155.25485562709179,
            dKelvin > 66 ? 255 : 115.67994401066147 * Math.log(dKelvin - 10) + 0.8274096064007395 * (dKelvin - 10) - 254.76935184120902,
        ].map(v => Math.max(0, Math.min(255, v)) / 255);
        const max = Math.max(...rgb);
        const min = Math.min(...rgb);
        let h = 0;
        const d = max - min, s = max ? 100 * d / max : 0, b = 100 * max;
        if (d) {
            switch (max) {
                case rgb[0]:
                    h = (rgb[1] - rgb[2]) / d + (rgb[1] < rgb[2] ? 6 : 0);
                    break;
                case rgb[1]:
                    h = (rgb[2] - rgb[0]) / d + 2;
                    break;
                default:
                    h = (rgb[0] - rgb[1]) / d + 4;
                    break;
            }
            h *= 60;
        }
        return {
            h: Math.round(h),
            s: Math.round(s),
            b: Math.round(b),
        };
    }
    static convertKelvinMirek(value) {
        return 1000000 / value;
    }
}
exports.default = Bulb;
//# sourceMappingURL=bulb.js.map