import { HttpResponse } from '@angular/common/http';

/**
 * @description Check if it's an HttpResponse
 * @param {any} data - Variable to test
 * @return {boolean} - data from cache
 */
export function isHttpResponse(data: any): boolean {
    let orCondition =
        data &&
        typeof data === 'object' &&
        data.hasOwnProperty('status') &&
        data.hasOwnProperty('statusText') &&
        data.hasOwnProperty('headers') &&
        data.hasOwnProperty('url') &&
        data.hasOwnProperty('body');

    return data && (data instanceof HttpResponse || orCondition);
}
