/**
 * Decodes raw data.
 * @param data The data to decode.
 * @return The decoded data.
 */
export function convertBlobToBase64(blob): Promise<string | ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            const base64data = reader.result;
            resolve(base64data);
        };
        reader.onerror = (event) => {
            reject(event);
            reader.abort();
        };
    });
}
