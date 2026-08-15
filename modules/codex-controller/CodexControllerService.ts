type ConnectionState = {
	connected: boolean;
	connectionCount: number;
	subscribed: boolean;
	subscribedReportCount: number;
};

const LIGHTING_EFFECT = {
	OFF: 0,
	SOLID: 1,
	SNAKE: 2,
	RAINBOW: 3,
	BREATH: 4,
	GRADIENT: 5,
	SHALLOW_BREATH: 6,
} as const;
Object.freeze(LIGHTING_EFFECT);
type DecimalDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type AgentIndex = 0 | 1 | 2 | 3 | 4 | 5;
type AgentKey = `AG0${AgentIndex}`;
type ActionKey = `ACT${DecimalDigit}${DecimalDigit}`;

const HID_KEY = {
	AG00: "AG00",
	AG01: "AG01",
	AG02: "AG02",
	AG03: "AG03",
	AG04: "AG04",
	AG05: "AG05",
	ACT06: "ACT06",
	ACT07: "ACT07",
	ACT08: "ACT08",
	ACT09: "ACT09",
	ACT10: "ACT10",
	ACT11: "ACT11",
	ACT12: "ACT12",
	ENC_CLK: "ENC_CLK",
	ENC_CW: "ENC_CW",
	ENC_CC: "ENC_CC",
	ENCODER_PRESS: "ENC_CLK",
	ENCODER_CLOCKWISE: "ENC_CW",
	ENCODER_COUNTERCLOCKWISE: "ENC_CC",
} as const;
Object.freeze(HID_KEY);

type EncoderKey = typeof HID_KEY.ENC_CLK | typeof HID_KEY.ENC_CW | typeof HID_KEY.ENC_CC;
type EncoderPressKey = typeof HID_KEY.ENC_CLK;
type EncoderStepKey = typeof HID_KEY.ENC_CW | typeof HID_KEY.ENC_CC;
type HIDKey = AgentKey | ActionKey | EncoderPressKey;

type HIDKeyEvent = {
	key: HIDKey;
	pressed: boolean;
};

type RadialPosition = {
	angle: number;
	distance: number;
};

type LightingEffect = (typeof LIGHTING_EFFECT)[keyof typeof LIGHTING_EFFECT];

type LightingStatus = {
	color?: number;
	brightness?: number;
	effect?: LightingEffect;
	speed?: number;
	magic?: number;
};

type AgentStatus = LightingStatus & {
	id: number;
	syncKeysBacklight?: boolean;
	syncAmbient?: boolean;
};

type AmbientStatus = {
	ambient?: LightingStatus;
	keys?: LightingStatus;
};

type CodexControllerServiceOptions = {
	debug?: boolean;
	deviceName?: string;
};

interface CodexControllerService {
	onConnectionChanged: ((state: ConnectionState) => void) | null;
	onAgentStatus: ((status: AgentStatus[]) => void) | null;
	onAmbientStatus: ((status: AmbientStatus) => void) | null;
	onFocusedApp: ((appName: string) => void) | null;
	onNotifyError: ((error: Error) => void) | null;

	close(): void;
	getConnectionState(): ConnectionState;
	sendHID(event: HIDKeyEvent): boolean;
	sendEncoderStep(key: EncoderStepKey): boolean;
	sendRadial(position: RadialPosition): boolean;
	sendAgent(index: AgentIndex, pressed: boolean): boolean;
	sendAction(index: number, pressed: boolean): boolean;
	sendMicrophone(pressed: boolean): boolean;
}

export type {
	ActionKey,
	AgentIndex,
	AgentKey,
	AgentStatus,
	AmbientStatus,
	CodexControllerService,
	CodexControllerServiceOptions,
	ConnectionState,
	EncoderKey,
	EncoderPressKey,
	EncoderStepKey,
	HIDKey,
	HIDKeyEvent,
	LightingEffect,
	LightingStatus,
	RadialPosition,
};
export { HID_KEY, LIGHTING_EFFECT };
