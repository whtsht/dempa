<script lang="ts">
	import { currentUser, dempaClient } from '$lib/dempa';
	import { Button } from 'flowbite-svelte';

	let name = $state('');
	let description = $state('');

	async function publishBoard() {
		const dempa = dempaClient();
		const user = await currentUser();

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
				const dempa = dempaClient();
				const user = await currentUser();
				user.JoinedBoardIds.push(id);
				await dempa.publishUser(user!);
				window.location.href = '/';
			}}>ボードを作成</Button
		>
	</div>
</div>
