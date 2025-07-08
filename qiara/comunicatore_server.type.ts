import Fornitore from "../moduli/fornitore";

type CommuncationErrors = {
    OK: 0;
    CHANGED_ON_SERVER: 1;
    SERVER_ERROR: 2;
}

type TResponse = CommuncationErrors[] | CommuncationErrors["SERVER_ERROR"];

type TCommuncatoreServer = {
    insert: () => Promise<TResponse>;
    update: () => Promise<TResponse>;
    select: () => Promise<TResponse>;
    needsAuth: () => Fornitore<boolean>;
}
    
export default TCommuncatoreServer;