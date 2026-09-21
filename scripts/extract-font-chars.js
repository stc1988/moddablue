const fs = require("node:fs");
const path = require("node:path");
const { TextDecoder } = require("node:util");
const fontkit = require("fontkit");

/*
 * フォントが収録している文字から、Moddable の `characterFiles` に渡す文字一覧を生成する。
 * 対象は下記の Unicode ブロック、JIS 第1水準漢字、および明示的に追加した文字。
 *
 * 使い方:
 *   npm run extract-font-chars
 *   npm run extract-font-chars -- path/to/font.ttf --chars "追加文字" --output path/to/chars.txt
 *
 * フォントを省略すると共有の MPLUS1-Medium.ttf を読み、同じディレクトリの
 * MPLUS1-chars.txt を更新する。別のフォントでは、既定の出力先はそのフォントと
 * 同じディレクトリの `<フォント名>-chars.txt`。未収録の追加文字は警告に表示する。
 */

// 生成対象にする Unicode ブロックはここで管理する。
const TARGET_UNICODE_BLOCKS = [
	{ name: "Basic Latin", start: 0x0000, end: 0x007f },
	{ name: "Latin-1 Supplement", start: 0x0080, end: 0x00ff },
	{ name: "General Punctuation", start: 0x2000, end: 0x206f },
	{ name: "CJK Symbols and Punctuation", start: 0x3000, end: 0x303f },
	{ name: "Hiragana", start: 0x3040, end: 0x309f },
	{ name: "Katakana", start: 0x30a0, end: 0x30ff },
	{ name: "Katakana Phonetic Extensions", start: 0x31f0, end: 0x31ff },
	{ name: "Halfwidth and Fullwidth Forms", start: 0xff00, end: 0xffef },
];

// JIS X 0208の16区〜47区で定義されるJIS第1水準漢字（2,965字）。
const JIS_LEVEL_1_KANJI = createJisLevel1Kanji();

// ブロック外から常に追加する文字をここに記載する。
const ADDITIONAL_CHARACTERS = "";

const DEFAULT_FONT_PATH = path.resolve(__dirname, "../examples/assets/fonts/MPLUS1-Medium.ttf");
const DEFAULT_OUTPUT_PATH = path.join(path.dirname(DEFAULT_FONT_PATH), "MPLUS1-chars.txt");

const args = process.argv.slice(2);
const hasFontArgument = args[0] && !args[0].startsWith("--");
const fontPath = hasFontArgument ? args.shift() : DEFAULT_FONT_PATH;
let additionalCharactersFromCli = "";
let outputPathFromCli;

while (args.length > 0) {
	const option = args.shift();
	const value = args.shift();

	if (!value) {
		console.error(`Missing value for ${option}`);
		process.exit(1);
	}

	if (option === "--chars") {
		additionalCharactersFromCli += value;
	} else if (option === "--output") {
		outputPathFromCli = value;
	} else {
		console.error(`Unknown option: ${option}`);
		process.exit(1);
	}
}

const requestedAdditionalCharacters = `${ADDITIONAL_CHARACTERS}${additionalCharactersFromCli}`;

const resolvedFontPath = path.resolve(fontPath);

if (!fs.existsSync(resolvedFontPath)) {
	console.error(`Font file not found: ${resolvedFontPath}`);
	process.exit(1);
}

const fontDir = path.dirname(resolvedFontPath);
const fontBaseName = path.basename(resolvedFontPath, path.extname(resolvedFontPath));
const outputPath = outputPathFromCli
	? path.resolve(outputPathFromCli)
	: hasFontArgument
		? path.join(fontDir, `${fontBaseName}-chars.txt`)
		: DEFAULT_OUTPUT_PATH;

let font;

try {
	font = fontkit.openSync(resolvedFontPath);
} catch (error) {
	console.error(
		`Failed to open font file: ${resolvedFontPath}\n${error instanceof Error ? error.message : String(error)}`,
	);
	process.exit(1);
}

const fontCodePoints = new Set(font.characterSet);
const selectedCodePoints = new Set();

for (const cp of fontCodePoints) {
	// C0、DEL、C1 の制御文字は除外
	if (cp < 0x20 || (cp >= 0x7f && cp <= 0x9f)) continue;

	// U+D800..U+DFFF は UTF-16 のサロゲート用予約領域で、単独の文字ではない
	if (cp >= 0xd800 && cp <= 0xdfff) continue;

	if (TARGET_UNICODE_BLOCKS.some(({ start, end }) => cp >= start && cp <= end)) {
		selectedCodePoints.add(cp);
	}
}

const blockCharacterCount = selectedCodePoints.size;

for (const character of JIS_LEVEL_1_KANJI) {
	const cp = character.codePointAt(0);

	if (fontCodePoints.has(cp)) selectedCodePoints.add(cp);
}

const jisLevel1CharacterCount = selectedCodePoints.size - blockCharacterCount;
const baseCharacterCount = selectedCodePoints.size;
const missingAdditionalCharacters = [];

for (const character of requestedAdditionalCharacters) {
	const cp = character.codePointAt(0);

	if (fontCodePoints.has(cp)) {
		selectedCodePoints.add(cp);
	} else if (!missingAdditionalCharacters.includes(character)) {
		missingAdditionalCharacters.push(character);
	}
}

const chars = [...selectedCodePoints].sort((a, b) => a - b).map((cp) => String.fromCodePoint(cp));

fs.writeFileSync(outputPath, chars.join(""), "utf8");

console.log(`font: ${resolvedFontPath}`);
console.log(`output: ${outputPath}`);
console.log(`blocks: ${TARGET_UNICODE_BLOCKS.map(({ name }) => name).join(", ")}`);
console.log(`block chars: ${blockCharacterCount}`);
console.log(`JIS level 1 kanji: ${jisLevel1CharacterCount}`);
console.log(`additional chars: ${chars.length - baseCharacterCount}`);
console.log(`total chars: ${chars.length}`);

if (missingAdditionalCharacters.length > 0) {
	console.warn(`not in font: ${missingAdditionalCharacters.join("")}`);
}

function createJisLevel1Kanji() {
	const decoder = new TextDecoder("shift_jis", { fatal: true });
	const characters = [];

	for (let ku = 16; ku <= 47; ku++) {
		const row = ku + 0x20;
		const lead = ((row - 0x21) >> 1) + (row <= 0x5e ? 0x81 : 0xc1);

		for (let ten = 1; ten <= 94; ten++) {
			const cell = ten + 0x20;
			const trail = row % 2 === 0 ? cell + 0x7e : cell + (cell <= 0x5f ? 0x1f : 0x20);

			try {
				characters.push(decoder.decode(Uint8Array.of(lead, trail)));
			} catch {
				// JIS X 0208で未割り当ての区点は除外する。
			}
		}
	}

	if (characters.length !== 2965) {
		throw new Error(`Unexpected JIS level 1 kanji count: ${characters.length}`);
	}

	return characters;
}
