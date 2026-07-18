declare module "keyboard" {
	import type * as MC from "piu/MC";

	type KeyboardOptions = {
		anchor?: string;
		doTransition: boolean;
		style: MC.Style;
	};

	export const Keyboard: (data: object, options: KeyboardOptions) => MC.Port;
}
