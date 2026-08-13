interface NetworkStatus {
	connected: boolean;
	ip?: string;
}

interface NetworkStatusProvider {
	read(): NetworkStatus;
}

export type { NetworkStatus, NetworkStatusProvider };
