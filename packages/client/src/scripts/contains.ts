export default (parent: Node | null | undefined, child: EventTarget | null, checkSame = true) => {
	if (!(child instanceof Node)) return false;
	if (checkSame && parent === child) return true;
	let node = child.parentNode;
	while (node) {
		if (node === parent) return true;
		node = node.parentNode;
	}
	return false;
};
