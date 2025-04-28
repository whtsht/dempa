<script lang="ts">
	import { DempaClient, initDempaClient, type Board, type User } from '$lib/dempa';
	import { bech32 } from '@scure/base';
	import { Button, Select } from 'flowbite-svelte';
	import { onMount } from 'svelte';

	let boards = $state<Board[]>([]);

	let user: null | User = $state(null);
	let dempa: null | DempaClient = $state(null);
	let title = $state('');
	let content = $state('');
	let selectedBoardId: null | string = $state(null);


	async function publishThread(title: string, content: string) {
		if (!selectedBoardId) {
			alert('No board selected');
			return;
		}

		const thread = dempa!.createThread({
			boardId: selectedBoardId,
			title,
			content
		});

		await dempa!.publishThread(thread);
		console.log('Thread published:', thread);
	}

	$effect(() => {
		if (!user) return;
		(async () => {
			await Promise.all(
				user.JoinedBoardIds.map(async (id) => {
					const board = await dempa!.fetchBoard(id);
					if (board) {
						boards.push(board);
					} else {
						console.error(`Board with ID ${id} not found`);
					}
				})
			);
		})();
	});

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
</script>

<div class="space-y-3 w-full p-10">
	<Select id="board-select" bind:value={selectedBoardId} class="w-full" placeholder="ボードを選択">
		{#each boards as board}
			<option value={board.id}>{board.name}</option>
		{/each}
	</Select>

	<input
		bind:value={title}
		type="text"
		placeholder="スレッドタイトル"
		class="w-full p-2 border rounded"
	/>

	<textarea
		bind:value={content}
		rows="4"
		placeholder="メッセージを入力..."
		class="w-full p-2 border rounded"
	></textarea>

	<div class="flex justify-end space-x-2">
		<Button
			color="primary"
			onclick={async () => {
				await publishThread(title, content);
				window.location.href = '/';
			}}
			>送信
		</Button>
	</div>
</div>
