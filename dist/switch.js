"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable max-len */
const products_json_1 = __importDefault(require("lifx-lan-client/src/lifx/products.json"));
const LIFX = { products: products_json_1.default[0].products };
class Switch {
    constructor(light, name, Settings) {
        this.light = light;
        this.name = name;
        this.Settings = Settings;
        this.States = {
            power: [0, 0, 0, 0],
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
                this.States.label = this.name;
                let completed = 0;
                let anyReachable = false;
                for (let i = 0; i < 4; i++) {
                    this.updateStates(i, (reachable) => {
                        if (reachable) {
                            anyReachable = true;
                        }
                        completed++;
                        if (completed === 4) {
                            callback(anyReachable);
                        }
                    });
                }
            }, err => error(err));
        }, err => error(err));
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
    getVendorName() {
        var _a;
        return (_a = this.HardwareInfo) === null || _a === void 0 ? void 0 : _a.vendorName;
    }
    getProductName() {
        var _a;
        return (_a = this.HardwareInfo) === null || _a === void 0 ? void 0 : _a.productName;
    }
    async updateStates(index, callback) {
        this.getStates(index, (state) => {
            if (state !== null) {
                this.setPower(index, state);
                callback(true);
            }
            else {
                // null state but no error – treat as unreachable.
                callback(false);
            }
        }, () => {
            // Error / timeout: keep last known state, report unreachable.
            callback(false);
        });
        this.getLabel((label) => {
            if (label !== null) {
                this.States.label = label;
            }
        }, () => {
            this.States.label = this.States.label || '';
        });
    }
    static getProductInfo(id) {
        return LIFX.products.find((x) => x.pid === id);
    }
    setPower(index, value) {
        this.States.power[index] = value;
    }
    async setFirmwareVersion(callback, error) {
        this.getFirmwareVersion((version) => {
            this.FirmwareVersion = version;
            callback();
        }, (err) => error('setFirmwareVersion' + err));
    }
    async setHardwareInformation(callback, error) {
        this.getHardwareInformation((info) => {
            this.HardwareInfo = info;
            callback();
        }, (err) => error('setHardwareInformation' + err));
    }
    getStates(index, callback, errorFallback) {
        this.light.getRelayPower(index, (err, value) => {
            if (err) {
                errorFallback(err);
            }
            callback(value);
        });
    }
    getHardwareInformation(callback, errorFallback) {
        this.light.getHardwareVersion((err, value) => {
            if (err) {
                errorFallback(err);
            }
            callback(value);
        });
    }
    getFirmwareVersion(callback, errorFallback) {
        this.light.getFirmwareVersion((err, value) => {
            if (err) {
                errorFallback(err);
            }
            callback(value);
        });
    }
    getLabel(callback, errorFallback) {
        this.light.getLabel((err, value) => {
            if (err) {
                errorFallback(err);
            }
            callback(value);
        });
    }
    async setOn(index, value) {
        this.States.power[index] = value;
        if (this.States.power[index] > 0) {
            this.light.relayOn(index);
        }
        else {
            this.light.relayOff(index);
        }
    }
    getOn(index) {
        return this.States.power[index];
    }
}
exports.default = Switch;
//# sourceMappingURL=switch.js.map