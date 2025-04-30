<script lang="ts">
	import { currentUser, type User } from '$lib/dempa';
	import { onMount } from 'svelte';

	let user: null | User = $state(null);
	let sk = $state('');
	let showSk = $state(false);
	let copied = $state(false);

	onMount(async () => {
		user = await currentUser();
		sk = localStorage.getItem('sk') || '';
	});

	function toggleShowSk() {
		showSk = !showSk;
	}

	function copySk() {
		navigator.clipboard.writeText(sk);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 2000);
	}
</script>

<div class="w-[70%] mx-auto bg-white p-6 rounded-lg shadow-sm">
	{#if user}
		<h1 class="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">ユーザー情報</h1>

		<div class="space-y-4">
			<div class="flex flex-col">
				<span class="text-sm text-gray-500 mb-1">ユーザー名</span>
				<p class="text-xl font-medium">{user.name}</p>
			</div>

			<div class="flex flex-col">
				<span class="text-sm text-gray-500 mb-1">公開鍵 (Pubkey)</span>
				<p class="bg-gray-50 p-3 rounded break-all font-mono text-sm">{user.pubkey}</p>
			</div>

			{#if sk}
				<div class="flex flex-col mt-6 border-t pt-4">
					<div class="flex flex-wrap items-center gap-3 mb-2">
						<span class="text-sm text-gray-500">秘密鍵 (Secret Key)</span>
						<div class="flex space-x-2">
							<button
								onclick={toggleShowSk}
								class="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
							>
								{showSk ? '非表示' : '表示'}
							</button>
							<button
								onclick={copySk}
								class="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors flex items-center gap-1"
							>
								<span>コピー</span>
								{#if copied}
									<span class="text-xs bg-white text-green-600 px-1 py-px rounded">✓</span>
								{/if}
							</button>
						</div>
					</div>

					<div class="mt-2">
						{#if showSk}
							<div class="p-3 bg-gray-50 rounded border break-all font-mono text-sm">
								{sk}
							</div>
						{:else}
							<div class="p-3 bg-gray-50 rounded border text-gray-400 font-mono text-sm">
								{'•'.repeat(sk.length)}
							</div>
						{/if}
					</div>
					<p class="text-xs text-red-500 mt-1">※ 秘密鍵は誰にも教えないでください</p>
				</div>
			{/if}
		</div>
	{:else}
		<div class="flex justify-center items-center p-8">
			<div class="animate-pulse flex flex-col items-center">
				<div class="h-8 w-32 bg-gray-200 rounded mb-4"></div>
				<div class="h-4 w-64 bg-gray-200 rounded"></div>
			</div>
		</div>
	{/if}
</div>
