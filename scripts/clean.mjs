import { rmSync } from "fs";

const __dirname = import.meta.dirname;

(async () => {
	rmSync(__dirname + "/../packages/backend/built", {
		recursive: true,
		force: true,
	});
	rmSync(__dirname + "/../packages/client/built", {
		recursive: true,
		force: true,
	});
	rmSync(__dirname + "/../packages/sw/built", { recursive: true, force: true });
	rmSync(__dirname + "/../built", { recursive: true, force: true });
})();
