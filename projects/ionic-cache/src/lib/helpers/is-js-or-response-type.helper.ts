export function isJsOrResponseType(data: any): boolean {
    const jsType =
        data.type === 'undefined' ||
        data.type === 'object' ||
        data.type === 'boolean' ||
        data.type === 'number' ||
        data.type === 'bigint' ||
        data.type === 'string' ||
        data.type === 'symbol' ||
        data.type === 'function';

    const responseType = data.type === 'response';

    return responseType || jsType;
}
