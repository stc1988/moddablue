const extractThemeColors = native("xs_extractThemeColors");

export default function extractThemeColorsFromBitmap(bitmap) {
	return extractThemeColors.call(this, bitmap.buffer, bitmap.width, bitmap.height, bitmap.pixelFormat, bitmap.offset);
}
