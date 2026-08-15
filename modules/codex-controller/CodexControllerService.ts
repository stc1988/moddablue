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
type AgentKey = `AG0${0 | 1 | 2 | 3 | 4 | 5}`;
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

type EncoderStepKey = typeof HID_KEY.ENC_CW | typeof HID_KEY.ENC_CC;

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
	key: AgentKey;
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
	sendAgent(key: AgentKey, pressed: boolean): boolean;
	sendAction(key: ActionKey, pressed: boolean): boolean;
	sendEncoderPress(pressed: boolean): boolean;
	sendEncoderStep(key: EncoderStepKey): boolean;
	sendRadial(position: RadialPosition): boolean;
	sendMicrophone(pressed: boolean): boolean;
}

export type {
	ActionKey,
	AgentKey,
	AgentStatus,
	AmbientStatus,
	CodexControllerService,
	CodexControllerServiceOptions,
	ConnectionState,
	EncoderStepKey,
	LightingEffect,
	LightingStatus,
	RadialPosition,
};
export { HID_KEY, LIGHTING_EFFECT };
