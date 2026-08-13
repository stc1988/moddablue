import type { NetworkStatusProvider } from "./NetworkStatus";

const HostNetworkStatus: NetworkStatusProvider = Object.freeze({
	read() {
		return { connected: true };
	},
});

export default HostNetworkStatus;
