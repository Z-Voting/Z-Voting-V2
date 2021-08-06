import crypto from 'crypto';
import NodeRSA from 'node-rsa';

export class VotePart {

    public CandidateUniqueId: string;

    public VoteUUID: string;

    public VotePartNumber: number;

    public Data: number[];

    public DataHash: string;

    public DataHashSign: string;

    constructor(VoteUUID: string, VotePartNumber: number, Data: number[]) {
        this.Data = Data;
        this.VotePartNumber = VotePartNumber;
        this.VoteUUID = VoteUUID;

        this.DataHash = this.generateHash();
    }

    public generateHash() {
        const dataConcat = [this.VoteUUID, this.VotePartNumber.toString(), JSON.stringify(this.Data)].join('~');

        const hash = crypto.createHash('sha256');
        hash.update(dataConcat);

        return hash.digest('base64');
    }

    public verifyHash() {
        if (this.generateHash() !== this.DataHash) {
            throw new Error(`Hash Verification failed`);
        }
    }

    public signHash(key: NodeRSA) {
        this.DataHashSign = key.sign(this.generateHash(), 'base64');
    }

    public verifySign(key: NodeRSA) {
        if (!key.verify(this.DataHash, this.DataHashSign, undefined, 'base64')) {
            throw new Error(`Signature Verification failed`);
        }
    }

    public verify(key: NodeRSA) {
        this.verifyHash();
        this.verifySign(key);
    }
}
