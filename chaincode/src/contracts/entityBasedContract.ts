import {Context, Contract, Returns, Transaction} from 'fabric-contract-api';
import {KeyEndorsementPolicy} from 'fabric-shim';
import {getImplicitPrivateCollection} from '../helper/contractHelper';
import {EntityBasedContractHelper} from '../helper/entityBasedContractHelper';

export class EntityBasedContract extends Contract {

    protected entityHelper: EntityBasedContractHelper;

    constructor(name: string) {
        super(name);
        this.entityHelper = new EntityBasedContractHelper();
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

            await this.entityHelper.saveImplicitPrivateData(ctx, key, data!);
        }
    }

    @Transaction(false)
    public async GetImplicitPrivateData(ctx: Context, key: string) {
        if (ctx.clientIdentity.getMSPID() !== ctx.stub.getMspID()) {
            throw new Error('The users does not belong to this organization');
        }

        return this.entityHelper.getImplicitPrivateData(ctx, key);
    }

    // ReadEntity returns the entity stored in the world state with given id.
    @Transaction(false)
    @Returns('string')
    public async ReadEntity(ctx: Context, id: string): Promise<string> {
        return this.entityHelper.readEntity(ctx, id);
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
        return this.entityHelper.entityExists(ctx, id);
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
}
