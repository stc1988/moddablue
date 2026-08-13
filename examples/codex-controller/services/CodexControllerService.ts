type ConnectionState = {
	connected: boolean;
	connectionCount: number;
	subscribed: boolean;
	subscribedReportCount: number;
};

type AgentStatus = {
	id: number;
	c?: number;
	b?: number;
	e?: number;
	s?: number;
};

type AmbientStatus = {
	ambient?: {
		c?: number;
		b?: number;
		e?: number;
		s?: number;
	};
};

type CodexControllerServiceOptions = {
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
	sendAgent(index: number, pressed: boolean): boolean;
	sendAction(index: number, pressed: boolean): boolean;
	sendMicrophone(pressed: boolean): boolean;
}

export type { AgentStatus, AmbientStatus, CodexControllerService, CodexControllerServiceOptions, ConnectionState };
