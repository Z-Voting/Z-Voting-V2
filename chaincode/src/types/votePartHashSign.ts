import {Object, Property} from 'fabric-contract-api';

@Object()
export class VotePartHashSign {

    @Property()
    public VotePartNumber: number;

    @Property()
    public VotePartHash: string;

    @Property()
    public Signature: string;

    constructor(votePartNumber: number, votePartHash: string, Signature: string) {
        this.VotePartNumber = votePartNumber;
        this.VotePartHash = votePartHash;
        this.Signature = Signature;
    }
}
