# 喵谕语言服务器
这是一个用于 **[喵谕 Meaoiu](https://github.com/P-TNPC/Meaoiu)** 的语言服务器喵~

## 安装使用
```bash
npm install -g meaoiu @meaoiu/language-server
```
装好后用 `meaoiu-lsp --通信方式` 在客户端连接或连接客户端喵~\
通信方式例：`--stdio`、`--node-ipc` 在客户端连接 LSP，`--socket=233` 让 LSP 连接一个端口在 `233` 的客户端~
>[!IMPORTANT]
>一定要同时安装 `@meaoiu/language-server` 和 `meaoiu` 喵~

>[!NOTE]
>如果不用「no -> de」而用「no <- de」运行，上面的咒语不行，看下面喵~

Deno 会迷路，换个方法，用下面简单几句话就能搞掂喵~
```typescript
#!/usr/bin/env -S deno --allow-env --allow-net
import 'npm:meaoiu'
import 'npm:@meaoiu/language-server'
```
把它保存到文件，就可以用 `文件路径 --通信方式` 或 `deno run 文件路径 --通信方式` 启动喵~（自己给权限喵）\
例：文件名为 `meaoiu-lsp.ts`，可以在同目录执行 `./meaoiu-lsp.ts --socket=233`~

## 使用示例
这是一个简单的 VSCode 扩展客户端标准输入输出连接示例喵~
```typescript
import { LanguageClient, type LanguageClientOptions, type ServerOptions, TransportKind } from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export function activate(): Thenable<void> {
	const serverOptions: ServerOptions = {
		command: 'meaoiu-lsp',
		args: ['--stdio'],
		options: { shell: true },
		transport: TransportKind.stdio,
	};
	const clientOptions: LanguageClientOptions = { documentSelector: [{ scheme: 'file', language: 'meaoiu' }] };

	client = new LanguageClient('meaoiuLsp', 'Meaoiu Language Server', serverOptions, clientOptions);
	return client.start();
}

export function deactivate(): Thenable<void> | undefined {
	return client?.stop();
}
```