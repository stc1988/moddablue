#include "xsmc.h"
#include "xsHost.h"
#include "commodettoBitmapFormat.h"
#include <stdlib.h>

#define MIN_COLOR_DISTANCE 32
#define SAMPLE_STEP 8

static uint8_t clampComponent(int value)
{
	if (value < 0)
		return 0;
	if (value > 255)
		return 255;
	return (uint8_t)value;
}

static uint8_t prepareComponent(uint32_t value, uint32_t count, uint8_t numerator)
{
	int average = (int)((value + (count >> 1)) / count);
	int muted = (average * numerator + 50) / 100;
	return clampComponent(muted + 10);
}

static void prepareColor(uint32_t r, uint32_t g, uint32_t b, uint32_t count, uint8_t darken, uint8_t *out)
{
	uint8_t numerator = 100 - darken;
	out[0] = prepareComponent(r, count, numerator);
	out[1] = prepareComponent(g, count, numerator);
	out[2] = prepareComponent(b, count, numerator);
}

static int colorDistance(const uint8_t *a, const uint8_t *b)
{
	return abs((int)a[0] - (int)b[0]) + abs((int)a[1] - (int)b[1]) + abs((int)a[2] - (int)b[2]);
}

static void darkenColor(uint8_t *color, uint8_t numerator)
{
	color[0] = (uint8_t)((color[0] * numerator + 50) / 100);
	color[1] = (uint8_t)((color[1] * numerator + 50) / 100);
	color[2] = (uint8_t)((color[2] * numerator + 50) / 100);
}

static uint8_t read8(const uint8_t *bytes, xsUnsignedValue byteLength, xsUnsignedValue offset)
{
	if (offset >= byteLength)
		return 0;
	return bytes[offset];
}

static int readPixel(const uint8_t *bytes, xsUnsignedValue byteLength, int width, int pixelFormat, xsUnsignedValue baseOffset, int x, int y, uint8_t *out)
{
	xsUnsignedValue index = (xsUnsignedValue)y * (xsUnsignedValue)width + (xsUnsignedValue)x;
	xsUnsignedValue offset;
	uint16_t value;

	switch (pixelFormat) {
		case kCommodettoBitmapRGB565LE:
			offset = baseOffset + index * 2;
			if ((offset + 1) >= byteLength)
				return 0;
			value = (uint16_t)bytes[offset] | ((uint16_t)bytes[offset + 1] << 8);
			out[0] = (uint8_t)(((value >> 11) & 0x1F) << 3);
			out[1] = (uint8_t)(((value >> 5) & 0x3F) << 2);
			out[2] = (uint8_t)((value & 0x1F) << 3);
			return 1;

		case kCommodettoBitmapRGB565BE:
			offset = baseOffset + index * 2;
			if ((offset + 1) >= byteLength)
				return 0;
			value = ((uint16_t)bytes[offset] << 8) | (uint16_t)bytes[offset + 1];
			out[0] = (uint8_t)(((value >> 11) & 0x1F) << 3);
			out[1] = (uint8_t)(((value >> 5) & 0x3F) << 2);
			out[2] = (uint8_t)((value & 0x1F) << 3);
			return 1;

		case kCommodettoBitmap24RGB:
			offset = baseOffset + index * 3;
			if ((offset + 2) >= byteLength)
				return 0;
			out[0] = read8(bytes, byteLength, offset);
			out[1] = read8(bytes, byteLength, offset + 1);
			out[2] = read8(bytes, byteLength, offset + 2);
			return 1;

		case kCommodettoBitmap32RGBA:
			offset = baseOffset + index * 4;
			if ((offset + 2) >= byteLength)
				return 0;
			out[0] = read8(bytes, byteLength, offset);
			out[1] = read8(bytes, byteLength, offset + 1);
			out[2] = read8(bytes, byteLength, offset + 2);
			return 1;

		case kCommodettoBitmapBGRA32:
			offset = baseOffset + index * 4;
			if ((offset + 2) >= byteLength)
				return 0;
			out[0] = read8(bytes, byteLength, offset + 2);
			out[1] = read8(bytes, byteLength, offset + 1);
			out[2] = read8(bytes, byteLength, offset);
			return 1;
	}

	return 0;
}

static int averageRegion(const uint8_t *bytes, xsUnsignedValue byteLength, int width, int height, int pixelFormat, xsUnsignedValue baseOffset, int yStart, int yEnd, uint32_t *out)
{
	uint32_t count = 0;
	uint8_t pixel[3];

	out[0] = 0;
	out[1] = 0;
	out[2] = 0;

	for (int y = yStart; y < yEnd; y += SAMPLE_STEP) {
		for (int x = 0; x < width; x += SAMPLE_STEP) {
			if (!readPixel(bytes, byteLength, width, pixelFormat, baseOffset, x, y, pixel))
				continue;
			out[0] += pixel[0];
			out[1] += pixel[1];
			out[2] += pixel[2];
			count += 1;
		}
	}

	return count;
}

void xs_extractThemeColors(xsMachine *the)
{
	void *buffer;
	xsUnsignedValue byteLength;
	int width = xsmcToInteger(xsArg(1));
	int height = xsmcToInteger(xsArg(2));
	int pixelFormat = xsmcToInteger(xsArg(3));
	xsUnsignedValue offset = (xsUnsignedValue)xsmcToInteger(xsArg(4));
	int middle;
	uint32_t top[3], bottom[3];
	uint32_t topCount, bottomCount;
	uint8_t *result;

	if ((width <= 0) || (height <= 0)) {
		xsResult = xsUndefined;
		return;
	}

	xsmcGetBufferReadable(xsArg(0), &buffer, &byteLength);
	if (!buffer || (offset >= byteLength)) {
		xsResult = xsUndefined;
		return;
	}

	middle = height >> 1;
	if (middle < 1)
		middle = 1;

	topCount = averageRegion(buffer, byteLength, width, height, pixelFormat, offset, 0, middle, top);
	bottomCount = averageRegion(buffer, byteLength, width, height, pixelFormat, offset, middle, height, bottom);
	if (!topCount || !bottomCount) {
		xsResult = xsUndefined;
		return;
	}

	result = xsmcSetArrayBuffer(xsResult, NULL, 6);
	prepareColor(top[0], top[1], top[2], topCount, 64, result);
	prepareColor(bottom[0], bottom[1], bottom[2], bottomCount, 76, result + 3);
	if (colorDistance(result, result + 3) < MIN_COLOR_DISTANCE)
		darkenColor(result + 3, 72);
}
