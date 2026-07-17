import { exit } from 'node:process';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
	CompletionItemKind,
	createConnection,
	type Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	SemanticTokensBuilder,
	TextDocuments,
	TextDocumentSyncKind,
	TextEdit,
} from 'vscode-languageserver/node';

// 创建连接
const connection = createConnection(ProposedFeatures.all);
// 导入 LSP 服务
const {
	findDefinition,
	findReferences,
	getCompletions,
	getDiagnostics,
	getFormattedCode,
	getHighlightTokens,
	getHoverInfo,
	getInlayHints,
	legend,
	rangeOf,
	StateManager,
	VERSION,
	version,
} = await import('meaoiu').catch(err => {
	if (!(err instanceof Error)) throw err;
	connection.console.error(`无法触及喵谕本体：${err}\n试试全局安装 meaoiu 包喵~`);
	// 客户端，我是废物喵！
	connection.onInitialize(() => ({ capabilities: {} }));
	// 再问问抢救还是放弃
	connection.onInitialized(async () => {
		const action = await connection.window.showErrorMessage(
			'Σ( ° △ °|||) 喵谕本体好像不见了喵！快用 npm install -g meaoiu 请回来喵~',
			{ title: '抓回来啦，再试一次', retry: true },
			{ title: '好麻烦，不用了', retry: false },
		);
		if (action?.retry) exit(1); // 触发重启
	});
	connection.listen();
	// 没有抢救，挂在原地
	return new Promise<never>(() => {});
});

const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
const stateManager = new StateManager(false);
const serviceStateFor = (uri: string) => {
	const document = documents.get(uri);
	return document ? stateManager.useState(document) : undefined;
};

connection.onInitialize(() => {
	connection.console.info('Meaoiu 普通 LSP 服务端正在启动喵...');
	return {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// 客户端，我告诉你喵！
			hoverProvider: true,
			definitionProvider: true,
			referencesProvider: true,
			completionProvider: { resolveProvider: false },
			semanticTokensProvider: { legend, full: true },
			inlayHintProvider: true,
			documentFormattingProvider: true,
		},
	};
});
connection.onInitialized(() => {
	const verStr = `（喵谕版本 ${VERSION ?? version ?? '<0.1.7'}）`;
	connection.console.info(`喵谕语言服务器启动成功喵！${verStr}`);
	connection.window.showInformationMessage(`ψ(｀∇´)ψ 喵谕语言服务可以用了喵~ ${verStr}`);
});

// --- 诊断服务 ---
documents.onDidChangeContent(({ document }) => {
	const serviceState = stateManager.updateState(document);
	const { syntaxErrors, semanticErrors } = getDiagnostics(serviceState);

	const diagnostics = new Array<Diagnostic>(syntaxErrors.length + semanticErrors.length);
	let index = 0;
	const { Error: S_ERROR, Warning: S_WARNING } = DiagnosticSeverity;
	for (const e of syntaxErrors) {
		diagnostics[index++] = { severity: S_ERROR, range: rangeOf(e), message: e.message, source: 'meaoiu (syntax)' };
	}
	for (const e of semanticErrors) {
		diagnostics[index++] = { severity: S_WARNING, range: rangeOf(e), message: e.message, source: 'meaoiu (semantic)' };
	}

	connection.sendDiagnostics({ uri: document.uri, diagnostics });
});

// --- 悬停提示服务 ---
connection.onHover(({ textDocument: { uri }, position }) => {
	const serviceState = serviceStateFor(uri);
	return serviceState ? getHoverInfo(serviceState, position, 'markdown') : undefined;
});

// --- 转到定义服务 ---
connection.onDefinition(({ textDocument: { uri }, position }) => {
	const serviceState = serviceStateFor(uri);
	if (!serviceState) return undefined;

	const symbolInfo = findDefinition(serviceState, position);
	return symbolInfo?.declarations.length ? { uri, range: rangeOf(symbolInfo.declarations[0]!) } : undefined;
});

// --- 查找所有引用服务 ---
connection.onReferences(({ textDocument: { uri }, position }) => {
	const serviceState = serviceStateFor(uri);
	if (!serviceState) return [];

	return findReferences(serviceState, position).map(identifier => ({ uri, range: rangeOf(identifier) }));
});

// --- 自动补全服务 ---
connection.onCompletion(({ textDocument: { uri }, position }) => {
	const serviceState = serviceStateFor(uri);
	if (!serviceState) return [];

	return getCompletions(serviceState, position).map(s => ({
		...s,
		kind: s.kind === CompletionItemKind.Reference ? CompletionItemKind.Variable : s.kind,
	}));
});

// --- 内联提示服务 ---
connection.languages.inlayHint.on(({ textDocument: { uri } }) => {
	const serviceState = serviceStateFor(uri);
	return serviceState ? getInlayHints(serviceState) : [];
});

// --- 语义高亮服务 ---
connection.languages.semanticTokens.on(({ textDocument: { uri } }) => {
	const serviceState = serviceStateFor(uri);
	if (!serviceState) return { data: [] };

	const tokensToPush = getHighlightTokens(serviceState);
	const builder = new SemanticTokensBuilder();
	for (const t of tokensToPush) builder.push(t.line, t.col, t.length, t.tokenType, t.tokenModifiers);

	connection.console.debug(`有 ${tokensToPush.length} 个标记变漂亮喵`);
	return builder.build();
});

// --- 文档格式化服务 ---
connection.onDocumentFormatting(async ({ textDocument: { uri } }) => {
	const document = documents.get(uri);
	if (!document) return [];

	const sourceCode = document.getText();
	const { errors, format } = getFormattedCode(sourceCode);
	if (errors.length) {
		// 直接拒绝？
		// return connection.window.showWarningMessage(`ヾ(≧へ≦)〃 不许格式化喵！解析错 ${errors.length} 处，先修好再来喵~`);

		// 弹窗确认
		const action = await connection.window.showWarningMessage(
			`(；OдO) 解析错 ${errors.length} 处喵！乱来会坏掉的，真的要继续吗？`,
			{ title: '都是幻觉，继续', isForce: true },
			{ title: '算了，改好再来', isForce: false },
		);
		if (!action?.isForce) return undefined; // 手慢、不理或主动取消
	}

	// 用格式化后的代码替换整个文档
	return [TextEdit.replace({ start: { line: 0, character: 0 }, end: document.positionAt(sourceCode.length) }, format())];
});

documents.listen(connection);
connection.listen();
