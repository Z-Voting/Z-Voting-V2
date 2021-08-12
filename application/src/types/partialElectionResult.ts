import NodeRSA from 'node-rsa';

export class PartialElectionResult {

    public ElectionId: string;

    public JudgeOrg: string;

    public VotePartNumber: number;

    public Data: number[];

    public JudgeSign?: string;

    constructor(ElectionId: string, JudgeOrg: string, VotePartNumber: number, Data: number[], JudgeSign?: string, privateKey?: NodeRSA) {
        this.VotePartNumber = VotePartNumber;
        this.Data = Data;
        this.ElectionId = ElectionId;
        this.JudgeOrg = JudgeOrg;

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
