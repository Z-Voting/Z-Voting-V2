import crypto from 'crypto';
import NodeRSA from 'node-rsa';

export class VotePartDataFromJudge {

    public CandidateUniqueId: string;

    public VoteRandomId: string;

    public VotePartNumber: number;

    public Data: number[];

    public DataHash: string;

    public DataHashSign?: string;

    constructor(CandidateUniqueId: string, VoteUUID: string, VotePartNumber: number, Data: number[], DataHashSign?: string, privateKey?: NodeRSA) {
        this.CandidateUniqueId = CandidateUniqueId;
        this.Data = Data;
        this.VotePartNumber = VotePartNumber;
        this.VoteRandomId = VoteUUID;

        this.DataHash = this.generateHash();

        if (DataHashSign) {
            this.DataHashSign = DataHashSign;
        }

        if (privateKey) {
            this.DataHashSign = this.signHash(privateKey);
        }
    }

    public generateHash() {
        const dataConcat = [this.VoteRandomId, this.VotePartNumber.toString(), JSON.stringify(this.Data)].join('~');

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
        return key.sign(this.generateHash(), 'base64');
    }

    public verifySign(key: NodeRSA) {
        if (this.DataHashSign === undefined) {
            return false;
        }

        if (!key.verify(this.DataHash, this.DataHashSign, undefined, 'base64')) {
            throw new Error(`Signature Verification failed`);
        }
    }

    public verify(key: NodeRSA) {
        this.verifyHash();
        this.verifySign(key);
    }
}
