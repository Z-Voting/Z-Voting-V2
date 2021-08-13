export class VotePartHashSign {

    public VotePartNumber: number;

    public VotePartHash: string;

    public Signature: string;

    constructor(VotePartNumber: number, VotePartHash: string, Signature: string) {
        this.VotePartNumber = VotePartNumber;
        this.VotePartHash = VotePartHash;
        this.Signature = Signature;
    }
}
