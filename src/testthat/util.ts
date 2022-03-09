import * as path from "path";

export function encodeNodeId(
    filePath: string,
    testLabel: string,
    testSuperLabel: string | undefined = undefined
) {
    let normalizedFilePath = path.normalize(filePath);
    normalizedFilePath = normalizedFilePath.replace(/^[\\\/]+|[\\\/]+$/g, "");
    return testSuperLabel
        ? `${normalizedFilePath}&${testSuperLabel}: ${testLabel}`
        : `${normalizedFilePath}&${testLabel}`;
}