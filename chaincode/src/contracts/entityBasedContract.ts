import {Context, Contract, Returns, Transaction} from 'fabric-contract-api';
import { KeyEndorsementPolicy } from 'fabric-shim';
import {Iterators} from 'fabric-shim-api';
import {Entity} from '../types/entity';

export class EntityBasedContract extends Contract {

    public getImplicitPrivateCollection(ctx: Context) {
        return '_implicit_org_' + ctx.stub.getMspID();
    }

    @Transaction()
    public async GetPrivateEndorsementRight(ctx: Context, key: string) {
        const implicitPrivateCollection = '_implicit_org_' + ctx.clientIdentity.getMSPID();

        const ep = new KeyEndorsementPolicy();
        ep.addOrgs('PEER', ctx.clientIdentity.getMSPID());

        await ctx.stub.setPrivateDataValidationParameter(implicitPrivateCollection, key, ep.getPolicy());
    }

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
        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        const firstRecord = await resultsIterator.next();

        return !firstRecord.done;
    }

    // GetQueryResultForQueryString executes the passed in query string.
    // Result set is built and returned as a byte array containing the JSON results.
    public async GetQueryResultForQueryString(ctx: Context, queryString: string) {

        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        const results = await this.GetAllQueryResults(resultsIterator);

        return JSON.stringify(results);
    }

    // GetAssetHistory returns the chain of custody for an asset since issuance.
    public async GetHistory(ctx: Context, ID: string) {

        const resultsIterator = await ctx.stub.getHistoryForKey(ID);
        const results = await this.GetAllHistoryResults(resultsIterator);

        return JSON.stringify(results);
    }

    public async GetAllQueryResults(iterator: Iterators.StateQueryIterator) {
        const allResults = [];
        let res = await iterator.next();
        while (!res.done) {
            if (res.value && res.value.value.toString()) {
                const jsonRes: any = {};
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

    // savePrivateData saves a private data to the given collection
    protected async savePrivateData(ctx: Context, collection: string, id: string, data: string) {

        console.log('/-----------------------------------');
        console.log(collection);
        console.log(id);
        console.log((await ctx.stub.getPrivateDataValidationParameter(collection, id)));
        // console.log(data);
        console.log('/-----------------------------------');

        await ctx.stub.putPrivateData(collection, id, Buffer.from(data));
    }

    // savePrivateData saves a private data to the given collection
    protected async saveImplicitPrivateData(ctx: Context, id: string, data: string) {
        const implicitPrivateCollection = this.getImplicitPrivateCollection(ctx);

        const ep = new KeyEndorsementPolicy();
        ep.addOrgs('MEMBER', ctx.stub.getMspID());

        console.log('----^^^^-----');
        console.log(ep.listOrgs());
        console.log(ep.getPolicy().toString());
        console.log('----^^^^-----');
        await ctx.stub.setPrivateDataValidationParameter(implicitPrivateCollection, id, ep.getPolicy());

        await this.savePrivateData(ctx, implicitPrivateCollection, id, data);
    }
}
