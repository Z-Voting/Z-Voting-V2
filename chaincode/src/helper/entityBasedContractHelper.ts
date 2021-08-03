import {Context} from 'fabric-contract-api';
import {Iterators} from 'fabric-shim';
import {IEntity} from '../types/IEntity';
import {getImplicitPrivateCollection} from './contractHelper';

export class EntityBasedContractHelper {

    public async readEntity(ctx: Context, id: string) {
        const entityJSON = await ctx.stub.getState(id);

        if (!entityJSON || entityJSON.length === 0) {
            throw new Error(`The entity with id: ${id} does not exist`);
        }
        return entityJSON.toString();
    }

    public async entityExists(ctx: Context, id: string) {
        const entityJSON = await ctx.stub.getState(id);
        return entityJSON && entityJSON.length > 0;
    }

    // saveEntity saves a new entity in the world state
    public async saveEntity(ctx: Context, entity: IEntity): Promise<void> {
        const id = entity.ID;

        const exists = await this.entityExists(ctx, id);
        if (exists) {
            throw new Error(`The entity with id: ${id} already exists`);
        }

        return ctx.stub.putState(id, Buffer.from(JSON.stringify(entity)));
    }

    // updateEntity updates an existing entity in the world state with updated value.
    public async updateEntity(ctx: Context, entity: IEntity): Promise<void> {
        const id = entity.ID;

        const exists = await this.entityExists(ctx, id);
        if (!exists) {
            throw new Error(`The entity with id: ${id} does not exist`);
        }

        return ctx.stub.putState(id, Buffer.from(JSON.stringify(entity)));
    }

    // saveOrUpdateEntity saves or updates an entity in the world state
    public async saveOrUpdateEntity(ctx: Context, entity: IEntity): Promise<void> {
        const id = entity.ID;
        return ctx.stub.putState(id, Buffer.from(JSON.stringify(entity)));
    }

    public async deleteEntity(ctx: Context, entity: IEntity) {
        await ctx.stub.deleteState(entity.ID);
    }

    public async queryLedger(ctx: Context, queryString: string, wideOutput: boolean = false) {
        return await this.getQueryResultForQueryString(ctx, queryString, wideOutput);
    }

    public async queryResultExists(ctx: Context, queryString: string) {
        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        const firstRecord = await resultsIterator.next();

        return !firstRecord.done;
    }

    // getQueryResultForQueryString executes the passed in query string.
    // Result set is built and returned as a byte array containing the JSON results.
    public async getQueryResultForQueryString(ctx: Context, queryString: string, wideOutput: boolean = false) {

        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        const results = await this.getAllQueryResults(resultsIterator, wideOutput);

        return JSON.stringify(results);
    }

    // GetAssetHistory returns the chain of custody for an asset since issuance.
    public async getHistory(ctx: Context, ID: string) {

        const resultsIterator = await ctx.stub.getHistoryForKey(ID);
        const results = await this.getAllHistoryResults(resultsIterator);

        return JSON.stringify(results);
    }

    public async getAllQueryResults(iterator: Iterators.StateQueryIterator, wideOutput: boolean = false) {
        const allResults = [];
        let res = await iterator.next();
        while (!res.done) {
            if (res.value && res.value.value.toString()) {
                let jsonRes: any = {};

                if (wideOutput) {
                    console.log(res.value.value.toString());

                    jsonRes.Key = res.value.key;
                    try {
                        jsonRes.Record = JSON.parse(res.value.value.toString());
                    } catch (err) {
                        console.log(err);
                        jsonRes.Record = res.value.value.toString();
                    }
                } else {
                    try {
                        jsonRes = JSON.parse(res.value.value.toString());
                    } catch (err) {
                        console.log(err);
                        jsonRes = res.value.value.toString();
                    }
                }

                allResults.push(jsonRes);
            }
            res = await iterator.next();
        }
        await iterator.close();
        return allResults;
    }

    public async getAllHistoryResults(iterator: Iterators.HistoryQueryIterator) {
        const allResults = [];
        let res = await iterator.next();
        while (!res.done) {
            if (res.value && res.value.value.toString()) {
                const jsonRes: any = {};
                console.log(res.value.value.toString());

                jsonRes.TxId = res.value.txId;
                jsonRes.Timestamp = res.value.timestamp;
                try {
                    jsonRes.Value = JSON.parse(res.value.value.toString());
                } catch (err) {
                    console.log(err);
                    jsonRes.Value = res.value.value.toString();
                }

                allResults.push(jsonRes);
            }
            res = await iterator.next();
        }
        await iterator.close();
        return allResults;
    }

    public async getImplicitPrivateData(ctx: Context, key: string) {
        const implicitPrivateCollection = getImplicitPrivateCollection(ctx);
        return (await ctx.stub.getPrivateData(implicitPrivateCollection, key)).toString();
    }

    // savePrivateData saves a private data to the given collection
    public async savePrivateData(ctx: Context, collection: string, id: string, data: Uint8Array) {
        await ctx.stub.putPrivateData(collection, id, data);
    }

    // SaveImplicitPrivateData saves a private data to the implicit private collection
    public async saveImplicitPrivateData(ctx: Context, id: string, data: Uint8Array) {
        const implicitPrivateCollection = getImplicitPrivateCollection(ctx);
        await this.savePrivateData(ctx, implicitPrivateCollection, id, data);
    }
}
