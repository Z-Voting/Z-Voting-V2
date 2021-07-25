import {Context} from 'fabric-contract-api';

export class EntityBasedContractHelper {

    public async readEntity(ctx: Context, id: string) {
        const entityJSON = await ctx.stub.getState(id);

        if (!entityJSON || entityJSON.length === 0) {
            throw new Error(`The entity with id: ${id} does not exist`);
        }
        return entityJSON.toString();
    }
}
