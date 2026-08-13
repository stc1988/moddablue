import WiFi from "embedded:network/interface/wifi";
import type { NetworkStatusProvider } from "./NetworkStatus";

const WiFiNetworkStatus: NetworkStatusProvider = Object.freeze({
	read() {
		const wifi = new WiFi({});
		const ip = wifi.address;
		wifi.close();
		return { connected: Boolean(ip), ip };
	},
});

export default WiFiNetworkStatus;
