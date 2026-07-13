import Controller from "Controller";
import { log } from "Logger";
import MusicPlayerServiceProvider from "MusicPlayerServiceProvider";
import MediaPlayerApplication from "View";
import { createInitialModel } from "model";
// Moddable provides this embedded module under the bare "net" specifier.
// biome-ignore lint/style/useNodejsImportProtocol: this is not Node.js net.
import Net from "net";
import "piu/MC";

log("main", "boot");
const ip = Net.get("IP") || undefined;
const model = createInitialModel({ network: { connected: Boolean(ip), ip } });
const service = new MusicPlayerServiceProvider();
const controller = new Controller(model, service);

const app = new MediaPlayerApplication(
	{ model, controller },
	{ commandListLength: 4096, displayListLength: 4096, touchCount: 1 },
);
controller.attachView(app);
controller.start();
log("main", "application started");

export default app;
