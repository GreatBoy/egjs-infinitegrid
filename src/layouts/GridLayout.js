import {APPEND, PREPEND, HORIZONTAL, ALIGN} from "../consts";
import {getStyleNames, assignOptions} from "../utils";

// ALIGN
const {START, CENTER, END, JUSTIFY} = ALIGN;

function fill(length, pos) {
	return new Array(length).fill(pos);
}
class GridLayout {
	constructor(options = {}) {
		this.options = assignOptions({
			align: START,
			itemSize: 0,
		}, options);
		this._size = 0;
		this._isHorizontal = this.options.direction === HORIZONTAL;
		this._columnSize = 0;
		this._columnLength = 0;
		this._style = getStyleNames(this.options.direction);
	}
	getPoints(outlines) {
		const pos = this._isHorizontal ? "left" : "top";

		return outlines.map(outline => outline[pos]);
	}
	checkColumn(item) {
		const margin = this.options.margin;
		// if direction is horizontal, fixed dimension is height
		// if direction is vertical, fixed dimension is width
		const sizeName = this._isHorizontal ? "height" : "width";
		const columnSize = this.options.itemSize || (item && item.size[sizeName]) || 0;

		this._columnSize = columnSize;
		if (!columnSize) {
			this._columnLength = 1;
			return;
		}
		this._columnLength = Math.max(parseInt((this._size + margin) / (columnSize + margin), 10), 1);
	}
	_layout(items, outline, isAppend) {
		const length = items.length;
		const margin = this.options.margin;
		const align = this.options.align;
		const style = this._style;

		const size1Name = style.size1;
		const size2Name = style.size2;
		const pos1Name = style.pos1;
		const pos2Name = style.pos2;
		const columnSize = this._columnSize;
		const columnLength = this._columnLength;

		const size = this._size;
		const viewDist = (size - (columnSize + margin) * columnLength + margin);

		const pointCaculateName = isAppend ? "min" : "max";
		const startOutline = outline.slice();
		const endOutline = outline.slice();
		const startIndex = 0;
		let endIndex = -1;
		let endPos = -1;

		for (let i = 0; i < length; ++i) {
			const point = Math[pointCaculateName](...endOutline) || 0;
			let index = endOutline.indexOf(point);
			const item = items[isAppend ? i : length - 1 - i];
			const size1 = item.size[size1Name];
			const size2 = item.size[size2Name];
			const pos1 = isAppend ? point : point - margin - size1;
			const endPos1 = pos1 + size1 + margin;

			if (index === -1) {
				index = 0;
			}
			let pos2 = (columnSize + margin) * index;

			// ALIGN
			if (align === CENTER) {
				pos2 += viewDist / 2;
			} else if (align === END) {
				pos2 += viewDist + columnSize - size2;
			} else if (align === JUSTIFY) {
				pos2 = (size - columnSize) / (columnLength - 1) * index;
			}
			// tetris
			item.rect = {
				[pos1Name]: pos1,
				[pos2Name]: pos2,
			};
			item.column = index;
			endOutline[index] = isAppend ? endPos1 : pos1;
			if (endIndex === -1) {
				endIndex = i;
				endPos = endPos1;
			} else if (endPos < endPos1) {
				endIndex = i;
				endPos = endPos1;
			}
		}
		if (!isAppend) {
			items.sort((a, b) => {
				const item1pos1 = a.rect[pos1Name];
				const item1pos2 = a.rect[pos2Name];
				const item2pos1 = b.rect[pos1Name];
				const item2pos2 = b.rect[pos2Name];

				if (item1pos1 - item2pos1) {
					return item1pos1 - item2pos1;
				}
				return item1pos2 - item2pos2;
			});
			endIndex = length - 1;
		}
		// if append items, startOutline is low, endOutline is high
		// if prepend items, startOutline is high, endOutline is low
		return {
			start: isAppend ? startOutline : endOutline,
			end: isAppend ? endOutline : startOutline,
			startIndex,
			endIndex,
		};
	}
	_insert(items = [], outline = [], type) {
		const clone = items.map(item => Object.assign({}, item));

		let startOutline = outline;

		if (!this._columnLength) {
			this.checkColumn(items[0]);
		}
		if (outline.length !== this._columnLength) {
			startOutline = fill(this._columnLength, outline.length === 0 ? 0 : (Math[type === APPEND ? "min" : "max"](...outline) || 0));
		}

		const result = this._layout(clone, startOutline, type);

		return {
			items: clone,
			outlines: result,
		};
	}
	append(items, outline) {
		return this._insert(items, outline, APPEND);
	}
	prepend(items, outline) {
		return this._insert(items, outline, PREPEND);
	}
	layout(groups = [], outline = [], isAppend) {
		const firstItem = (groups.length && groups[0].items.length && groups[0].items[0]) || 0;

		this.checkColumn(firstItem);

		// if outlines' length and columns' length are now same, re-caculate outlines.
		let startOutline;

		if (outline.length !== this._columnLength) {
			const pos = outline.length === 0 ? 0 : Math.min(...outline);

			// re-layout items.
			startOutline = fill(this._columnLength, pos);
		} else {
			startOutline = outline.slice();
		}
		groups.forEach(group => {
			const items = group.items;
			const result = this._layout(items, startOutline, APPEND);

			group.outlines = result;
			startOutline = result.end;
		});
	}
	setSize(size) {
		this._size = size;
	}
}

export default GridLayout;
