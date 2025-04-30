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
	<h1>ログイン</h1>

	<input
		type="text"
		bind:value={name}
		placeholder="ユーザー名"
		class="border border-gray-300 rounded p-2 w-full"
	/>

	<div class="flex flex-row space-x-2">
		<input
			type="password"
			bind:value={sk}
			placeholder="秘密鍵 (nsec1...)"
			class="border border-gray-300 rounded p-2 w-full flex-1"
		/>
		<Button onclick={generateKey}>自動生成（ユーザー新規作成）</Button>
	</div>

	<div class="flex flex-row space-x-2">
		<Button onclick={copyToClipboard}>鍵をクリップボードにコピー</Button>
		<p class="text-red-500">
			注意1. 秘密鍵は絶対に他人に教えないでください。<br />
			注意2. 秘密鍵を失うと、アカウントにアクセスできなくなります。
			<br />
		</p>
	</div>

	<div class="flex justify-end space-x-2">
		<Button
			color="primary"
			onclick={async () => {
				await createUser();
				window.location.href = '/';
			}}>ログイン</Button
		>
	</div>
</div>
