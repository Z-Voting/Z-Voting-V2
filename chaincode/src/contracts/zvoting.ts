import {Context, Info, Returns, Transaction} from 'fabric-contract-api';
import {EntityBasedContract} from "./entityBasedContract";
import {Election, ElectionStatus} from "../types/election";
import {extractSubmittingUserOrg, extractSubmittingUserUID} from "../helper/contractHelper";
import {Candidate} from "../types/candidate";

@Info({title: 'Z-Voting V2', description: 'Smart contract for Z-Voting V2'})
export class ZVotingContract extends EntityBasedContract {

    // CreateElection creates a new election
    @Transaction()
    public async CreateElection(ctx: Context, electionId: string, name: string): Promise<void> {
        this.checkCreateElectionAccess(ctx);

        const ownerId = extractSubmittingUserUID(ctx);
        const ownerOrg = extractSubmittingUserOrg(ctx);
        const election = new Election(electionId, name, ElectionStatus.PENDING, ownerId, ownerOrg);

        await this.SaveEntity(ctx, election);
    }

    // AddCandidate adds a candidate to the election
    @Transaction()
    public async AddCandidate(ctx: Context, candidateId: string, name: string, uniqueId: string, electionId: string): Promise<void> {
        const electionJSON = await this.ReadAsset(ctx, electionId);
        const election: Election = JSON.parse(electionJSON);

        await this.checkAddCandidateAccess(ctx, election, uniqueId);

        const candidate = new Candidate(candidateId, name, uniqueId, electionId);
        await this.SaveEntity(ctx, candidate);

        //TODO: If we have enough judges and enough Candidates, change status to ready
        election.Status = ElectionStatus.READY;
        await this.UpdateEntity(ctx, election);
    }

    @Transaction(false)
    @Returns('boolean')
    private async duplicateCandidateExists(ctx: Context, uniqueId: string, electionId: string) {
        let query: any = {};
        query.selector = {};
        query.selector.DocType = 'candidate';
        query.selector.UniqueId = uniqueId;
        query.selector.ElectionId = electionId;

        return await this.QueryResultExists(ctx, JSON.stringify(query));
    }

    // StartElection starts an election if it is ready
    @Transaction()
    public async StartElection(ctx: Context, electionId: string): Promise<void> {
        const electionJSON = await this.ReadEntity(ctx, electionId);
        const election: Election = JSON.parse(electionJSON);

        this.checkStartElectionAccess(ctx, election);

        election.Status = ElectionStatus.RUNNING;
        await this.UpdateEntity(ctx, election);
    }

// CreateAsset issues a new asset to the world state with given details.
    @Transaction()
    public async CreateAsset(ctx: Context, id: string, color: string, size: number, owner: string, appraisedValue: number): Promise<void> {
        const asset = {
            ID: id,
            Color: color,
            Size: size,
            Owner: owner,
            AppraisedValue: appraisedValue,
        };
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
    }

    // ReadAsset returns the asset stored in the world state with given id.
    @Transaction(false)
    public async ReadAsset(ctx: Context, id: string): Promise<string> {
        const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    // UpdateAsset updates an existing asset in the world state with provided parameters.
    @Transaction()
    public async UpdateAsset(ctx: Context, id: string, color: string, size: number, owner: string, appraisedValue: number): Promise<void> {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

        // overwriting original asset with new asset
        const updatedAsset = {
            ID: id,
            Color: color,
            Size: size,
            Owner: owner,
            AppraisedValue: appraisedValue,
        };
        return ctx.stub.putState(id, Buffer.from(JSON.stringify(updatedAsset)));
    }

    // DeleteAsset deletes an given asset from the world state.
    @Transaction()
    public async DeleteAsset(ctx: Context, id: string): Promise<void> {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }

    // AssetExists returns true when asset with given ID exists in world state.
    @Transaction(false)
    @Returns('boolean')
    public async AssetExists(ctx: Context, id: string): Promise<boolean> {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    // TransferAsset updates the owner field of asset with given id in the world state.
    @Transaction()
    public async TransferAsset(ctx: Context, id: string, newOwner: string): Promise<void> {
        const assetString = await this.ReadAsset(ctx, id);
        const asset = JSON.parse(assetString);
        asset.Owner = newOwner;
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
    }

    // GetAllAssets returns all assets found in the world state.
    @Transaction(false)
    @Returns('string')
    public async GetAllAssets(ctx: Context): Promise<string> {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
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

    private async checkAddCandidateAccess(ctx: Context, election: Election, uniqueId: string) {
        const submittingUserUID = extractSubmittingUserUID(ctx);
        if (election.Owner != submittingUserUID) {
            throw new Error(`Only the election owner can add a candidate`);
        }

        if (election.Status == ElectionStatus.RUNNING || election.Status == ElectionStatus.OVER) {
            throw new Error(`The election with id: ${election.ID} is not accepting any more candidates`);
        }

        const duplicateCandidateExists = await this.duplicateCandidateExists(ctx, uniqueId, election.ID);
        if (duplicateCandidateExists) {
            throw new Error(`Another candidate with UniqueID: ${uniqueId} already exists for this election`);
        }
    }

    private checkCreateElectionAccess(ctx: Context) {

    }

    private checkStartElectionAccess(ctx: Context, election: Election) {
        const submittingUserUID = extractSubmittingUserUID(ctx);
        if (election.Owner != submittingUserUID) {
            throw new Error(`Only the election owner can start an election`);
        }

        if (election.Status != ElectionStatus.READY) {
            throw new Error(`The election with id: ${election.ID} must be in READY state to start, current state is ${election.Status}`);
        }
    }
}
