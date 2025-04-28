<script lang="ts">
	import { DempaClient } from '$lib/dempa';
	import { bech32 } from '@scure/base';
	import { Button } from 'flowbite-svelte';
	import { getPublicKey } from 'nostr-tools';

	let name = $state('');
	let sk = $state('');

	async function createUser() {
		if (!sk.includes('1')) {
			alert('Invalid secret key');
			return;
		}

		const skUint8Array = bech32.decodeToBytes(sk as `${string}1${string}`).bytes;

		const relayUrl = 'ws://localhost:7000';
		localStorage.setItem('sk', sk);
		localStorage.setItem('relayUrl', relayUrl);
		const dempa = new DempaClient(skUint8Array, [relayUrl]);
		await dempa.publishUser({
			name,
			pubkey: getPublicKey(skUint8Array),
			JoinedBoardIds: []
		});
	}
</script>

<div class="space-y-3 w-full p-10">
	<h1>ユーザーを作成</h1>

	<input
		type="text"
		bind:value={name}
		placeholder="ユーザー名"
		class="border border-gray-300 rounded p-2 w-full"
	/>

	<input
		type="password"
		bind:value={sk}
		placeholder="秘密鍵 (nsec1...)"
		class="border border-gray-300 rounded p-2 w-full"
	/>

	<div class="flex justify-end space-x-2">
		<Button
			color="primary"
			onclick={async () => {
				await createUser();
				window.location.href = '/';
			}}>ユーザーを作成</Button
		>
	</div>
</div>
