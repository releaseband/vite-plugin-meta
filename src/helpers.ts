export const replaceRoot = (filePath: string, root: string): string => {
	if (!filePath) throw new Error(`${replaceRoot.name} filePath error`);
	let splitPath = filePath.split('/');
	if (splitPath.length === 1) splitPath = [root, filePath];
	else splitPath[0] = root;
	return splitPath.join('/');
};
