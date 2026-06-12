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

// 导入 LSP 服务
import {
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
} from 'meaoiu';

const connection = createConnection(ProposedFeatures.all);
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
			completionProvider: {
				resolveProvider: false,
			},
			semanticTokensProvider: {
				legend,
				full: true,
			},
			inlayHintProvider: true,
			documentFormattingProvider: true,
		},
	};
});
connection.onInitialized(() => {
	connection.console.info('喵谕语言服务器启动成功喵！');
	connection.window.showInformationMessage('ψ(｀∇´)ψ 喵谕语言服务可以用了喵~');
});

// --- 诊断服务 ---
documents.onDidChangeContent(({ document }) => {
	const serviceState = stateManager.updateState(document);
	const { syntaxErrors, semanticErrors } = getDiagnostics(serviceState);

	const diagnostics = new Array<Diagnostic>(syntaxErrors.length + semanticErrors.length);
	let index = 0;
	for (const e of syntaxErrors) {
		diagnostics[index++] = {
			severity: DiagnosticSeverity.Error,
			range: rangeOf(e),
			message: e.message,
			source: 'meaoiu (syntax)',
		};
	}
	for (const e of semanticErrors) {
		diagnostics[index++] = {
			severity: DiagnosticSeverity.Warning,
			range: rangeOf(e),
			message: e.message,
			source: 'meaoiu (semantic)',
		};
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

	return getCompletions(serviceState, position).map(({ label, kind }) => ({
		label,
		kind: kind === CompletionItemKind.Reference ? CompletionItemKind.Variable : kind,
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
connection.onDocumentFormatting(({ textDocument: { uri } }) => {
	const document = documents.get(uri);
	if (!document) return [];

	const sourceCode = document.getText();
	const formattedCode = getFormattedCode(sourceCode);

	// 用格式化后的代码替换整个文档
	return [TextEdit.replace({ start: { line: 0, character: 0 }, end: document.positionAt(sourceCode.length) }, formattedCode)];
});

documents.listen(connection);
connection.listen();
