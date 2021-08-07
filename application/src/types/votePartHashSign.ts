export class VotePartHashSign {

    public VotePartNumber: number;

    public VotePartHash: string;

    public VotePartHashSign: string;


    constructor(VotePartNumber: number, VotePartHash: string, VotePartHashSign: string) {
        this.VotePartNumber = VotePartNumber;
        this.VotePartHash = VotePartHash;
        this.VotePartHashSign = VotePartHashSign;
    }
}
