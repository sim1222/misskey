import { execa } from "execa";

const __dirname = import.meta.dirname;

(async () => {
	console.log("installing dependencies of packages/backend ...");

	await execa("yarn", ["install", "--frozen-lockfile", "--non-interactive"], {
		cwd: __dirname + "/../packages/backend",
		stdout: process.stdout,
		stderr: process.stderr,
	});

	console.log("installing dependencies of packages/client ...");

	await execa("yarn", ["install", "--frozen-lockfile", "--non-interactive"], {
		cwd: __dirname + "/../packages/client",
		stdout: process.stdout,
		stderr: process.stderr,
	});

	console.log("installing dependencies of packages/sw ...");

	await execa("yarn", ["install", "--frozen-lockfile", "--non-interactive"], {
		cwd: __dirname + "/../packages/sw",
		stdout: process.stdout,
		stderr: process.stderr,
	});
})();
