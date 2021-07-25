import {Context, Contract, Returns, Transaction} from 'fabric-contract-api';
import {KeyEndorsementPolicy} from 'fabric-shim';
import {Iterators} from 'fabric-shim-api';
import {getImplicitPrivateCollection} from '../helper/contractHelper';
import {EntityBasedContractHelper} from '../helper/entityBasedContractHelper';
import {IEntity} from '../types/IEntity';

export class EntityBasedContract extends Contract {

    private helper: EntityBasedContractHelper;

    constructor(name: string) {
        super(name);
        this.helper = new EntityBasedContractHelper();
    }

    // TODO: ADD ACCESS CHECKING LATER
    @Transaction()
    public async AcquirePrivateEndorsementRight(ctx: Context, key: string) {
        const implicitPrivateCollection = '_implicit_org_' + ctx.clientIdentity.getMSPID();

        const ep = new KeyEndorsementPolicy();
        ep.addOrgs('PEER', ctx.clientIdentity.getMSPID());

        await ctx.stub.setPrivateDataValidationParameter(implicitPrivateCollection, key, ep.getPolicy());
    }

    // TODO: ADD ACCESS CHECKING LATER
    @Transaction()
    public async AcquireStateEndorsementRight(ctx: Context, key: string) {
        const ep = new KeyEndorsementPolicy();
        ep.addOrgs('PEER', ctx.clientIdentity.getMSPID());

        await ctx.stub.setStateValidationParameter(key, ep.getPolicy());
    }

    @Transaction()
    public async SaveImplicitPrivateData(ctx: Context, key: string) {
        if (ctx.clientIdentity.getMSPID() === ctx.stub.getMspID()) {
            const data = ctx.stub.getTransient().get('data');

            if (data === undefined) {
                throw new Error(`Transient Data not given`);
            }

            await this.saveImplicitPrivateData(ctx, key, data!);
        }
    }

    @Transaction(false)
    public async GetImplicitPrivateData(ctx: Context, key: string) {
        if (ctx.clientIdentity.getMSPID() !== ctx.stub.getMspID()) {
            throw new Error('The users does not belong to this organization');
        }

        const implicitPrivateCollection = getImplicitPrivateCollection(ctx);
        return (await ctx.stub.getPrivateData(implicitPrivateCollection, key)).toString();
    }

    // ReadEntity returns the entity stored in the world state with given id.
    @Transaction(false)
    @Returns('string')
    public async ReadEntity(ctx: Context, id: string): Promise<string> {
        return this.helper.readEntity(ctx, id);
    }

    // SaveEntity saves a new entity in the world state
    public async SaveEntity(ctx: Context, entity: IEntity): Promise<void> {
        const id = entity.ID;

        // const exists = await this.EntityExists(ctx, id);
        // if (exists) {
        //     throw new Error(`The entity with id: ${id} already exists`);
        // }

        return ctx.stub.putState(id, Buffer.from(JSON.stringify(entity)));
    }

    // UpdateEntity updates an existing entity in the world state with updated value.
    public async UpdateEntity(ctx: Context, entity: IEntity): Promise<void> {
        const id = entity.ID;

        const exists = await this.EntityExists(ctx, id);
        if (!exists) {
            throw new Error(`The entity with id: ${id} does not exist`);
        }

        return ctx.stub.putState(id, Buffer.from(JSON.stringify(entity)));
    }

    // SaveOrUpdateEntity saves or updates an entity in the world state
    public async SaveOrUpdateEntity(ctx: Context, entity: IEntity): Promise<void> {
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

    public async QueryLedger(ctx: Context, queryString: string, wideOutput: boolean = false) {
        return await this.GetQueryResultForQueryString(ctx, queryString, wideOutput);
    }

    public async QueryResultExists(ctx: Context, queryString: string) {
        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        const firstRecord = await resultsIterator.next();

        return !firstRecord.done;
    }

    // GetQueryResultForQueryString executes the passed in query string.
    // Result set is built and returned as a byte array containing the JSON results.
    public async GetQueryResultForQueryString(ctx: Context, queryString: string, wideOutput: boolean = false) {

        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        const results = await this.GetAllQueryResults(resultsIterator, wideOutput);

        return JSON.stringify(results);
    }

    // GetAssetHistory returns the chain of custody for an asset since issuance.
    public async GetHistory(ctx: Context, ID: string) {

        const resultsIterator = await ctx.stub.getHistoryForKey(ID);
        const results = await this.GetAllHistoryResults(resultsIterator);

        return JSON.stringify(results);
    }

    public async GetAllQueryResults(iterator: Iterators.StateQueryIterator, wideOutput: boolean = false) {
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
    protected async savePrivateData(ctx: Context, collection: string, id: string, data: Uint8Array) {
        await ctx.stub.putPrivateData(collection, id, data);
    }

    // SaveImplicitPrivateData saves a private data to the implicit private collection
    protected async saveImplicitPrivateData(ctx: Context, id: string, data: Uint8Array) {
        const implicitPrivateCollection = getImplicitPrivateCollection(ctx);
        await this.savePrivateData(ctx, implicitPrivateCollection, id, data);
    }
}
