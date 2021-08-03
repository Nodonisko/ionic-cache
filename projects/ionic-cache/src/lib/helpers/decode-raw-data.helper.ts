import { HttpResponse } from '@angular/common/http';
import { StorageCacheItem } from '../interfaces/cache-storage-item.interface';
import { isHttpResponse } from './is-http-response.helper';
import { isJsOrResponseType } from './is-js-or-response-type.helper';

export async function decodeRawData(data: StorageCacheItem): Promise<any> {
    const dataJson = JSON.parse(data.value);
    if (isJsOrResponseType(data)) {
        if (isHttpResponse(dataJson)) {
            const response: any = {
                body: dataJson._body || dataJson.body,
                status: dataJson.status,
                headers: dataJson.headers,
                statusText: dataJson.statusText,
                url: dataJson.url
            };

            return new HttpResponse(response);
        }

        return dataJson;
    } else {
        // Technique derived from: https://stackoverflow.com/a/36183085
        const response = await fetch(dataJson);

        return response.blob();
    }
}
