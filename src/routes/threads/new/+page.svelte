<script lang="ts">
	import { currentUser, dempaClient, type Board } from '$lib/dempa';
	import { Button, Select } from 'flowbite-svelte';

	let boards = $state<Board[]>([]);

	let title = $state('');
	let content = $state('');
	let selectedBoard: null | Board = $state(null);

	async function publishThread(title: string, content: string) {
		if (!selectedBoard) {
			alert('No board selected');
			return;
		}

		const dempa = dempaClient();

		const thread = dempa.createThread({
			boardId: selectedBoard.id,
			title,
			content
		});

		await dempa.publishThread(thread);
	}
	
	async function isOpenThreadAllowed() {
		const user = await currentUser();
		if (!user) return false;
		if (!selectedBoard) return false;
		const board = selectedBoard;
		const member = board.members.find((member) => member.pubkey === user.pubkey);
		if (!member) return false;
		const role = board.roles.find((role) => role.name === member.role);
		if (!role) return false;
		return role.actions.includes('OpenThread');
	}

	$effect(() => {
		(async () => {
			const user = await currentUser();
			const dempa = dempaClient();

			await Promise.all(
				user.JoinedBoardIds.map(async (id) => {
					const board = await dempa.fetchBoard(id);
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

<div class="space-y-3 w-full p-10">
	<Select id="board-select" bind:value={selectedBoard} class="w-full" placeholder="ボードを選択">
		{#each boards as board}
			<option value={board}>{board.name}</option>
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
	
	{#if selectedBoard}
		{#await isOpenThreadAllowed() then isOpenThreadAllowed}
			{#if !isOpenThreadAllowed}
				<p class="text-red-500">あなたは{selectedBoard.name}でスレッド立ち上げが許可されていません</p>
				<p class="text-red-500">あなたのスレッドは他のユーザーには見られない可能性があります</p>
			{/if}
		{:catch error}
			<p class="text-red-500">エラーが発生しました: {error.message}</p>
		{/await}
	{/if}

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
