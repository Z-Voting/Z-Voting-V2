import {Object, Property} from 'fabric-contract-api';
import NodeRSA from 'node-rsa';

@Object()
export class PartialElectionResult {

    @Property()
    public ElectionId: string;

    @Property()
    public JudgeOrg: string;

    @Property()
    public VotePartNumber: number;

    @Property('Data', 'number[]')
    public Data: number[];

    @Property()
    public JudgeSign?: string;

    constructor(ElectionId: string, JudgeOrg: string, VotePartNumber: number, Data: number[], JudgeSign?: string, privateKey?: NodeRSA) {
        this.VotePartNumber = VotePartNumber;
        this.Data = Data;
        this.JudgeOrg = JudgeOrg;
        this.ElectionId = ElectionId;

        if (JudgeSign) {
            this.JudgeSign = JudgeSign;
        }

        if (privateKey) {
            this.JudgeSign = this.signResult(privateKey);
        }
    }

    public signResult(privateKey: NodeRSA) {
        const dataToSign = [this.JudgeOrg, this.VotePartNumber, this.Data].join('~');
        return privateKey.sign(dataToSign, 'base64');
    }

    public verifySignature(publicKey: NodeRSA) {
        if (this.JudgeSign === undefined) {
            return false;
        }

        const dataToVerify = [this.JudgeOrg, this.VotePartNumber, this.Data].join('~');
        return publicKey.verify(dataToVerify, this.JudgeSign, undefined, 'base64');
    }
}
