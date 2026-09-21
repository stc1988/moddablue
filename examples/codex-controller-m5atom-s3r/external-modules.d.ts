/*
 * Copyright (c) 2026 Satoshi Tanaka
 *
 * This work is licensed under the Creative Commons Attribution 4.0 International License.
 * To view a copy of this license, visit
 *     http://creativecommons.org/licenses/by/4.0/
 */

declare module "m5chain" {
	type DeviceClass<T = object> = abstract new (...args: never[]) => T;

	export type RegisteredM5ChainDevice<TClasses extends readonly DeviceClass[]> =
		| InstanceType<TClasses[number]>
		| {
				readonly kind: "unknown";
				readonly connected: boolean;
		  };

	type ErrorContext = {
		source: "deviceDisconnected" | "deviceEvent" | "deviceListChanged" | "sample";
	};

	export default class M5Chain<TClasses extends readonly DeviceClass[]> {
		constructor(options: {
			deviceClasses: TClasses;
			pollingInterval?: number;
			connectionCheckInterval?: number;
		});
		onError?: (error: unknown, context: ErrorContext) => void | Promise<void>;
		onDeviceListChanged?: (devices: readonly RegisteredM5ChainDevice<TClasses>[]) => void | Promise<void>;
		start(): Promise<void>;
		close(): Promise<void>;
	}
}

declare module "m5chainJoyStick" {
	export type JoystickValue = { x: number; y: number };
	export const KEY_MODE: { readonly PASSIVE: 0; readonly ACTIVE: 1 };

	export default class M5ChainJoyStick {
		static readonly DEVICE_TYPE: 4;
		readonly kind: "joystick";
		readonly connected: boolean;
		onSample: ((sample: JoystickValue) => void) | null;
		onDisconnected: (() => void | Promise<void>) | null;
		configure(options: { key?: { mode?: 0 | 1 } }): Promise<void>;
		isKeyPressed(): Promise<boolean>;
		setLedColor(red: number, green: number, blue: number): Promise<void>;
		setLedBrightness(brightness: number, saveToFlash?: boolean): Promise<void>;
	}
}

declare module "m5chainEncoder" {
	export const EncoderABDirection: { readonly CLOCKWISE_INCREASE: 0; readonly CLOCKWISE_DECREASE: 1 };
	export const SaveToFlash: { readonly DISABLE: 0; readonly ENABLE: 1 };

	export default class M5ChainEncoder {
		static readonly DEVICE_TYPE: 1;
		readonly kind: "encoder";
		readonly connected: boolean;
		onSample: ((delta: number) => void) | null;
		onDisconnected: (() => void | Promise<void>) | null;
		configure(options: { key?: { mode?: 0 | 1 }; abDirection?: 0 | 1; saveToFlash?: 0 | 1 }): Promise<void>;
		isKeyPressed(): Promise<boolean>;
	}
}

declare module "m5chainBuzzer" {
	export const BUZZER_NOTE: {
		readonly E6: number;
		readonly C7: number;
	};

	export default class M5ChainBuzzer {
		static readonly DEVICE_TYPE: 11;
		readonly kind: "buzzer";
		readonly connected: boolean;
		playMelody(
			melody: readonly { note: number; beats: number }[],
			options: { tempoBpm: number; gateRatio?: number },
		): Promise<void>;
	}
}

declare module "unit/bytebutton" {
	export default class ByteButton {
		static readonly BUTTON_COUNT: 8;
		static readonly LED_COUNT: 9;
		static readonly LED_MODE: { readonly MANUAL: 0; readonly BUTTON: 1 };
		onButtonChange: ((button: number, pressed: boolean) => void) | null;
		close(): void;
		setLedMode(mode: 0 | 1): void;
		setLedBrightness(led: number, brightness: number): void;
		setLed(led: number, color: { r: number; g: number; b: number }): void;
	}
}
