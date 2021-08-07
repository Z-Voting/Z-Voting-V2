import {Object, Property} from 'fabric-contract-api';

@Object()
export class VotePartHashSign {

    @Property()
    public VotePartNumber: number;

    @Property()
    public VotePartHash: string;

    @Property()
    public VotePartHashSign: string;

    constructor(votePartNumber: number, votePartHash: string, votePartHashSign: string) {
        this.VotePartNumber = votePartNumber;
        this.VotePartHash = votePartHash;
        this.VotePartHashSign = votePartHashSign;
    }
}
