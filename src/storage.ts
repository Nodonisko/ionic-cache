export class SqlStorage {
    private database: Database;

    constructor() {
        this.database = window.openDatabase('cache', '1.0', 'cache', 5 * 1024 * 1024);
    }

    /**
     * @description Call database query
     * @return {Promise<any>}
     */
    public query(query: String): Promise<any> {
        return new Promise((resolve, reject) => {
            this.database.transaction((tx) => {
                tx.executeSql(query, [], (tx, rs) => {
                   resolve(rs); 
                }, (tx, err) => {
                    reject(err);
                    return false;
                });
            });
        });
    }
}