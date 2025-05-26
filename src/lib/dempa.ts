import { bech32 } from "@scure/base";
import {
	finalizeEvent,
	getPublicKey,
	SimplePool,
	verifyEvent,
} from "nostr-tools";
import { Storage } from "./storage";

class DempaClient {
	public readonly pubkey: string;
	private readonly secretKey: Uint8Array;
	private readonly pool: SimplePool;
	private readonly relayList: string[];

	constructor(sk: Uint8Array, relayList: string[] = []) {
		this.secretKey = sk;
		this.pubkey = getPublicKey(sk);
		this.pool = new SimplePool();
		this.relayList = relayList;
	}

	async publish<T>(value: T, kind: number, id: string): Promise<void> {
		const eventTemplate = {
			kind: kind,
			created_at: Math.floor(Date.now() / 1000),
			tags: [
				["d", `${id}`],
				["a", `${kind}:${this.pubkey}:${id}`],
				["id", id],
			],
			content: JSON.stringify(value),
		};

		const event = finalizeEvent(eventTemplate, this.secretKey);

		this.pool.publish(this.relayList, event);
	}

	async fetch<T>(id: string, kind: number): Promise<T | null> {
		const events = await this.pool.querySync(
			this.relayList,
			{
				kinds: [kind],
				limit: 100,
				search: id,
			},
			{
				maxWait: 1000,
			},
		);
		const event = events.find((event) =>
			event.tags.some((tag) => tag[0] === "id" && tag[1] === id)
		);

		if (!event || !verifyEvent(event)) return null;
		return JSON.parse(event.content);
	}

	async fetchAll<T>(
		kind: number,
		limit: number = 100,
	): Promise<T[]> {
		const events = await this.pool.querySync(
			this.relayList,
			{
				kinds: [kind],
				limit,
			},
			{
				maxWait: 1000,
			},
		);

		return events.filter((event) => verifyEvent(event)).map((event) =>
			JSON.parse(event.content)
		);
	}
}

let dempaClient_: DempaClient | null = null;

function dempaClient(): DempaClient {
	if (dempaClient_) {
		return dempaClient_;
	}

	const secretKey = Storage.getSecretKey()
	const relayUrl = Storage.getRelayUrl();

	if (!secretKey || !relayUrl) {
		throw new Error("Secret key or relay URL not found in localStorage");
	}
	const skUint8Array = bech32.decodeToBytes(secretKey as `${string}1${string}`).bytes;
	dempaClient_ = new DempaClient(skUint8Array, [relayUrl]);
	return dempaClient_;
}

export { DempaClient, dempaClient };
