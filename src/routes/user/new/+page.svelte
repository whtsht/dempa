<script lang="ts">
	import { User } from '$lib/models/user';
	import { bech32 } from '@scure/base';
	import { Button } from 'flowbite-svelte';

	let name = $state('');
	let sk = $state('');
	let isNewUser = $state(false);

	async function handleLogin() {
		if (!sk.includes('1')) {
			alert('Invalid secret key');
			return;
		}

		try {
			const existingUser = await User.login({ secretKey: sk });
			
			if (existingUser) {
				window.location.href = '/';
			} else if (isNewUser && name.trim()) {
				await User.create({
					secretKey: sk,
					name: name.trim()
				});
				window.location.href = '/';
			} else {
				alert('このSecretKeyに対応するユーザーが見つかりません。新規ユーザーを作成する場合は、「新規ユーザー作成」にチェックを入れてユーザー名を入力してください。');
			}
		} catch (error) {
			console.error('Login error:', error);
		}
	}

	import { generateSecretKey } from 'nostr-tools';

	function generateKey() {
		const skUint8Array = generateSecretKey();
		sk = bech32.encodeFromBytes('nsec', skUint8Array);
		console.log('Generated secret key:', sk);
	}

	function copyToClipboard() {
		if (sk === '') {
			alert('Please generate a secret key first');
			return;
		}

		navigator.clipboard
			.writeText(sk)
			.then(() => {
				alert('Secret key copied to clipboard');
			})
			.catch((err) => {
				console.error('Could not copy text: ', err);
			});
	}
</script>

<div class="space-y-3 w-full p-10">
	<h1>ログイン / ユーザー作成</h1>

	<div class="flex flex-row space-x-2">
		<input
			type="password"
			bind:value={sk}
			placeholder="秘密鍵 (nsec1...)"
			class="border border-gray-300 rounded p-2 w-full flex-1"
		/>
		<Button onclick={generateKey}>自動生成</Button>
	</div>

	<div class="flex items-center space-x-2">
		<input 
			type="checkbox" 
			bind:checked={isNewUser} 
			id="newUser"
			class="w-4 h-4"
		/>
		<label for="newUser" class="text-sm">新規ユーザー作成</label>
	</div>

	{#if isNewUser}
		<input
			type="text"
			bind:value={name}
			placeholder="ユーザー名"
			class="border border-gray-300 rounded p-2 w-full"
		/>
	{/if}

	<div class="flex flex-row space-x-2">
		<Button onclick={copyToClipboard}>鍵をクリップボードにコピー</Button>
		<p class="text-red-500 text-sm">
			注意1. 秘密鍵は絶対に他人に教えないでください。<br />
			注意2. 秘密鍵を失うと、アカウントにアクセスできなくなります。
		</p>
	</div>

	<div class="flex justify-end space-x-2">
		<Button
			color="primary"
			onclick={handleLogin}
		>
			{isNewUser ? 'ユーザー作成してログイン' : 'ログイン'}
		</Button>
	</div>
</div>
