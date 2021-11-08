export interface IRequestService {
    deleteRequest(path: string): Promise<any>;
    getRequest(path: string): Promise<any>;
    postRequest(path: string, payload?: any): Promise<any>;
    putRequest(path: string, payload: any): Promise<any>;
    tryParseResponse(response);
}
