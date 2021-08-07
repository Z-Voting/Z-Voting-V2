import crypto from 'crypto';
import {Object, Property} from 'fabric-contract-api';
import NodeRSA from 'node-rsa';

@Object()
export class VotePart {

    @Property()
    public VoteRandomId: string;

    @Property()
    public VotePartNumber: number;

    @Property('Data', 'number[]')
    public Data: number[];

    constructor(VoteRandomId: string, VotePartNumber: number, Data: number[]) {
        this.Data = Data;
        this.VotePartNumber = VotePartNumber;
        this.VoteRandomId = VoteRandomId;
    }

    public generateHash() {
        const dataConcat = [this.VoteRandomId, this.VotePartNumber.toString(), JSON.stringify(this.Data)].join('~');

        const hash = crypto.createHash('sha256');
        hash.update(dataConcat);

        return hash.digest('base64');
    }

    public verifyHash(dataHash: string) {
        if (this.generateHash() !== dataHash) {
            throw new Error(`Hash Verification failed`);
        }
    }

    public verifySign(key: NodeRSA, dataHashSign: string) {
        if (!key.verify(this.generateHash(), dataHashSign, undefined, 'base64')) {
            throw new Error(`Signature Verification failed`);
        }
    }

    public verify(key: NodeRSA, dataHash: string, dataHashSign: string) {
        this.verifyHash(dataHash);
        this.verifySign(key, dataHashSign);
    }
}
