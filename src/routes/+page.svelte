<script lang="ts">
	import { DempaClient, initDempaClient, type Board, type Thread, type User } from '$lib/dempa';
	import { bech32 } from '@scure/base';
	import { onMount } from 'svelte';

	let boards: Board[] = $state([]);
	let threads: Thread[] = $state([]);
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
		console.log('User:', user);
	});

	let selectedBoard: null | Board = $state(null);

	$effect(() => {
		if (!selectedBoard || !dempa) return;
		(async () => {
			const fetchedThread = await dempa.fetchAllThreads(selectedBoard.id);
			console.log('Fetched threads:', fetchedThread);
			threads = fetchedThread;
		})();
	});

	$effect(() => {
		if (!user) return;
		(async () => {
			await Promise.all(
				user.JoinedBoardIds.map(async (id) => {
					const board = await dempa?.fetchBoard(id);
					if (board) {
						boards.push(board);
					} else {
						console.error(`Board with ID ${id} not found`);
					}
				})
			);
		})();
	});
</script>

<div class="w-[25%] bg-gray-100 border-r border-gray-200 p-4 overflow-y-auto">
	<ul>
		{#each boards as board}
			<li class="mb-2">
				<button
					class="block w-full text-left px-2 py-1 rounded hover:bg-blue-100 focus:outline-none focus:ring
                {board.id === selectedBoard?.id ? 'bg-blue-200 font-semibold' : ''}"
					onclick={() => (selectedBoard = board)}
				>
					{board.name}
				</button>
			</li>
		{/each}
	</ul>
</div>

<div class="w-[75%] p-6 overflow-y-auto">
	<div class="space-y-4">
		{#each threads as thread}
			<div class="p-4 border border-gray-200 rounded hover:shadow-md transition">
				<h3 class="text-lg font-semibold">{thread.title}</h3>
				<p class="text-gray-600 mt-2">{thread.content}</p>
			</div>
		{/each}
	</div>
</div>
