export default class Switch {
    private readonly light;
    private readonly name;
    private readonly Settings;
    private HardwareInfo?;
    private States;
    private FirmwareVersion;
    constructor(light: any, name: any, Settings: any);
    Init(callback: (reachable: boolean) => void, error: any): Promise<void>;
    getName(): string;
    getVersion(): string;
    getSerialNumber(): any;
    getVendorName(): string | undefined;
    getProductName(): string | undefined;
    updateStates(index: any, callback: (reachable: boolean) => void): Promise<void>;
    private static getProductInfo;
    private setPower;
    setFirmwareVersion(callback: any, error: any): Promise<void>;
    setHardwareInformation(callback: any, error: any): Promise<void>;
    getStates(index: any, callback: any, errorFallback: any): void;
    getHardwareInformation(callback: any, errorFallback: any): void;
    getFirmwareVersion(callback: any, errorFallback: any): void;
    getLabel(callback: any, errorFallback: any): void;
    setOn(index: any, value: any): Promise<void>;
    getOn(index: any): number;
}
//# sourceMappingURL=switch.d.ts.map