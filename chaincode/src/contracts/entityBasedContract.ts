import {Context, Contract, Returns, Transaction} from "fabric-contract-api";
import {Entity} from "../types/entity";
import {Iterators} from "fabric-shim-api";

export class EntityBasedContract extends Contract {

    // ReadEntity returns the entity stored in the world state with given id.
    @Transaction(false)
    @Returns('string')
    public async ReadEntity(ctx: Context, id: string): Promise<string> {
        const entityJSON = await ctx.stub.getState(id); // get the entity from chaincode state
        if (!entityJSON || entityJSON.length === 0) {
            throw new Error(`The entity with id: ${id} does not exist`);
        }
        return entityJSON.toString();
    }

    // SaveEntity saves a new entity in the world state
    public async SaveEntity(ctx: Context, entity: Entity): Promise<void> {
        const id = entity.ID;

        const exists = await this.EntityExists(ctx, id);
        if (exists) {
            throw new Error(`The entity with id: ${id} already exists`);
        }

        return ctx.stub.putState(id, Buffer.from(JSON.stringify(entity)));
    }

    // UpdateEntity updates an existing entity in the world state with updated value.
    public async UpdateEntity(ctx: Context, entity: Entity): Promise<void> {
        const id = entity.ID;

        const exists = await this.EntityExists(ctx, id);
        if (!exists) {
            throw new Error(`The entity with id: ${id} does not exist`);
        }

        return ctx.stub.putState(id, Buffer.from(JSON.stringify(entity)));
    }

    // SaveOrUpdateEntity saves or updates an entity in the world state
    public async SaveOrUpdateEntity(ctx: Context, entity: Entity): Promise<void> {
        const id = entity.ID;
        return ctx.stub.putState(id, Buffer.from(JSON.stringify(entity)));
    }

    // DeleteEntity deletes an existing entity from the world state.
    @Transaction()
    public async DeleteEntity(ctx: Context, id: string): Promise<void> {
        const exists = await this.EntityExists(ctx, id);
        if (!exists) {
            throw new Error(`The entity with id: ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }

    // EntityExists returns true when entity with given ID exists in world state.
    @Transaction(false)
    @Returns('boolean')
    public async EntityExists(ctx: Context, id: string): Promise<boolean> {
        const entityJSON = await ctx.stub.getState(id);
        return entityJSON && entityJSON.length > 0;
    }

    // GetAllEntities returns all entities found in the world state.
    @Transaction(false)
    @Returns('string')
    public async GetAllEntities(ctx: Context): Promise<string> {
        const allResults: any[] = [];
        // range query with empty string for startKey and endKey does an open-ended query of all entities in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({Key: result.value.key, Record: record});
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

    public async QueryLedger(ctx: Context, queryString: string) {
        return await this.GetQueryResultForQueryString(ctx, queryString);
    }

    public async QueryResultExists(ctx: Context, queryString: string) {
        let resultsIterator = await ctx.stub.getQueryResult(queryString);
        let firstRecord = await resultsIterator.next();

        return !firstRecord.done;
    }

    // GetQueryResultForQueryString executes the passed in query string.
    // Result set is built and returned as a byte array containing the JSON results.
    async GetQueryResultForQueryString(ctx: Context, queryString: string) {

        let resultsIterator = await ctx.stub.getQueryResult(queryString);
        let results = await this.GetAllQueryResults(resultsIterator);

        return JSON.stringify(results);
    }

    // GetAssetHistory returns the chain of custody for an asset since issuance.
    async GetHistory(ctx: Context, ID: string) {

        let resultsIterator = await ctx.stub.getHistoryForKey(ID);
        let results = await this.GetAllHistoryResults(resultsIterator);

        return JSON.stringify(results);
    }

    public async GetAllQueryResults(iterator: Iterators.StateQueryIterator) {
        let allResults = [];
        let res = await iterator.next();
        while (!res.done) {
            if (res.value && res.value.value.toString()) {
                let jsonRes: any = {};
                console.log(res.value.value.toString());

                jsonRes.Key = res.value.key;
                try {
                    jsonRes.Record = JSON.parse(res.value.value.toString());
                } catch (err) {
                    console.log(err);
                    jsonRes.Record = res.value.value.toString();
                }

                allResults.push(jsonRes);
            }
            res = await iterator.next();
        }
        await iterator.close();
        return allResults;
    }

    public async GetAllHistoryResults(iterator: Iterators.HistoryQueryIterator) {
        let allResults = [];
        let res = await iterator.next();
        while (!res.done) {
            if (res.value && res.value.value.toString()) {
                let jsonRes: any = {};
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
}
