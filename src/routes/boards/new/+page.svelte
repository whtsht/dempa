<script lang="ts">
	import { currentUser, dempaClient, type Role, type Action, type Member } from '$lib/dempa';
	import { Button, Card, Checkbox, Select } from 'flowbite-svelte';
	import { onMount } from 'svelte';

	let name = $state('');
	let description = $state('');
	let roles: Role[] = $state([
		{
			name: 'admin',
			approver: null,
			actions: ['Comment', 'OpenThread', 'Board']
		}
	]);

	let roleName = $state('');
	let roleActions = $state<{ [key in Action]?: boolean }>({
		OpenThread: false,
		Comment: false,
		Board: false
	});

	const allActions: Action[] = ['OpenThread', 'Comment', 'Board'];

	const actionLabels: Record<Action, string> = {
		OpenThread: 'スレッドの作成',
		Comment: 'コメントの作成',
		Board: 'ボード管理'
	};

	function addRole() {
		if (!roleName) {
			alert('ロール名を入力してください');
			return;
		}

		const selectedActions = Object.entries(roleActions)
			.filter(([_, isSelected]) => isSelected)
			.map(([action]) => action as Action);

		roles = [
			...roles,
			{
				name: roleName,
				approver: null,
				actions: selectedActions
			}
		];

		roleName = '';
		roleActions = {
			OpenThread: false,
			Comment: false,
			Board: false
		};
	}

	function removeRole(index: number) {
		if (roles[index].name === 'admin') {
			alert('管理者ロールは削除できません');
			return;
		}
		roles = roles.filter((_, i) => i !== index);
	}

	// メンバー管理関連
	let members: Member[] = $state([]);
	let memberPubkey = $state('');
	let selectedRole = $state('admin');

	onMount(async () => {
		const user = await currentUser();
		members.push({
			pubkey: user.pubkey,
			role: 'admin'
		});
	});

	function addMember() {
		if (!memberPubkey) {
			alert('公開鍵を入力してください');
			return;
		}

		if (!selectedRole) {
			alert('ロールを選択してください');
			return;
		}

		// 重複チェック
		if (members.some((member) => member.pubkey === memberPubkey)) {
			alert('このメンバーは既に追加されています');
			return;
		}

		members = [
			...members,
			{
				pubkey: memberPubkey,
				role: selectedRole
			}
		];

		// フォームをリセット
		memberPubkey = '';
		selectedRole = 'admin';
	}

	function removeMember(index: number) {
		if (index === 0) {
			alert('自分自身は削除できません');
			return;
		}
		members = members.filter((_, i) => i !== index);
	}

	// 公開鍵を短く表示するヘルパー関数
	function formatPubkey(pubkey: string): string {
		if (pubkey.length <= 10) return pubkey;
		return `${pubkey.substring(0, 5)}...${pubkey.substring(pubkey.length - 5)}`;
	}

	async function publishBoard() {
		const dempa = dempaClient();

		const board = dempa.createBoard({
			name,
			description,
			roles,
			members
		});
		await dempa.publishBoard(board);
		return board.id;
	}
</script>

<div class="space-y-4 w-[70%] p-10 overflow-auto ml-auto mr-auto">
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

	<!-- ロール設定セクション -->
	<div class="space-y-4 flex flex-col">
		<h2 class="text-xl font-semibold">ロール設定</h2>
		<div class="flex flex-row space-x-3">
			<div class="space-y-2 w-lg">
				{#each roles as role, index}
					<Card class="p-2 max-w-full">
						<div class="flex justify-between items-center">
							<div class="flex-1">
								<span class="font-semibold">{role.name}</span>
								<div class="mt-1 text-gray-500 text-sm">
									{#each role.actions as actionItem}
										<span class="mr-2 inline-block bg-gray-100 px-2 py-0.5 rounded"
											>{actionLabels[actionItem]}</span
										>
									{/each}
								</div>
							</div>
							<Button
								color="red"
								size="xs"
								onclick={() => removeRole(index)}
								disabled={role.name === 'admin'}
							>
								削除
							</Button>
						</div>
					</Card>
				{/each}
			</div>

			<Card class="p-4">
				<h3 class="mb-2 text-lg">新しいロールを追加</h3>
				<div class="flex flex-col space-y-3">
					<input
						type="text"
						bind:value={roleName}
						placeholder="ロール名"
						class="border border-gray-300 rounded p-2"
					/>

					<div class="space-y-2">
						<p class="font-medium">アクション:</p>
						{#each allActions as action}
							<div class="flex items-center">
								<Checkbox bind:checked={roleActions[action]} id={`action-${action}`} />
								<label for={`action-${action}`} class="ml-2">{actionLabels[action]}</label>
							</div>
						{/each}
					</div>

					<Button onclick={addRole}>ロールを追加</Button>
				</div>
			</Card>
		</div>
	</div>

	<!-- メンバー設定セクション -->
	<div class="space-y-4 flex flex-col">
		<h2 class="text-xl font-semibold">メンバー設定</h2>
		<div class="flex flex-row space-x-3">
			<div class="space-y-2 w-lg">
				{#each members as member, index}
					<Card class="p-2 max-w-full">
						<div class="flex justify-between items-center">
							<div class="flex-1">
								<span class="font-semibold">{formatPubkey(member.pubkey)}</span>
								<div class="mt-1 text-gray-500 text-sm">
									<span class="mr-2 inline-block bg-gray-100 px-2 py-0.5 rounded"
										>{member.role}</span
									>
								</div>
							</div>
							<Button
								color="red"
								size="xs"
								onclick={() => removeMember(index)}
								disabled={index === 0}
							>
								削除
							</Button>
						</div>
					</Card>
				{/each}
			</div>

			<Card class="p-4">
				<h3 class="mb-2 text-lg">新しいメンバーを追加</h3>
				<div class="flex flex-col space-y-3">
					<input
						type="text"
						bind:value={memberPubkey}
						placeholder="公開鍵 (npub1...)"
						class="border border-gray-300 rounded p-2"
					/>

					<div class="space-y-2">
						<p class="font-medium">ロール:</p>
						<Select id="role-select" bind:value={selectedRole} class="w-full">
							{#each roles as role}
								<option value={role.name}>{role.name}</option>
							{/each}
						</Select>
					</div>

					<Button onclick={addMember}>メンバーを追加</Button>
				</div>
			</Card>
		</div>
	</div>

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
