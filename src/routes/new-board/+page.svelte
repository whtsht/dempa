<script lang="ts">
	import { DempaClient, initDempaClient, type User } from '$lib/dempa';
	import { bech32 } from '@scure/base';
	import { Button } from 'flowbite-svelte';
	import { onMount } from 'svelte';

	let name = $state('');
	let description = $state('');
	let user: null | User = $state(null);
	let dempa: null | DempaClient = $state(null);

	onMount(async () => {
		const sk = localStorage.getItem('sk');
		const relay = localStorage.getItem('relayUrl');

		if (!sk || !relay) {
			alert('Please create a user first');
			return;
		}
		const skUint8Array = bech32.decodeToBytes(sk as `${string}1${string}`).bytes;

		dempa = initDempaClient(skUint8Array, [relay]);
		user = await dempa.fetchUser();
	});

	async function publishBoard() {
		if (!user || !dempa) return;

		const board = dempa.createBoard({
			name,
			description,
			roles: [
				{
					name: 'admin',
					approver: null,
					action: 'Admin'
				}
			],
			members: [
				{
					pubkey: user.pubkey,
					role: 'admin'
				}
			]
		});
		await dempa.publishBoard(board);
		return board.id;
	}
</script>

<div class="space-y-3 w-full p-10">
	<h1>ボードを作成</h1>

	<input
		type="text"
		bind:value={name}
		placeholder="ボード名"
		class="border border-gray-300 rounded p-2 w-full"
	/>

	<textarea
		bind:value={description}
		placeholder="ボードの説明"
		class="border border-gray-300 rounded p-2 w-full"
		rows="4"
	></textarea>

	<div class="flex justify-end space-x-2">
		<Button
			color="primary"
			onclick={async () => {
				const id = await publishBoard();
				if (!id) return;
				user?.JoinedBoardIds.push(id);
				await dempa?.publishUser(user!);
				window.location.href = '/';
			}}>ボードを作成</Button
		>
	</div>
</div>
