<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { Button, Label, Textarea } from 'flowbite-svelte';
	import { User } from '$lib/models/user';
	import { Comment } from '$lib/models/comment';
	import { Thread } from '$lib/models/thread';
	import { Board } from '$lib/models/board';

	let thread: null | Thread = $state(null);
	let commentValue: string = $state('');
	let comments: Comment[] = $state([]);
	let isCommentAllowed: null | boolean = $state(null);
	let userCache: Map<string, User> = $state(new Map());

	onMount(async () => {
		const { threadId } = page.params;
		thread = await Thread.find(threadId);
		
		comments = (await Comment.all(threadId)).reverse()
		updateIsCommentAllowed().then((allowed) => {
			isCommentAllowed = allowed;
		});
	});

	async function publishComment() {
		const { threadId } = page.params;
		const comment = await Comment.create({
			threadId,
			content: commentValue
		});
		comments.push(comment);
		commentValue = '';
	}

	async function updateIsCommentAllowed() {
		const user = await User.current();
		if (!user) return false;
		if (!thread) return false;
		const board = await Board.find(thread.boardId);
		if (!board) return false;
		const member = board.members.find((member) => member.pubkey === user.pubkey);
		if (!member) return false;
		const role = board.roles.find((role) => role.name === member.role);
		if (!role) return false;
		return role.actions.includes('Comment');
	}

	async function validComment(pubkey: string): Promise<boolean> {
		const user = await User.findByPublicKey(pubkey);
		if (!user) return false;
		if (!thread) return false;
		const board = await Board.find(thread.boardId);
		if (!board) return false;
		const member = board.members.find((member) => member.pubkey === user.pubkey);
		if (!member) return false;
		const role = board.roles.find((role) => role.name === member.role);
		if (!role) return false;
		return role.actions.includes('Comment');
	}

	async function getUserName(pubkey: string): Promise<string> {
		const user = userCache.get(pubkey) || (await User.findByPublicKey(pubkey));

		if (user) {
			userCache.set(pubkey, user);
			return user.name;
		} else {
			return '不明なユーザー';
		}
	}

</script>

<div class="w-full p-6">
	<h1 class="text-2xl font-bold mb-4">スレッド</h1>

	{#if thread}
		<div class="bg-white rounded-lg p-6 w-full">
			<h1 class="text-2xl font-bold mb-4">{thread.title}</h1>
			<p class="text-gray-700">{thread.content}</p>
		</div>
	{:else}
		<div class="p-6">
			<p class="text-gray-500">Loading thread...</p>
		</div>
	{/if}

	<br />
	<br />
	<h1 class="text-2xl font-bold mb-4">コメント</h1>

	{#each comments as comment}
		<div class="bg-gray-100 rounded-lg p-4 mb-4">
			{#await getUserName(comment.author) then userName}
				<div class="flex items-center mb-2">
					<span class="font-medium text-blue-600">{userName}</span>
				</div>
				{#await validComment(comment.author) then isValid}
					{#if isValid}
						<p class="text-gray-700">{comment.content}</p>
					{:else}
						<div class="flex items-center mb-2">
							<span class="text-sm text-red-500">コメントは許可されていません</span>
						</div>
					{/if}
				{/await}
			{/await}
		</div>
	{/each}

	<Label for="comment" class="block mb-2 text-sm font-medium text-gray-900">コメントを追加</Label>
	<Textarea
		bind:value={commentValue}
		id="comment"
		placeholder="コメントを追加"
		rows={4}
		class="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
	/>
	{#if isCommentAllowed === false}
		<p class="text-red-500">あなたのコメントが許可されたユーザーではありません</p>
		<p class="text-red-500">あなたのコメントは他のユーザーには見られない可能性があります</p>
	{/if}
	<div class="flex justify-end space-x-2">
		<Button onclick={publishComment}>送信</Button>
	</div>
</div>
