import { HttpResponse } from '@angular/common/http';

/**
 * Checks if it's a HttpResponse
 * @param data The variable to test
 * @return The data from cache
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
