/// <reference types="astro/client" />

type RuntimeEnv = {
	DB: D1Database;
};

declare namespace App {
	interface Locals {
		runtime: {
			env: RuntimeEnv;
		};
	}
}
